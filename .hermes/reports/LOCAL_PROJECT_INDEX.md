# Local Project Index - Approved Roots Only

## Timestamp
2026-05-28 01:01:03 +07

## Index Policy
- Max depth used: `2`
- Excluded: `node_modules`, `.git`, `.venv`, `dist`, `build`, `.env*`
- Not scanned: full Mac, browser profiles, Keychain, Photos, Downloads, hidden secret stores, unrelated home folders

## Approved Roots

### `/Users/sirinx/sirinx-os`
Observed first-level areas:
- `.claude`
- `.hermes`
- `.pnpm-store`
- `.thclaws`
- `.vscode`
- `.wrangler`
- `apps`
- `archive`
- `brain`
- `config`
- `councils`
- `data`
- `devtools`
- `docs`
- `examples`
- `infra`
- `kms`
- `ollama`
- `ops`
- `packages`
- `policies`
- `prompts`
- `scripts`
- `security`
- `services`
- `skills`
- `tests`
- `tools`
- `vault`
- `workflows`

Key implementation surfaces:
- `apps/dev-dashboard`
- `apps/solar-intelligence`
- `apps/sirinx-site`
- `apps/centerbrain-shell`
- `services/dev-control-api`
- `services/hermes-api`
- `packages/policy-core`
- `tools/local-rag`
- `docs/knowledge`

### `/Users/sirinx/Documents/Codex`
Observed:
- `2026-05-09/openai-developers-plugin-openai-developers-openai`
- `2026-05-09/vibeallcoding-in-this-mac-to-1`
- `2026-05-09/plugin-computer-use-openai-bundled-play`
- `2026-05-12/heartbeat-documents-spreadsheets-presentations-documents-plugin`

### `/Users/sirinx/Documents/Codex/2026-05-09/plugin-computer-use-openai-bundled-play/MySecondBrain`
Observed major areas:
- `.obsidian`
- `.github`
- `.vscode`
- `addons`
- `agent-sessions`
- `agents`
- `api-docs`
- `concepts`
- `customers`
- `data`
- `decisions`
- `docs`
- `exports`
- `interfaces`
- `monorepo`
- `projects`
- `raw`
- `templates`
- `tools`
- `wiki`

Security note:
- `.secrets` exists under this root and was not entered or indexed.

### `/Users/sirinx/Documents/GitHub`
Status: missing.

## Next Safe Index Action
Create a machine-readable index only after deciding which roots become durable source-of-truth. The recommended next index file is `.hermes/reports/GITHUB_REPO_INDEX.md`, but it should stay empty/blocked until a GitHub root exists or the user approves repository cloning.

## V4 Refresh - 2026-05-28 01:09 +07
- Approved roots only were rechecked.
- `/Users/sirinx/Documents/GitHub` is still missing.
- `/Users/sirinx/project-hermes` is missing and was not added as an indexed root.
- No `.env`, `.secrets`, secret store, browser profile, Keychain data, Photos, or Downloads path was indexed.
