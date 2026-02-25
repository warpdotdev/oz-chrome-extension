declare const chrome: any;

export async function requestScriptGeneration(prompt: string): Promise<unknown> {
  return chrome.runtime.sendMessage({
    type: 'CREATE_SCRIPT',
    prompt,
  });
}
