# 14 - Local RAG turbovec Grid

Status: local-only RAG prototype

```mermaid
flowchart TB
  GATEWAY["Gateway Agent"] --> CONTRACT["Local RAG Contract API"]

  subgraph CORPUS["Full Repo Safe-Text Corpus"]
    DOCS["docs / vault / source text"]
    FILTER["Secret and generated-output filter"]
    SAFE["Sanitized document snippets"]
  end

  subgraph RUNTIME["Optional Runtime"]
    FIXTURE["Deterministic local fixture embeddings"]
    PY["Optional Python worker"]
    TURBO["turbovec optional vector index"]
  end

  subgraph BOUNDARY["Blocked Actions"]
    PAID["No paid embedding API"]
    MCP["No real MCP"]
    SECRET["No secret read or print"]
    CONNECTOR["No connector activation"]
    SEND["No Telegram / LINE send"]
  end

  subgraph OUTPUT["Evidence Output"]
    SCAN["Scan dry-run packet"]
    QUERY["Query dry-run packet"]
    DASH["Mission Control RAG panel"]
    STOP["WAITING FOR HUMAN APPROVAL"]
  end

  CONTRACT --> DOCS --> FILTER --> SAFE
  SAFE --> FIXTURE
  SAFE -. "after dependency approval" .-> PY --> TURBO
  FIXTURE --> SCAN
  FIXTURE --> QUERY
  TURBO -. "local benchmark only" .-> QUERY
  PAID --> STOP
  MCP --> STOP
  SECRET --> STOP
  CONNECTOR --> STOP
  SEND --> STOP
  SCAN --> DASH
  QUERY --> DASH
  DASH --> STOP
```

## Definition Of Done

- Local RAG API reports `full-repo-safe-text` corpus scope.
- Scan dry-run excludes secrets, dependency folders, generated output, binaries, and oversized files.
- Query dry-run uses deterministic local fixture embeddings until local embedding dependencies are approved.
- Mission Control shows dependency status, corpus scope, blocked actions, and approval stop point.
- `turbovec` claims remain upstream claims until local benchmark evidence exists.
