# ghostclaw-a2a-dispatch

## Purpose

`a2a-dispatch-mcp` is a fail-closed MCP stdio server that exposes one tool, `a2a_send_message`. It dispatches operator-leased, read-only messages to a real agent.

Only Codex has a live backend today. Every other agent name is a stub with `live_send: false` and is refused rather than simulated or reported as a successful dispatch.

Each call requires a valid, one-use execution lease bound to the exact message and canonical workspace.

## Binaries

The crate declares two binaries in `Cargo.toml`:

- `a2a-dispatch-mcp` — the MCP stdio server implemented by `src/bin/mcp_server.rs`. It handles MCP initialization, tool discovery, and calls to `a2a_send_message`.
- `a2a-dispatch-cli` — the direct command-line client implemented by `src/bin/cli.rs`. It performs one dispatch using the same lease validation, workspace restriction, redaction gates, circuit breaker, Codex runner, and receipt log as the MCP server.

## Lease schema

Every dispatch requires a JSON object conforming to `sirinx.a2a.execution_lease.v1`.

| Field | Type | Validation constraint |
|---|---|---|
| `schema` | string | Must equal the literal `sirinx.a2a.execution_lease.v1`. |
| `lease_id` | string | Must be non-empty, at most 80 characters, and contain only ASCII letters, ASCII digits, dashes, or underscores. |
| `issued_by` | string | Must remain non-empty after surrounding whitespace is removed. |
| `target_agent` | string | Must equal `Codex`. The requested agent must also equal Codex, case-insensitively. |
| `message_sha256` | string | Must equal the lowercase SHA-256 hexadecimal digest of the UTF-8 bytes of the exact `message` argument. |
| `issued_at` | string | Must parse as RFC 3339 and must not be more than 30 seconds in the future. |
| `expires_at` | string | Must parse as RFC 3339, must still be in the future, and must be no later than 15 minutes after `issued_at`. |
| `max_calls` | integer | Must equal `1`. |
| `cwd_allowlist` | array of paths | Must contain exactly one path. That path must canonicalize to the exact canonical workspace supplied to the dispatcher. |
| `side_effect_ceiling` | string | Must equal the literal `read_only`. |
| `install` | boolean | Must be `false`. |
| `push` | boolean | Must be `false`. |
| `deploy` | boolean | Must be `false`. |
| `cloud_mutation` | boolean | Must be `false`. |
| `secret_read` | boolean | Must be `false`. |
| `external_message_send` | boolean | Must be `false`. |
| `migration` | boolean | Must be `false`. |
| `physical_control` | boolean | Must be `false`. |

An example lease shape is:

```json
{
  "schema": "sirinx.a2a.execution_lease.v1",
  "lease_id": "example-lease-001",
  "issued_by": "operator",
  "target_agent": "Codex",
  "message_sha256": "<lowercase-sha256>",
  "issued_at": "<rfc3339-time>",
  "expires_at": "<rfc3339-time>",
  "max_calls": 1,
  "cwd_allowlist": ["/path/to/workspace"],
  "side_effect_ceiling": "read_only",
  "install": false,
  "push": false,
  "deploy": false,
  "cloud_mutation": false,
  "secret_read": false,
  "external_message_send": false,
  "migration": false,
  "physical_control": false
}
```

## Lease file lifecycle

The pending lease is read from the path named by `GHOSTCLAW_A2A_LEASE_FILE`.

The file must be a private regular file with mode `0600` and a maximum size of 64 KiB. Symbolic links and files accessible by group or other users are refused.

The lifecycle is:

```text
next.json
  |
  | atomic rename during consume
  v
next.json.claimed.<pid>-<nanos>
  |
  +-- validation failure --> next.json.rejected.<pid>-<nanos>
  |
  +-- validation success --> hard link created as
                             next.json.consumed.<lease_id>
                             then claimed file removed
```

The initial atomic rename ensures that only one concurrent caller can claim the pending lease. A validation failure moves the claimed file to a rejected name.

On success, the implementation creates `next.json.consumed.<lease_id>` using a hard link. Hard-link creation refuses to overwrite an existing consumed lease with the same identifier. After the link succeeds, the claimed file is removed.

