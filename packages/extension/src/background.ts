import { OzApiClient } from '@oz-chrome-extension/oz-client';

declare const chrome: any;

const STORAGE_KEY = 'oz.apiKey';

type CreateScriptMessage = {
  type: 'CREATE_SCRIPT';
  prompt: string;
  environmentId?: string;
};

async function getApiKey(): Promise<string> {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const key = data[STORAGE_KEY];
  if (!key) {
    throw new Error('Missing Oz API key. Set it in extension settings.');
  }
  return key;
}

async function createScript(message: CreateScriptMessage): Promise<{ runId: string; prUrl: string }> {
  const apiKey = await getApiKey();
  const client = new OzApiClient(apiKey);
  const run = await client.runAgent({
    prompt: message.prompt,
    config: {
      environment_id: message.environmentId,
      skill_spec: 'warpdotdev/oz-chrome-extension:.agents/skills/oz_extension/SKILL.md',
      name: 'oz-chrome-extension-create-script',
    },
    title: 'Generate site customization script',
  });
  const completedRun = await client.waitForRunCompletion(run.run_id);
  const resolution = client.resolvePullRequest(completedRun);
  return {
    runId: resolution.runId,
    prUrl: resolution.prUrl,
  };
}

chrome.runtime.onMessage.addListener((message: CreateScriptMessage, _sender: unknown, sendResponse: (response: unknown) => void) => {
  if (message.type !== 'CREATE_SCRIPT') {
    return;
  }
  createScript(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
