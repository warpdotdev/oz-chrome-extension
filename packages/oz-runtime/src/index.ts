import type { ScriptManifest, StoredCustomization } from '@oz-chrome-extension/shared';

export interface ImportedScriptDraft {
  manifest: ScriptManifest;
  scriptSource: string;
  sourcePrUrl: string;
  sourceCommitSha: string;
}

export function validateManifest(manifest: ScriptManifest): void {
  if (!manifest.id.trim()) {
    throw new Error('Manifest id is required');
  }
  if (!manifest.version.trim()) {
    throw new Error('Manifest version is required');
  }
  if (!manifest.matches.length) {
    throw new Error('Manifest must contain at least one match pattern');
  }
  if (!manifest.entrypoint.trim()) {
    throw new Error('Manifest entrypoint is required');
  }
  if (!manifest.description.trim()) {
    throw new Error('Manifest description is required');
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function toStoredCustomization(
  draft: ImportedScriptDraft,
  nowIso: string,
): Promise<StoredCustomization> {
  const scriptSourceHash = await sha256Hex(draft.scriptSource);
  return {
    id: draft.manifest.id,
    matches: draft.manifest.matches,
    scriptSource: draft.scriptSource,
    scriptSourceHash,
    sourcePrUrl: draft.sourcePrUrl,
    sourceCommitSha: draft.sourceCommitSha,
    enabled: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastRunStatus: 'never',
  };
}

export interface UserScriptRegistration {
  id: string;
  matches: string[];
  js: string;
}

export function toUserScriptRegistration(customization: StoredCustomization): UserScriptRegistration {
  return {
    id: customization.id,
    matches: customization.matches,
    js: customization.scriptSource,
  };
}
