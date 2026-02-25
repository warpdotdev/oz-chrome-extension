declare const chrome: any;

type RunPhase = 'IDLE' | 'RUNNING' | 'IMPORTING' | 'COMPLETED' | 'FAILED';
type RunState = 'QUEUED' | 'PENDING' | 'CLAIMED' | 'INPROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

interface ScriptRunStatus {
  phase: RunPhase;
  runId?: string;
  runState?: RunState;
  statusMessage?: string;
  sessionLink?: string;
  prUrl?: string;
  scriptId?: string;
  error?: string;
  updatedAt: string;
}

const setupCard = byId<HTMLElement>('setup-card');
const runCard = byId<HTMLElement>('run-card');
const statusCard = byId<HTMLElement>('status-card');
const apiKeyInput = byId<HTMLInputElement>('api-key-input');
const saveApiKeyButton = byId<HTMLButtonElement>('save-api-key-btn');
const setupError = byId<HTMLElement>('setup-error');
const setupSuccess = byId<HTMLElement>('setup-success');
const environmentIdInput = byId<HTMLInputElement>('environment-id-input');
const promptInput = byId<HTMLTextAreaElement>('prompt-input');
const runButton = byId<HTMLButtonElement>('run-btn');
const runError = byId<HTMLElement>('run-error');
const statusPhase = byId<HTMLElement>('status-phase');
const statusState = byId<HTMLElement>('status-state');
const statusMessage = byId<HTMLElement>('status-message');
const statusSessionRow = byId<HTMLElement>('status-session-row');
const statusSessionLink = byId<HTMLAnchorElement>('status-session-link');
const statusPrRow = byId<HTMLElement>('status-pr-row');
const statusPrLink = byId<HTMLAnchorElement>('status-pr-link');
const statusScriptRow = byId<HTMLElement>('status-script-row');
const statusScriptId = byId<HTMLElement>('status-script-id');
const statusError = byId<HTMLElement>('status-error');

let pollTimer: number | null = null;

async function init(): Promise<void> {
  wireHandlers();
  const keyStatus = await sendMessage<{ hasApiKey: boolean }>({ type: 'GET_API_KEY_STATUS' });
  renderHasApiKey(keyStatus.hasApiKey);
  if (keyStatus.hasApiKey) {
    await refreshStatus();
    startPolling();
  }
}

function wireHandlers(): void {
  saveApiKeyButton.addEventListener('click', async () => {
    hide(setupError);
    hide(setupSuccess);
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError(setupError, 'API key is required.');
      return;
    }
    try {
      await sendMessage<{ hasApiKey: boolean }>({ type: 'SET_API_KEY', apiKey });
      apiKeyInput.value = '';
      showSuccess(setupSuccess, 'API key saved.');
      renderHasApiKey(true);
      await refreshStatus();
      startPolling();
    } catch (error) {
      showError(setupError, toErrorMessage(error));
    }
  });

  runButton.addEventListener('click', async () => {
    hide(runError);
    const prompt = promptInput.value.trim();
    if (!prompt) {
      showError(runError, 'Prompt is required.');
      return;
    }
    try {
      runButton.disabled = true;
      const environmentId = environmentIdInput.value.trim();
      const status = await sendMessage<ScriptRunStatus>({
        type: 'START_SCRIPT_RUN',
        prompt,
        environmentId: environmentId || undefined,
      });
      renderStatus(status);
      startPolling();
    } catch (error) {
      showError(runError, toErrorMessage(error));
    } finally {
      runButton.disabled = false;
    }
  });
}

function renderHasApiKey(hasApiKey: boolean): void {
  setupCard.classList.toggle('hidden', hasApiKey);
  runCard.classList.toggle('hidden', !hasApiKey);
  statusCard.classList.toggle('hidden', !hasApiKey);
}

function renderStatus(status: ScriptRunStatus): void {
  statusPhase.textContent = status.phase;
  statusState.textContent = status.runState ?? '-';
  statusMessage.textContent = status.statusMessage ?? '-';

  if (status.sessionLink) {
    statusSessionLink.href = status.sessionLink;
    statusSessionLink.textContent = status.sessionLink;
    show(statusSessionRow);
  } else {
    hide(statusSessionRow);
  }

  if (status.prUrl) {
    statusPrLink.href = status.prUrl;
    statusPrLink.textContent = status.prUrl;
    show(statusPrRow);
  } else {
    hide(statusPrRow);
  }

  if (status.scriptId) {
    statusScriptId.textContent = status.scriptId;
    show(statusScriptRow);
  } else {
    hide(statusScriptRow);
  }

  if (status.error) {
    showError(statusError, status.error);
  } else {
    hide(statusError);
  }
}

function startPolling(): void {
  if (pollTimer !== null) {
    return;
  }
  pollTimer = window.setInterval(() => {
    refreshStatus().catch(() => undefined);
  }, 2000);
}

function stopPolling(): void {
  if (pollTimer === null) {
    return;
  }
  window.clearInterval(pollTimer);
  pollTimer = null;
}

async function refreshStatus(): Promise<void> {
  const status = await sendMessage<ScriptRunStatus>({ type: 'GET_SCRIPT_RUN_STATUS' });
  renderStatus(status);
  if (status.phase === 'COMPLETED' || status.phase === 'FAILED') {
    stopPolling();
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required popup element: ${id}`);
  }
  return element as T;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function show(element: HTMLElement): void {
  element.classList.remove('hidden');
}

function hide(element: HTMLElement): void {
  element.classList.add('hidden');
}

function showError(element: HTMLElement, message: string): void {
  element.textContent = message;
  show(element);
}

function showSuccess(element: HTMLElement, message: string): void {
  element.textContent = message;
  show(element);
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: { ok: boolean; result?: T; error?: string } | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('No response from extension service worker.'));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error || 'Unknown extension error.'));
        return;
      }
      resolve(response.result as T);
    });
  });
}

init().catch((error) => {
  showError(statusError, toErrorMessage(error));
  renderHasApiKey(false);
});
