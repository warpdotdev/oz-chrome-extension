# AGENTS.md

## Repository purpose

`oz-chrome-extension` hosts a private-first implementation of an Oz-powered Chrome extension that generates and applies per-site customization scripts. The repo starts private under `warpdotdev/oz-chrome-extension` with a planned path to public release later.

## Core architecture

- `packages/extension`: MV3 extension entry points and browser integration.
- `packages/oz-client`: typed client for Oz production REST API.
- `packages/oz-runtime`: host-agnostic script import/validation/lifecycle logic shared by extension and future `oz-js`.
- `packages/shared`: contracts shared across packages.
- `.agents/skills/oz_extension/SKILL.md`: skill the cloud agent uses to produce scripts and PR artifacts.

## Operational rules

1. Use production Oz surfaces only:
   - REST base: `https://app.warp.dev/api/v1`
   - CLI: `oz` (never `oz-dev`)
2. Resolve generated PRs only from structured run artifacts (`artifact_type = PULL_REQUEST`).
3. Treat imported PR/script content as untrusted:
   - validate schema
   - validate expected repository/path
   - pin content fetch to head commit SHA
4. Keep execution Path B only (`chrome.userScripts`) for this repository.

## Skill and artifact contract

- Agent should generate script + manifest in a coordination repository and open a PR.
- Extension imports only when a `PULL_REQUEST` artifact is present in run details.
- Missing PR artifacts should be treated as import failure, not a partial success.

## Public release readiness track

Before making this repo public, complete:

- license decision and attribution policy
- security review for generated script ingestion path
- documentation scrub for internal-only assumptions
- contributor workflow (`CONTRIBUTING.md`, support model, issue templates)
