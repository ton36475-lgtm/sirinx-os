# Local Release Gate

A local run is complete only when all checks pass:

- Required file tree exists.
- JSON files parse.
- CSV templates contain headers.
- n8n workflow is inactive and contains no external API call by default.
- Dashboard HTML, JS, and CSS exist.
- Prompt pack contains required prompt sections.
- QC checklist contains required sections.
- Calendar contains 30 day entries.
- Safety scan finds no credential values or live publish automation.
- A2A dispatch and receipt packets exist.

## Commit Gate

Local commit is allowed only when validation passes and the worktree contains only approved mission changes. This run detected pre-existing unrelated changes, so commit is blocked until the operator isolates or clears the workspace.
