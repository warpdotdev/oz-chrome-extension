import { OzApiClient } from '@oz-chrome-extension/oz-client';
import { toStoredCustomization, toUserScriptRegistration, validateManifest } from '@oz-chrome-extension/oz-runtime';
import type { StoredCustomization } from '@oz-chrome-extension/shared';

declare const chrome: any;

const API_KEY_STORAGE_KEY = 'oz.apiKey';
const CUSTOMIZATIONS_STORAGE_KEY = 'oz.customizations';

type CreateScriptMessage = {
  type: 'CREATE_SCRIPT';
  prompt: string;
  environmentId?: string;
};

type EnableScriptMessage = {
  type: 'SET_SCRIPT_ENABLED';
  id: string;
  enabled: boolean;
};

type RuntimeMessage = CreateScriptMessage | EnableScriptMessage;

async function getApiKey(): Promise<string> {
  const data = await chrome.storage.local.get([API_KEY_STORAGE_KEY]);
  const key = data[API_KEY_STORAGE_KEY];
  if (!key) {
    throw new Error('Missing Oz API key. Set it in extension settings.');
  }
  return key;
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

async function createScript(message: CreateScriptMessage): Promise<{ runId: string; prUrl: string; scriptId: string }> {
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
  if (completedRun.state !== 'SUCCEEDED') {
    throw new Error(`Run ${completedRun.run_id} finished with state ${completedRun.state}`);
  }
  const resolution = client.resolvePullRequest(completedRun);
  const imported = await client.importScriptFromPullRequest(resolution.prUrl);
  validateManifest(imported.manifest);
  const customization = await toStoredCustomization(imported, new Date().toISOString());
  const customizationMap = await getCustomizationMap();
  customizationMap[customization.id] = customization;
  await setCustomizationMap(customizationMap);
  return {
    runId: resolution.runId,
    prUrl: resolution.prUrl,
    scriptId: customization.id,
  };
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
    updatedAt: new Date().toISOString(),
  };
  await setCustomizationMap(customizationMap);
  await syncUserScriptsRegistrations();
  return {
    id: message.id,
    enabled: message.enabled,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  syncUserScriptsRegistrations().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  syncUserScriptsRegistrations().catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender: unknown, sendResponse: (response: unknown) => void) => {
  if (message.type === 'CREATE_SCRIPT') {
    createScript(message)
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
