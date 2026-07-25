# Reverse Engineering Validation Checklist

## Source

- [ ] Source is owner-provided, public documentation, local repo, or approved export.
- [ ] Source version/date is captured.
- [ ] Access rights are recorded.
- [ ] Private/customer data is excluded.

## Verify

- [ ] Claims are separated into confirmed, inferred, and unknown.
- [ ] Screenshots are treated as evidence, not repo truth.
- [ ] External claims are not copied into memory without distillation.

## Reverse Engineer

- [ ] Components are listed.
- [ ] Data flow is listed.
- [ ] API contracts are listed or explicitly marked not applicable.
- [ ] Auth and permission boundaries are listed.
- [ ] UI states are listed or explicitly marked not applicable.
- [ ] Runtime jobs and storage surfaces are listed.

## Policy

- [ ] No unauthorized third-party scanning.
- [ ] No access-control bypass workflow.
- [ ] No credential collection.
- [ ] No customer data ingestion.
- [ ] No deploy, push, cloud mutation, provider call, or live send.

## Build Packet

- [ ] Allowed files and forbidden files are exact.
- [ ] First packet is one layer only.
- [ ] Validation commands use existing local tools.
- [ ] Receipt path is defined.
- [ ] Handoff owner and next safe action are defined.
