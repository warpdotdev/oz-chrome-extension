import { OzApiClient } from '@oz-chrome-extension/oz-client';
import { toStoredCustomization, toUserScriptRegistration, validateManifest } from '@oz-chrome-extension/oz-runtime';
import type { StoredCustomization } from '@oz-chrome-extension/shared';

declare const chrome: any;

const API_KEY_STORAGE_KEY = 'oz.apiKey';
const CUSTOMIZATIONS_STORAGE_KEY = 'oz.customizations';
const RUN_STATUS_STORAGE_KEY = 'oz.runStatus';
const COORDINATION_REPO_POLICY = {
  allowedOwner: 'warpdotdev',
  allowedRepo: 'oz-chrome-extension',
} as const;

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
  prompt?: string;
  updatedAt: string;
}

type StartScriptRunMessage = {
  type: 'START_SCRIPT_RUN';
  prompt: string;
  environmentId?: string;
};

type GetScriptRunStatusMessage = {
  type: 'GET_SCRIPT_RUN_STATUS';
};

type GetApiKeyStatusMessage = {
  type: 'GET_API_KEY_STATUS';
};

type SetApiKeyMessage = {
  type: 'SET_API_KEY';
  apiKey: string;
};

type EnableScriptMessage = {
  type: 'SET_SCRIPT_ENABLED';
  id: string;
  enabled: boolean;
};

type RuntimeMessage =
  | StartScriptRunMessage
  | GetScriptRunStatusMessage
  | GetApiKeyStatusMessage
  | SetApiKeyMessage
  | EnableScriptMessage;

function nowIso(): string {
  return new Date().toISOString();
}

function createIdleRunStatus(): ScriptRunStatus {
  return {
    phase: 'IDLE',
    updatedAt: nowIso(),
  };
}

function isTerminalPhase(phase: RunPhase): boolean {
  return phase === 'COMPLETED' || phase === 'FAILED' || phase === 'IDLE';
}

async function getApiKey(): Promise<string> {
  const data = await chrome.storage.local.get([API_KEY_STORAGE_KEY]);
  const key = data[API_KEY_STORAGE_KEY];
  if (!key) {
    throw new Error('Missing Oz API key. Set it in popup setup.');
  }
  return key;
}

async function hasApiKey(): Promise<boolean> {
  const data = await chrome.storage.local.get([API_KEY_STORAGE_KEY]);
  return typeof data[API_KEY_STORAGE_KEY] === 'string' && data[API_KEY_STORAGE_KEY].trim().length > 0;
}

async function setApiKey(apiKey: string): Promise<void> {
  const normalized = apiKey.trim();
  if (!normalized) {
    throw new Error('API key is required.');
  }
  await chrome.storage.local.set({
    [API_KEY_STORAGE_KEY]: normalized,
  });
}

async function getCustomizationMap(): Promise<Record<string, StoredCustomization>> {
  const data = await chrome.storage.local.get([CUSTOMIZATIONS_STORAGE_KEY]);
  return (data[CUSTOMIZATIONS_STORAGE_KEY] as Record<string, StoredCustomization> | undefined) ?? {};
}

async function setCustomizationMap(customizationMap: Record<string, StoredCustomization>): Promise<void> {
  await chrome.storage.local.set({
    [CUSTOMIZATIONS_STORAGE_KEY]: customizationMap,
  });
}

async function getRunStatus(): Promise<ScriptRunStatus> {
  const data = await chrome.storage.local.get([RUN_STATUS_STORAGE_KEY]);
  return (data[RUN_STATUS_STORAGE_KEY] as ScriptRunStatus | undefined) ?? createIdleRunStatus();
}

async function setRunStatus(status: ScriptRunStatus): Promise<void> {
  await chrome.storage.local.set({
    [RUN_STATUS_STORAGE_KEY]: {
      ...status,
      updatedAt: nowIso(),
    },
  });
}

async function syncUserScriptsRegistrations(): Promise<void> {
  if (!chrome.userScripts?.register || !chrome.userScripts?.unregister) {
    throw new Error('chrome.userScripts API is unavailable in this browser context');
  }
  const customizationMap = await getCustomizationMap();
  const registrations = Object.values(customizationMap)
    .filter((customization) => customization.enabled)
    .map((customization) => {
      const registration = toUserScriptRegistration(customization);
      return {
        id: registration.id,
        matches: registration.matches,
        js: [{ code: registration.js }],
      };
    });

  await chrome.userScripts.unregister();
  if (registrations.length > 0) {
    await chrome.userScripts.register(registrations);
  }
}

async function setScriptEnabled(message: EnableScriptMessage): Promise<{ id: string; enabled: boolean }> {
  const customizationMap = await getCustomizationMap();
  const customization = customizationMap[message.id];
  if (!customization) {
    throw new Error(`Unknown script id: ${message.id}`);
  }
  customizationMap[message.id] = {
    ...customization,
    enabled: message.enabled,
    updatedAt: nowIso(),
  };
  await setCustomizationMap(customizationMap);
  await syncUserScriptsRegistrations();
  return {
    id: message.id,
    enabled: message.enabled,
  };
}

