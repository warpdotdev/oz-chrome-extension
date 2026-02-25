import { getPullRequestArtifact, type PullRequestRef, type RunItem, type RunResolution, type ScriptManifest } from '@oz-chrome-extension/shared';

const DEFAULT_BASE_URL = 'https://app.warp.dev/api/v1';
const GITHUB_API_BASE_URL = 'https://api.github.com';

export interface RunAgentRequest {
  prompt: string;
  config?: {
    environment_id?: string;
    name?: string;
    skill_spec?: string;
    model_id?: string;
  };
  title?: string;
}

export interface RunAgentResponse {
  run_id: string;
  state: RunItem['state'];
}

interface GitHubPullRequestResponse {
  head: {
    sha: string;
  };
}

interface GitHubPullRequestFile {
  filename: string;
  raw_url: string;
}
export interface PullRequestImportPolicy {
  allowedOwner: string;
  allowedRepo: string;
  allowedPathPrefix?: string;
}

export interface ImportedPullRequestScript {
  manifest: ScriptManifest;
  scriptSource: string;
  sourcePrUrl: string;
  sourceCommitSha: string;
}

export class OzApiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async runAgent(payload: RunAgentRequest): Promise<RunAgentResponse> {
    const response = await fetch(`${this.baseUrl}/agent/run`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to run agent: ${response.status}`);
    }
    return response.json() as Promise<RunAgentResponse>;
  }

  async getRun(runId: string): Promise<RunItem> {
    const response = await fetch(`${this.baseUrl}/agent/runs/${runId}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch run ${runId}: ${response.status}`);
    }
    return response.json() as Promise<RunItem>;
  }

  async waitForRunCompletion(runId: string, maxAttempts = 120, intervalMs = 2000): Promise<RunItem> {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const run = await this.getRun(runId);
      if (run.state === 'SUCCEEDED' || run.state === 'FAILED' || run.state === 'CANCELLED') {
        return run;
      }
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Timed out waiting for run ${runId}`);
  }

  resolvePullRequest(run: RunItem): RunResolution {
    const artifact = getPullRequestArtifact(run.artifacts);
    if (!artifact) {
      throw new Error(`Run ${run.run_id} completed without PULL_REQUEST artifact`);
    }
    return {
      runId: run.run_id,
      state: run.state,
      prUrl: artifact.data.url,
      branch: artifact.data.branch,
    };
  }

  parsePullRequestUrl(prUrl: string): PullRequestRef {
    let parsed: URL;
    try {
      parsed = new URL(prUrl);
    } catch {
      throw new Error(`Invalid pull request URL: ${prUrl}`);
    }
    if (parsed.hostname !== 'github.com') {
      throw new Error(`Unsupported pull request host: ${parsed.hostname}`);
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== 'pull') {
      throw new Error(`Unsupported pull request URL path: ${parsed.pathname}`);
    }
    const number = Number(parts[3]);
    if (!Number.isInteger(number) || number <= 0) {
      throw new Error(`Invalid pull request number in URL: ${prUrl}`);
    }
    return {
      owner: parts[0],
      repo: parts[1],
      number,
      url: prUrl,
    };
  }

  async importScriptFromPullRequest(
    prUrl: string,
    policy: PullRequestImportPolicy,
  ): Promise<ImportedPullRequestScript> {
    const prRef = this.parsePullRequestUrl(prUrl);
    if (prRef.owner !== policy.allowedOwner || prRef.repo !== policy.allowedRepo) {
      throw new Error(
        `Pull request ${prUrl} is outside allowed repository ${policy.allowedOwner}/${policy.allowedRepo}`,
      );
    }
    const pullRequest = await this.fetchJson<GitHubPullRequestResponse>(
      `${GITHUB_API_BASE_URL}/repos/${prRef.owner}/${prRef.repo}/pulls/${prRef.number}`,
    );
    const files = await this.listPullRequestFiles(prRef);
    const manifestFile = files.find((file) => file.filename.endsWith('manifest.json'));
    if (!manifestFile) {
      throw new Error(`Pull request ${prUrl} does not contain manifest.json`);
    }
    assertPathAllowed(manifestFile.filename, policy.allowedPathPrefix, 'manifest');
    const manifestText = await this.fetchText(manifestFile.raw_url);
    const manifest = JSON.parse(manifestText) as ScriptManifest;
    const scriptPath = resolveScriptPathFromManifest(manifestFile.filename, manifest.entrypoint);
    assertPathAllowed(scriptPath, policy.allowedPathPrefix, 'script');
    const scriptFile = files.find((file) => file.filename === scriptPath);
    if (!scriptFile) {
      throw new Error(`Unable to locate script entrypoint "${scriptPath}" in pull request ${prUrl}`);
    }
    const scriptSource = await this.fetchText(scriptFile.raw_url);
    return {
      manifest,
      scriptSource,
      sourcePrUrl: prUrl,
      sourceCommitSha: pullRequest.head.sha,
    };
  }

  private async listPullRequestFiles(prRef: PullRequestRef): Promise<GitHubPullRequestFile[]> {
    const files: GitHubPullRequestFile[] = [];
    let page = 1;
    while (true) {
      const pageFiles = await this.fetchJson<GitHubPullRequestFile[]>(
        `${GITHUB_API_BASE_URL}/repos/${prRef.owner}/${prRef.repo}/pulls/${prRef.number}/files?per_page=100&page=${page}`,
      );
      files.push(...pageFiles);
      if (pageFiles.length < 100) {
        return files;
      }
      page += 1;
    }
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub request failed (${response.status}) for ${url}`);
    }
    return response.json() as Promise<T>;
  }

  private async fetchText(url: string): Promise<string> {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to fetch file content (${response.status}) from ${url}`);
    }
    return response.text();
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
}

function resolveScriptPathFromManifest(manifestPath: string, entrypoint: string): string {
  const manifestDir = dirname(manifestPath);
  const joined = joinPosix(manifestDir, entrypoint);
  return normalizePosix(joined);
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) {
    return '';
  }
  return path.slice(0, idx);
}

function joinPosix(base: string, next: string): string {
  if (next.startsWith('/')) {
    return next.slice(1);
  }
  if (!base) {
    return next;
  }
  return `${base}/${next}`;
}

function normalizePosix(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

function assertPathAllowed(path: string, allowedPrefix: string | undefined, label: string): void {
  if (!path) {
    throw new Error(`Resolved ${label} path is empty`);
  }
  if (!allowedPrefix) {
    return;
  }
  const normalizedPrefix = allowedPrefix.endsWith('/') ? allowedPrefix : `${allowedPrefix}/`;
  if (!path.startsWith(normalizedPrefix)) {
    throw new Error(`${label} path "${path}" is outside allowed prefix "${normalizedPrefix}"`);
  }
}