The lease is spent as soon as consume succeeds. A later Codex execution failure, timeout, output rejection, or receipt outcome does not restore the pending lease.

## Registering as an MCP server

The server requires three env vars:

- `GHOSTCLAW_A2A_LEASE_FILE`
- `GHOSTCLAW_A2A_WORKSPACE`
- `GHOSTCLAW_RECEIPTS`

<table>
<tr>
<th>Codex <code>config.toml</code></th>
<th>ZCode <code>config.json</code></th>
</tr>
<tr>
<td>

```toml
[mcp_servers.ghostclaw-a2a-dispatch]
command = "/path/to/a2a-dispatch-mcp"
args = []
env = {
  GHOSTCLAW_A2A_LEASE_FILE = "/path/to/next.json",
  GHOSTCLAW_A2A_WORKSPACE = "/path/to/workspace",
  GHOSTCLAW_RECEIPTS = "/path/to/receipts.jsonl"
}
```

</td>
<td>

```json
{
  "mcp": {
    "servers": {
      "ghostclaw-a2a-dispatch": {
        "command": "/path/to/a2a-dispatch-mcp",
        "args": [],
        "env": {
          "GHOSTCLAW_A2A_LEASE_FILE": "/path/to/next.json",
          "GHOSTCLAW_A2A_WORKSPACE": "/path/to/workspace",
          "GHOSTCLAW_RECEIPTS": "/path/to/receipts.jsonl"
        }
      }
    }
  }
}
```

</td>
</tr>
</table>

The Codex example uses an inline env subtable beneath the server header. All paths are placeholders and must be replaced with operator-approved local paths.

## The `a2a_send_message` tool

The MCP tool accepts this input schema:

```json
{
  "type": "object",
  "properties": {
    "agent": {
      "type": "string",
      "description": "Target agent name. Must be Codex."
    },
    "message": {
      "type": "string",
      "description": "The prompt to dispatch."
    }
  },
  "required": ["agent", "message"]
}
```

`agent` must name Codex. `message` is the exact prompt whose UTF-8 digest must match `message_sha256` in the lease.

A successful MCP result contains one text content block. Its text begins with dispatch metadata and is followed by the agent output:

```text
[live_send=true latency_ms=<milliseconds> lease_id=<lease-id> message_sha256=<digest>]
<agent output>
```

Failures return an MCP tool result with `isError: true` and a refusal or dispatch-failure message.

## Receipts

Receipts are appended as JSON Lines at the path named by `GHOSTCLAW_RECEIPTS`.

Each line contains:

| Field | Meaning |
|---|---|
| `seq` | Monotonically increasing receipt sequence. |
| `ts` | Receipt timestamp. |
| `provider` | Always `a2a-dispatch`. |
| `model_id` | For a consumed lease, formatted as `<agent>@lease=<lease_id>@sha256=<message_sha256>`. |
| `pool` | Always `a2a:codex`. |
| `tokens` | Always `0`. |
| `latency_ms` | Dispatch latency in milliseconds. |
| `outcome` | Result category such as `ok`, `denied_redaction`, `unknown_agent`, or `codex_error`. |
| `prev_hash` | Hash of the preceding receipt; the genesis value is 64 zeroes. |
| `hash` | Hash committing the current receipt to the preceding chain state. |

The receipt log is append-only and tamper-evident. Modifying, removing, inserting, or reordering an existing line breaks chain verification.

## Security properties

- **Fail-closed:** A missing, malformed, expired, mismatched, or otherwise invalid lease causes refusal.
- **Read-only ceiling:** `side_effect_ceiling` must be `read_only`, and no separately gated side-effect flag may be true.
- **One-use:** Atomic rename claims the lease before parsing and validation, preventing concurrent reuse.
- **Short TTL:** A lease may expire no later than 15 minutes after its issue time.
- **Tight workspace scope:** The allowlist contains exactly one path, which must canonicalize to the exact selected workspace.
- **Unknown-agent refusal:** Only Codex is live; all other agent names are refused.
- **Egress redaction gate:** Both the outbound message and returned output are scanned for a fixed list of sensitive markers. A match causes refusal.
- **Ephemeral child:** Codex runs with `env_clear`, a small `PATH` allowlist, a read-only sandbox, `--ignore-user-config`, and a five-minute timeout with `kill_on_drop`.