async function startScriptRun(message: StartScriptRunMessage): Promise<ScriptRunStatus> {
  const prompt = message.prompt.trim();
  if (!prompt) {
    throw new Error('Prompt is required.');
  }

  const currentStatus = await getRunStatus();
  if (!isTerminalPhase(currentStatus.phase) && currentStatus.runId) {
    throw new Error('A script run is already in progress.');
  }

  const apiKey = await getApiKey();
  const client = new OzApiClient(apiKey);
  const run = await client.runAgent({
    prompt,
    config: {
      environment_id: message.environmentId,
      skill_spec: 'warpdotdev/oz-chrome-extension:.agents/skills/oz_extension/SKILL.md',
      name: 'oz-chrome-extension-create-script',
    },
    title: 'Generate site customization script',
  });

  const runStatus: ScriptRunStatus = {
    phase: 'RUNNING',
    runId: run.run_id,
    runState: run.state,
    statusMessage: 'Run created.',
    prompt,
    updatedAt: nowIso(),
  };
  await setRunStatus(runStatus);
  return runStatus;
}

async function pollScriptRunStatus(): Promise<ScriptRunStatus> {
  const currentStatus = await getRunStatus();
  if (!currentStatus.runId || isTerminalPhase(currentStatus.phase)) {
    return currentStatus;
  }

  const apiKey = await getApiKey();
  const client = new OzApiClient(apiKey);
  const run = await client.getRun(currentStatus.runId);
  const baseStatus: ScriptRunStatus = {
    ...currentStatus,
    runState: run.state,
    statusMessage: run.status_message?.message || currentStatus.statusMessage || '',
    sessionLink: run.session_link ?? currentStatus.sessionLink,
    updatedAt: nowIso(),
  };

  if (run.state !== 'SUCCEEDED' && run.state !== 'FAILED' && run.state !== 'CANCELLED') {
    const runningStatus: ScriptRunStatus = {
      ...baseStatus,
      phase: 'RUNNING',
      error: undefined,
    };
    await setRunStatus(runningStatus);
    return runningStatus;
  }

  if (run.state === 'FAILED' || run.state === 'CANCELLED') {
    const failedStatus: ScriptRunStatus = {
      ...baseStatus,
      phase: 'FAILED',
      error: run.status_message?.message || `Run ended with state ${run.state}.`,
    };
    await setRunStatus(failedStatus);
    return failedStatus;
  }

  await setRunStatus({
    ...baseStatus,
    phase: 'IMPORTING',
    statusMessage: 'Run succeeded. Importing generated script...',
    error: undefined,
  });

  try {
    const resolution = client.resolvePullRequest(run);
    const imported = await client.importScriptFromPullRequest(resolution.prUrl, COORDINATION_REPO_POLICY);
    validateManifest(imported.manifest);
    const customization = await toStoredCustomization(imported, nowIso());
    const customizationMap = await getCustomizationMap();
    customizationMap[customization.id] = {
      ...customization,
      enabled: true,
      updatedAt: nowIso(),
    };
    await setCustomizationMap(customizationMap);
    await syncUserScriptsRegistrations();

    const completedStatus: ScriptRunStatus = {
      ...baseStatus,
      phase: 'COMPLETED',
      prUrl: resolution.prUrl,
      scriptId: customization.id,
      statusMessage: 'Script imported and enabled.',
      error: undefined,
    };
    await setRunStatus(completedStatus);
    return completedStatus;
  } catch (error) {
    const failedImportStatus: ScriptRunStatus = {
      ...baseStatus,
      phase: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
    await setRunStatus(failedImportStatus);
    return failedImportStatus;
  }
}

async function safePollScriptRunStatus(): Promise<ScriptRunStatus> {
  try {
    return await pollScriptRunStatus();
  } catch (error) {
    const currentStatus = await getRunStatus();
    const failedStatus: ScriptRunStatus = {
      ...currentStatus,
      phase: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
      updatedAt: nowIso(),
    };
    await setRunStatus(failedStatus);
    return failedStatus;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setRunStatus(createIdleRunStatus()).catch(() => undefined);
  syncUserScriptsRegistrations().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  syncUserScriptsRegistrations().catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender: unknown, sendResponse: (response: unknown) => void) => {
  if (message.type === 'GET_API_KEY_STATUS') {
    hasApiKey()
      .then((result) => sendResponse({ ok: true, result: { hasApiKey: result } }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'SET_API_KEY') {
    setApiKey(message.apiKey)
      .then(() => sendResponse({ ok: true, result: { hasApiKey: true } }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'START_SCRIPT_RUN') {
    startScriptRun(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GET_SCRIPT_RUN_STATUS') {
    safePollScriptRunStatus()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'SET_SCRIPT_ENABLED') {
    setScriptEnabled(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
