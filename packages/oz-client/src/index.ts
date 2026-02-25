import { getPullRequestArtifact, type RunItem, type RunResolution } from '@oz-chrome-extension/shared';

const DEFAULT_BASE_URL = 'https://app.warp.dev/api/v1';

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

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
}
