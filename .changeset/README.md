This directory contains Changesets configuration for independent package versioning.

Workflow (optional, when using changesets):
- Use `npx changeset` to create a changeset per change.
- Merge PRs; CI (changesets action) will open a release PR with version bumps.
- On release, publish `packages/core` to npm; the extension is not published to npm.

Note: The repo also supports manual releases via GitHub Release + publish workflow.

