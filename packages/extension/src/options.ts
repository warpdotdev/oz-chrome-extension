declare const chrome: any;

const STORAGE_KEY = 'oz.apiKey';

export async function saveApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: apiKey,
  });
}

export async function loadApiKey(): Promise<string | null> {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  return data[STORAGE_KEY] ?? null;
}
