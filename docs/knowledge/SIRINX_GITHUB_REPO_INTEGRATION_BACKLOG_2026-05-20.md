# SIRINX GitHub Repository Integration Backlog

Date: 2026-05-20
Status: active backlog, read-only import phase complete
Owner inspected: `ton36475-lgtm`

## Operating Rule

Old GitHub repositories are not a single merge job. They are a backlog of bounded extraction tasks. Each task must specify:

- source repository and local path
- target package/app/service/doc
- files allowed to inspect
- files forbidden to inspect
- expected output
- test command
- approval gate if external write, deploy, send, or credential access is involved

## Part 1 - Public Website Protection

Status: done for inventory, ongoing for future changes

Source:

- GitHub: `ton36475-lgtm/sirinx`
- Audit clone: `/Users/sirinx/restore-sources/github-audit/sirinx`
- Live source: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`

Rules:

- Do not overwrite the live public website from old repos.
- Do not change `www.sirinx.co` homepage unless the task explicitly targets the public website.
- Use old repo content only as diff/reference material.

Next action:

- Before the next website change, compare the live source repo and audit clone for drift, then patch only the requested website feature.

## Part 2 - Solar Operations Extraction

Status: ready for scoped review

Source:

- `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy`

Candidate extraction areas:

- admin/customer/contractor app structure
- Cloudflare Worker patterns
- Supabase schema ideas
- SEO/AEO and solar content organization
- Telegram and agent-warroom workflow references

Forbidden in this phase:

- running deploy scripts
- changing Cloudflare
- reading credentials
- importing runtime code without tests

Recommended first task:

- Create `docs/knowledge/SIRINX_SOLAR_OPS_EXTRACTION_PLAN.md` with file-level candidates and target Command Center modules.

## Part 3 - Agent Runtime And Messaging Extraction

Status: quarantine-reference

Source:

- `/Users/sirinx/restore-sources/github-audit/oz-corp-omega-dual-node`

Reason:

- High-value but very large experimental repo. It contains many agent, LINE, Telegram, Supabase, SEO, OpenClaw, Hermes WarRoom, and solar dashboard references.

Rules:

- No bulk copy.
- No runtime merge.
- No external messaging.
- No token/secret inspection.
- Extract only one module at a time with tests.

Recommended first task:

- Map only the Hermes/agent orchestration files into a proposed `services/dev-control-api/src/agent-team` backlog item.

## Part 4 - Marketing And CRM Schema Comparison

Status: ready for schema review

Sources:

- `/Users/sirinx/restore-sources/github-audit/automated-marketing-agency`
- `/Users/sirinx/restore-sources/github-audit/chokma-growth-os`

Candidate extraction areas:

- campaign model
- lead status model
- CRM routing
- webhook intake safety
- LINE/Telegram lead notifications

Recommended first task:

- Produce a schema comparison table against the current SIRINX lead intake and lead qualification modules.

Test requirement:

- Any imported model must be covered by local API tests and must keep `externalWrites=false` until send targets are confirmed.

## Part 5 - Mobile Companion Review

Status: blocked by signing-file policy

Sources:

- `/Users/sirinx/restore-sources/github-audit/automation-mobile-app`
- `/Users/sirinx/restore-sources/github-audit/ghost-claw-os`
- `/Users/sirinx/restore-sources/github-audit/oz_mobile_app`

Blockers:

- `automation-mobile-app` and `ghost-claw-os` contain `android-release.keystore` filenames.
- Codex Mobile QR/MFA pairing remains a human gate.

Rules:

- Do not read or copy keystore files.
- Do not import mobile build artifacts.
- Use only architecture docs and UI references until signing policy is resolved.

Recommended first task:

- Document Codex Mobile + Hermes mobile-control UX separately from mobile app runtime code.

## Part 6 - Documentation And Backend References

Status: low priority reference

Sources:

- `/Users/sirinx/restore-sources/github-audit/automation-dashboard`
- `/Users/sirinx/restore-sources/github-audit/automation-documentation`
- `/Users/sirinx/restore-sources/github-audit/automation-system-backend`

Use:

- SOP wording
- dashboard layout reference
- backend deployment notes

Rule:

- Do not introduce another dashboard/backend stack unless a concrete gap exists in SIRINX OS.

## Part 7 - External Gates That Still Block Real Integration

| Gate | Current state | Required next action |
| --- | --- | --- |
| Codex Mobile QR/MFA | Manual gate | Pair on Mac + mobile; cannot be bypassed by automation. |
| Telegram/LINE | Recipient/token gate | Confirm chat/group/channel and rotate/store tokens before smoke sends. |
| Solis API | Consent/credential gate | Confirm customer consent, station mapping, and read-only credentials. |
| Cloudflare Bot Management | Dashboard/API policy gate | Review official Bot/WAF rule only if replacing CSP mitigation. |
| Mobile signing | Sensitive-file gate | Review keystore/signing policy before any mobile build reuse. |

## Done Criteria For Each Future Extraction Task

1. Source repo and file list are named.
2. Forbidden files are named.
3. Target SIRINX module is named.
4. Runtime behavior is unchanged unless explicitly scoped.
5. Local tests pass.
6. Dashboard/Obsidian summary is updated.
7. `git status` is reviewed.
8. External writes remain blocked unless exact approval exists.
