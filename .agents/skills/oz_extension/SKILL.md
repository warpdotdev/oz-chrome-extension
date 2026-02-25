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
2. Produce script output that is scoped to the intended site and safe on repeated executions.
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

## Manifest requirements

`manifest.json` must include:

- `id`: stable script identifier
- `version`: monotonic version string
- `matches`: URL match patterns
- `entrypoint`: relative path to `script.user.js`
- `description`: concise behavior summary

## Output quality bar

- Script executes without syntax errors.
- Match rules are no broader than needed.
- PR contains enough metadata for an importer to locate and validate files without parsing free-form prose.
