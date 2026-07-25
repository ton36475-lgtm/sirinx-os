---
name: uat-crud-mongodb
description: Use when preparing local-only CRUD UAT with MongoDB verification, security-gated synthetic fixtures, A2A review packets, or coding-engine checks that must not connect to MongoDB, read real env files, install packages, open tunnels, or use customer data.
---

# UAT CRUD + MongoDB Verification Skill

## Purpose

Automated User Acceptance Testing readiness สำหรับ CRUD flows พร้อม MongoDB verification แบบ local-only และ approval-gated

## Security Mode

- Default mode is `dry-run-discovery-only`.
- Inspect `package.json`, `.env.example`, and source file paths only.
- Do not read real `.env`, `.env.local`, `.env.production`, tokens, passwords, or private keys.
- Do not connect to MongoDB.
- Do not create, update, delete, or verify real database records.
- Do not use production data, customer data, LINE IDs, emails, phone numbers, invoices, or site photos.
- Do not start application servers, browsers, Stagehand, or Playwright automatically.
- Do not install packages or open public tunnels.
- Do not call providers or paid APIs.

## Approval Gates

These actions require exact operator approval before any future implementation:

- MongoDB CRUD write / database mutation:
  `APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>`
- Dependency install:
  `APPROVE_DEPENDENCY_INSTALL_<package-or-scope>_<date>`
- Browser automation / Stagehand / Playwright execution:
  `APPROVE_LOCAL_BROWSER_UAT_<target>_<date>`
- Public tunnel:
  `APPROVE_PUBLIC_TUNNEL_<tool>_<date>`
- Customer or production data use:
  `APPROVE_CUSTOMER_DATA_UAT_<scope>_<date>`

## ขั้นตอนการทำงาน

1. **Inspect Project** - ค้นหา project type, routes, CRUD file candidates, and MongoDB package signals.
2. **Classify Security** - ตรวจ policy สำหรับ DB write, package install, tunnel, browser automation, and customer-data risks.
3. **Plan CRUD Flows** - สร้าง UAT plan จาก routes/source paths without executing them.
4. **Prepare Synthetic Fixtures** - เสนอ schema สำหรับ synthetic-only create/read/update/delete checks.
5. **Report Gates** - ระบุ approval phrase ที่ต้องใช้ก่อน execution จริง.
6. **Stop** - หยุดก่อน server start, browser automation, MongoDB connection, or database mutation.

## Local Command

```bash
node skills/uat-crud-mongodb/run.mjs --project . --json
```

The command prints a local discovery report only. It does not execute UAT.

## Environment Variables

Do not require or read real environment variables in this skill. Use `.env.example`
for placeholder detection only.
