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
}

export function buildSiteKey(match: string): string {
  return `site:${match}`;
}

export function toStoredCustomization(
  draft: ImportedScriptDraft,
  nowIso: string,
  scriptSourceHash: string,
): StoredCustomization {
  const firstMatch = draft.manifest.matches[0] ?? '*://*/*';
  return {
    id: draft.manifest.id,
    siteKey: buildSiteKey(firstMatch),
    scriptSource: draft.scriptSource,
    scriptSourceHash,
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
    matches: [customization.siteKey.replace('site:', '')],
    js: customization.scriptSource,
  };
}
