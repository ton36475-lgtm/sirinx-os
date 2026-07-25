const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_HOST = "localhost";
const DEFAULT_CORS_ORIGIN = "http://localhost:8710";
const ALLOWED_ORIGINS = new Set([
  DEFAULT_CORS_ORIGIN,
  "http://127.0.0.1:8710"
]);

export function resolveLoopbackHost(requestedHost = DEFAULT_HOST) {
  const normalized = String(requestedHost || DEFAULT_HOST).trim() || DEFAULT_HOST;
  const host = LOOPBACK_HOSTS.has(normalized) ? normalized : DEFAULT_HOST;

  return {
    requestedHost: normalized,
    host,
    hostOverrideBlocked: host !== normalized
  };
}

export function getLatentmasCorsHeaders(origin) {
  const safeOrigin = ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_CORS_ORIGIN;

  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Correlation-Id",
    Vary: "Origin"
  };
}
