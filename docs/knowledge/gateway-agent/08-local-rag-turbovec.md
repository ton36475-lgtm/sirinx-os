# Local RAG turbovec Prototype

Date: 2026-05-26
Status: local-only prototype ready

## Purpose

Local RAG adds a retrieval layer for SIRINX OS knowledge without activating connectors or calling external embedding APIs. `turbovec` is treated as an optional local Python vector index, not a required runtime dependency.

## Local API

```text
GET /api/local-rag
POST /api/local-rag/scan/dry-run
POST /api/local-rag/query/dry-run
```

All routes return local JSON only. They do not deploy, push, publish, call paid APIs, run MCP, activate connectors, send Telegram or LINE, or read secret files.

## Corpus Boundary

Default corpus:

```text
full-repo-safe-text
```

Included content is safe local text from the repo. Excluded content includes credential files, dependency folders, generated output, binary files, oversized files, and files containing secret-like patterns.

## Runtime Boundary

The Python worker is optional:

```text
tools/local-rag/turbovec_worker.py
```

If `turbovec` is missing, the system reports the dependency status and falls back to deterministic local fixture retrieval for dry-run tests.

## Stop Point

```text
LOCAL RAG PROTOTYPE READY - WAITING FOR HUMAN APPROVAL
```
