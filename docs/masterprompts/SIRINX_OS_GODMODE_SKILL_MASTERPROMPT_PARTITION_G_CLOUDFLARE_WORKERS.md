# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_G_CLOUDFLARE_WORKERS.md
**Part G — Cloudflare Workers Deep Integration Layer**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## G.1 Cloudflare Workers Full Function Reference

### Core Capabilities
**Compute@Edge Runtime**
- V8 Isolate-based JavaScript/TypeScript runtime
- Cold start < 5ms (reusable)
- Execution timeout: 30 seconds (paid), 10 seconds (free)
- Memory limit: 128MB - 4GB

**Binding Types**
```
Workers KV:
  - Global eventually-consistent key-value store
  - 1ms reads, automatic edge cache
  - Methods: get, put, delete, list

Durable Objects:
  - Strongly consistent singletons
  - WebSocket support, alarm API
  - Identity: idFromName(), idFromString()

D1 Database:
  - SQLite-compatible serverless database
  - Read replicas at edge
  - Migrations via wrangler

R2 Storage:
  - S3-compatible object storage
  - Direct uploads from Workers

Queues:
  - Async message processing
  - Backpressure handling
  - Producer/consumer pattern

Deno:
  - TypeScript runtime support
  - Standard library available
```

### Workers API Endpoints
```
Fetch API:
  - request, response, headers
  - formData(), json(), text()
  - WebSocketPair()

Environment Variables:
  - env.BINDING_NAME (KV, DO, D1, R2, etc.)
  - Secrets via wrangler secret put

Scheduling:
  - cron triggers in wrangler.toml
  - Alarms in Durable Objects (timestamps)

External APIs:
  - fetch() with 240s timeout
  - TCP sockets (limited)
```

---

## G.2 Workers KV Patterns

### Layer Storage Schema
```typescript
interface KVLayerSchema {
  // Layer 1: Global invariant (permanent cache)
  'prompt:layer1:system_core': string;        // System identity
  'prompt:layer1:tool_schemas': string;       // Tool definitions
  
  // Layer 2: Domain invariant (migration on state change)
  'prompt:layer2:project_blueprints': Record<string, string>;
  
  // Layer 2.5: Rolling summary (compact history)
  'prompt:layer2.5:compacted_summaries': Record<string, string>;
  
  // Layer 3: Session context (active window)
  'session:layer3:conversation:{thread_id}': string;
  
  // Layer 4: Ephemeral (runtime metadata)
  'temp:layer4:{task_id}': string;
  'temp:evidence:{hash}': string;
}
```

### Cache Strategies
- **Prefix matching:** Sort keys alphabetically for deterministic cache
- **TTL management:** Layer 2.5 = 24h, Layer 4 = 1h
- **Compression:** GZIP large prompts > 10KB

---

## G.3 Durable Objects Deep Reference

### StateLocker DO Implementation
```rust
// Rust pseudo-code
impl DurableObject for StateLocker {
    async fn fetch(&self, req: Request) -> Response {
        match req.path() {
            "/acquire" => self.acquire_lock(req).await,
            "/release" => self.release_lock(req).await,
            "/status" => self.lock_status().await,
            "/renew" => self.renew_ttl(req).await,
            "/heartbeat" => self.heartbeat(req).await,
            _ => Response::error("Not found", 404),
        }
    }
}

// Key methods
fn acquire_lock(client_id: String, ttl_ms: u32) -> Result<LockResponse>
fn release_lock(client_id: String) -> Result<()>
fn renew_ttl(client_id: String, ttl_ms: u32) -> Result<()>
```

### Alarms API (for timeouts)
```typescript
// Set alarm
ctx.storage.setAlarm(timestamp);

// Alarm handler
export class MyDO implements DurableObject {
  async alarm() {
    await this.handleTimeout();
  }
}
```

---

## G.4 Workers Safety Patterns

### Error Handling
```typescript
// NEVER use unwrap in request paths
try {
  const result = await someOperation();
  return new Response(JSON.stringify(result));
} catch (err) {
  // Always return structured error
  return new Response(
    JSON.stringify({ error: 'OPERATION_FAILED', detail: err.message }),
    { status: 500 }
  );
}
```

### Rate Limiting (Token Bucket)
```typescript
interface RateLimit {
  tokens: number;
  lastRefill: number;
}

function checkRateLimit(key: string, tokensRequested: number): boolean {
  const state = await env.RATE_LIMIT_KV.get(key);
  const now = Date.now();
  
  if (tokensRequested > state.tokens) return false;
  
  state.tokens -= tokensRequested;
  state.lastRefill = now;
  await env.RATE_LIMIT_KV.put(key, state);
  return true;
}
```

### Idempotency Keys
```typescript
// KV key = idempotency key
const idemKey = request.headers.get('Idempotency-Key');
const cached = await env.KV.get(`idem:${idemKey}`);

if (cached) {
  return new Response(cached); // Return cached result
}

// Proceed with operation, cache result
const result = await processOperation();
await env.KV.put(`idem:${idemKey}`, result, { expirationTtl: 3600 });
```

---

## G.5 Integration Manifest

### Worker Entry Points
```
POST /telegram-webhook    → TelegramTelemetryGateway
POST /execute-task        → LocalExecutionBridge
GET  /api/status          → HealthCheckNode
POST /api/tasks           → TaskSubmissionHandler
GET  /api/tasks/:id       → TaskQueryHandler
POST /api/tasks/:id/approve → ApprovalHandler
GET  /api/metrics         → MetricsEndpoint
POST /api/panic           → EmergencyShutdown
```

### Environment Bindings (wrangler.toml)
```toml
[vars]
LOCAL_NODE_TUNNEL_URL = "https://node.sirinx.internal"

[[kv_namespaces]]
binding = "SIRINX_KV"
id = "..."

[[durable_objects.bindings]]
name = "THE_STATE_LOCKER"
class_name = "StateLockerDo"

[[durable_objects.bindings]]
name = "FEED_HUB"
class_name = "FeedHubDo"

[d1_databases]
binding = "SIRINX_D1"
database_name = "sirinx_governance"
```