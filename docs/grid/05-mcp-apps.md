# 05 - MCP Apps Grid

Status: verified technical source required before implementation

```mermaid
flowchart LR
  TOOL["MCP Tool Description"] --> URI["_meta.ui.resourceUri"]
  URI --> HOST["Host preloads ui:// resource"]
  HOST --> HTML["HTML / JS / CSS Resource"]
  HTML --> IFRAME["Sandboxed iframe"]
  IFRAME --> RPC["postMessage JSON-RPC"]
  RPC --> CALL["tools/call / ui methods"]
  CALL --> RESULT["Interactive dashboard / form / workflow"]

  subgraph SECURITY["Security Boundary"]
    CSP["CSP allowlist"]
    PERM["Permission request"]
    ISOLATE["No parent DOM / cookie / localStorage access"]
  end

  IFRAME --> SECURITY
```

## Definition Of Done

- UI runs in a sandboxed iframe.
- UI actions use JSON-RPC/tool calls, not direct privileged access.
- No secret or private host data is exposed to the iframe.

