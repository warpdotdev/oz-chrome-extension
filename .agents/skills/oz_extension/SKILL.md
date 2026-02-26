---
name: oz-extension-script-generator
description: Generates site customization JavaScript for the Oz Chrome Extension flow and returns deliverables through a pull-request artifact. Use when asked to create, update, or repair scripts that modify a web page for a user's prompt.
---

# Oz Extension Script Generator

Generate a site-customization script and deliver it through a pull request so the extension can ingest it from structured run artifacts.

## Required inputs

- User customization prompt
- Page context snapshot (URL, relevant DOM/HTML excerpt, constraints)
- Coordination repository and branch policy

## Procedure

1. Translate the prompt into concrete, idempotent page-behavior requirements.
2. Produce script output that is scoped to the intended site, safe on repeated executions, and resilient to DOM drift/timing changes.
3. Create two files in the coordination repository under the agreed directory convention:
   - `script.user.js`
   - `manifest.json`
4. Open a pull request with only the generated files needed for import.
5. Ensure PR body includes machine-readable metadata:
   - script identifier
   - site match rules
   - script file path
   - manifest file path
   - content hash/version
6. Report the pull request as an artifact so callers can resolve it from run artifacts.

## Script requirements

- Keep script site-scoped and deterministic.
- Avoid destructive operations unless explicitly requested.
- Use guards around selectors that may be absent.
- Make repeated runs produce the same end state.
- Assume the DOM can change between query and mutation; re-query after async boundaries before writing.
- Never throw on missing/changed elements; skip that step and continue applying other safe changes.
- Prefer robust selectors (stable ids, data attributes, semantic structure) over brittle deep chains, text-exact matches, or index-only selectors.
- Use ordered fallback selectors when practical instead of a single fragile selector.
- Gate DOM writes with safety checks (for example: node exists, is connected, and target container still matches expectations).
- Handle delayed rendering by waiting for readiness with bounded retries/timeouts (no infinite loops).
- Isolate risky operations with local `try/catch` so one failure does not abort the entire script.
- Treat non-critical resource failures (for example image fetch/load issues) as warnings, not terminal failures.
- Keep scripts idempotent and side-effect bounded so reruns recover gracefully from partial application.
## Recommended resilience scaffold (for `script.user.js`)

When generating scripts, prefer this structure so behavior is consistent across pages and runs:

1. `main()` orchestrator
   - Runs a sequence of small, named steps.
   - Each step returns `{ ok: boolean, warning?: string }` instead of throwing for expected DOM drift.
2. Shared selector helpers
   - Use a `queryFirst(selectors: string[])` helper that tries fallback selectors in order.
   - Use `isUsableNode(node)` checks before every write (exists, connected, expected tag/container).
3. Bounded wait/retry helpers
   - `waitFor(condition, { timeoutMs, intervalMs })` for delayed rendering.
   - `retryStep(stepFn, { attempts, backoffMs })` for transient failures only.
4. Mutation wrappers
   - `safeMutate(name, fn)` wraps a mutation in local `try/catch` and records warnings.
   - Re-read critical nodes immediately before mutation, especially after awaits.
5. Completion reporting
   - Accumulate warnings and expose them via console warnings (not thrown exceptions).
   - Throw only for truly unrecoverable script-level conditions (for example malformed internal config), not missing optional DOM targets.

Keep the scaffold lightweight and avoid introducing broad global side effects.

## Manifest requirements

`manifest.json` must include:

- `id`: stable script identifier
- `version`: monotonic version string
- `matches`: URL match patterns
- `entrypoint`: relative path to `script.user.js`
- `description`: concise behavior summary

Additional required constraints:
- `entrypoint` must resolve to `script.user.js` in the same generated directory.
- `matches` must include a pattern that matches the captured target page URL from input context.

## Output quality bar

- Script executes without syntax errors.
- Match rules are no broader than needed.
- PR contains enough metadata for an importer to locate and validate files without parsing free-form prose.