## Worked example

The following session builds both binaries, registers the MCP server, creates a benign message, signs a one-use lease, invokes `a2a_send_message`, and inspects the resulting consumed lease and receipt log.

```console
$ cd /path/to/ghostclaw-os
$ cargo build -p ghostclaw-a2a-dispatch --bin a2a-dispatch-mcp --bin a2a-dispatch-cli

$ mkdir -p /path/to/a2a-state
$ chmod 700 /path/to/a2a-state

$ export GHOSTCLAW_A2A_LEASE_FILE=/path/to/a2a-state/next.json
$ export GHOSTCLAW_A2A_WORKSPACE=/path/to/workspace
$ export GHOSTCLAW_RECEIPTS=/path/to/a2a-state/receipts.jsonl

$ printf '%s' 'Review the workspace in read-only mode and summarize its crate layout.' > /path/to/message.txt

$ python3 - <<'PY'
import datetime
import hashlib
import json
import os
from pathlib import Path

message_path = Path("/path/to/message.txt")
lease_path = Path("/path/to/a2a-state/next.json")
workspace = Path("/path/to/workspace").resolve()

message = message_path.read_text()
issued = datetime.datetime.now(datetime.timezone.utc)
expires = issued + datetime.timedelta(minutes=5)

lease = {
    "schema": "sirinx.a2a.execution_lease.v1",
    "lease_id": "worked-example-001",
    "issued_by": "operator",
    "target_agent": "Codex",
    "message_sha256": hashlib.sha256(message.encode("utf-8")).hexdigest(),
    "issued_at": issued.isoformat(),
    "expires_at": expires.isoformat(),
    "max_calls": 1,
    "cwd_allowlist": [str(workspace)],
    "side_effect_ceiling": "read_only",
    "install": False,
    "push": False,
    "deploy": False,
    "cloud_mutation": False,
    "secret_read": False,
    "external_message_send": False,
    "migration": False,
    "physical_control": False,
}

lease_path.write_text(json.dumps(lease, indent=2) + "\n")
os.chmod(lease_path, 0o600)
PY

$ /path/to/a2a-dispatch-mcp <<'JSONRPC'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"a2a_send_message","arguments":{"agent":"Codex","message":"Review the workspace in read-only mode and summarize its crate layout."}}}
JSONRPC
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"ghostclaw-a2a-dispatch","version":"0.1.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"[live_send=true latency_ms=<milliseconds> lease_id=worked-example-001 message_sha256=<digest>]\n<agent output>"}],"isError":false}}

$ ls -l /path/to/a2a-state/next.json.consumed.worked-example-001
$ tail -n 1 /path/to/a2a-state/receipts.jsonl
```

The direct binary can exercise the same dispatch path without MCP framing:

```console
$ /path/to/a2a-dispatch-cli Codex "$(cat /path/to/message.txt)"
```

A new matching lease is required before that additional call because the preceding lease has already been consumed.

## Crate layout

```text
crates/a2a-dispatch/
├── src/
│   ├── lib.rs
│   ├── lease.rs
│   ├── codex.rs
│   └── bin/
│       ├── mcp_server.rs
│       └── cli.rs
└── Cargo.toml
```

- `src/lib.rs` defines the dispatcher, live Codex lane, circuit-breaker integration, redaction gates, receipt recording, and public result and error types.
- `src/lease.rs` defines the execution-lease schema, exact validation rules, digest calculation, and atomic one-use lifecycle.
- `src/codex.rs` launches the hardened ephemeral Codex child and enforces its workspace, process environment, timeout, and output limits.
- `src/bin/mcp_server.rs` implements the newline-delimited JSON-RPC MCP stdio server and exposes `a2a_send_message`.
- `src/bin/cli.rs` provides a direct one-call command-line interface over the same dispatcher.
- `Cargo.toml` declares the crate dependencies and the `a2a-dispatch-mcp` and `a2a-dispatch-cli` binary targets.
