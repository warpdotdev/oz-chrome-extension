export type ArtifactType = 'PLAN' | 'PULL_REQUEST' | 'SCREENSHOT';

export interface PullRequestArtifact {
  artifact_type: 'PULL_REQUEST';
  created_at?: string;
  data: {
    branch: string;
    url: string;
  };
}

export interface GenericArtifact {
  artifact_type: ArtifactType;
  created_at?: string;
  data?: Record<string, unknown>;
}

export type ArtifactItem = PullRequestArtifact | GenericArtifact;

export interface RunItem {
  run_id: string;
  state: 'QUEUED' | 'PENDING' | 'CLAIMED' | 'INPROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  artifacts?: ArtifactItem[];
  session_link?: string;
  status_message?: {
    message?: string;
  };
}

export interface RunResolution {
  runId: string;
  state: RunItem['state'];
  prUrl: string;
  branch: string;
}

export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export interface ScriptManifest {
  id: string;
  version: string;
  matches: string[];
  entrypoint: string;
  description: string;
}

export interface StoredCustomization {
  id: string;
  matches: string[];
  scriptSource: string;
  scriptSourceHash: string;
  sourcePrUrl: string;
  sourceCommitSha: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunStatus: 'never' | 'success' | 'error';
}

export function getPullRequestArtifact(artifacts: ArtifactItem[] | undefined): PullRequestArtifact | null {
  if (!artifacts?.length) {
    return null;
  }
  return artifacts.find((artifact): artifact is PullRequestArtifact => artifact.artifact_type === 'PULL_REQUEST') ?? null;
}
