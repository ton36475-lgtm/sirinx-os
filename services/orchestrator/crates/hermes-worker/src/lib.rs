//! Authenticated, read-only HTTP surface for the Hermes V5 Worker.
//!
//! Request policy is implemented with platform-independent Rust so routing,
//! authorization, and response contracts can be verified on the host. The
//! Workers runtime adapter is compiled only for `wasm32`.

use serde_json::{json, Value};

/// Secret binding containing the bearer token accepted by this Worker.
pub const API_TOKEN_BINDING: &str = "HERMES_API_TOKEN";
/// String binding containing comma-separated owner principals.
pub const OWNER_ALLOWLIST_BINDING: &str = "HERMES_OWNER_ALLOWLIST";
/// Header used to identify the owner principal making a request.
pub const OWNER_HEADER: &str = "X-Hermes-Owner";
/// Header used to propagate a caller-supplied or Worker-generated trace ID.
pub const CORRELATION_HEADER: &str = "X-Correlation-ID";

const MAX_SECRET_BYTES: usize = 512;
const MAX_PRINCIPAL_BYTES: usize = 128;
const MAX_CORRELATION_ID_BYTES: usize = 128;

/// Supported read-only API destinations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Endpoint {
    Health,
    Status,
    Queue,
    Cost,
    Audit,
}

/// A routing failure that can be rendered without platform APIs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouteError {
    MethodNotAllowed,
    NotFound,
}

/// Borrowed request metadata needed by the policy layer.
#[derive(Debug, Clone, Copy)]
pub struct RequestMetadata<'a> {
    pub method: &'a str,
    pub path: &'a str,
    pub authorization: Option<&'a str>,
    pub owner: Option<&'a str>,
    pub correlation_id: &'a str,
}

/// Borrowed runtime authorization configuration.
#[derive(Debug, Clone, Copy)]
pub struct AuthConfig<'a> {
    pub bearer_secret: Option<&'a str>,
    pub owner_allowlist: Option<&'a str>,
}

/// Platform-independent response contract returned by the policy layer.
#[derive(Debug, Clone, PartialEq)]
pub struct ApiResponse {
    status: u16,
    correlation_id: String,
    body: Value,
    allow: Option<&'static str>,
    bearer_challenge: bool,
}

impl ApiResponse {
    /// HTTP status code for the response.
    pub const fn status(&self) -> u16 {
        self.status
    }

    /// Correlation ID included in both the response body and header.
    pub fn correlation_id(&self) -> &str {
        &self.correlation_id
    }

    /// Structured JSON body, exposed for platform adapters and tests.
    pub const fn body(&self) -> &Value {
        &self.body
    }

    /// Value for the HTTP `Allow` header when the method is rejected.
    pub const fn allow(&self) -> Option<&'static str> {
        self.allow
    }

    /// Whether the response must include a bearer authentication challenge.
    pub const fn bearer_challenge(&self) -> bool {
        self.bearer_challenge
    }

    /// Serialize the bounded response contract without panicking.
    pub fn json_body(&self) -> String {
        match serde_json::to_string(&self.body) {
            Ok(body) => body,
            Err(_) => format!(
                "{{\"ok\":false,\"correlation_id\":\"{}\",\"error\":{{\"code\":\"serialization_failure\",\"message\":\"response serialization failed\"}}}}",
                self.correlation_id
            ),
        }
    }

    fn success(correlation_id: &str, data: Value) -> Self {
        Self {
            status: 200,
            correlation_id: correlation_id.to_owned(),
            body: json!({
                "ok": true,
                "correlation_id": correlation_id,
                "data": data,
            }),
            allow: None,
            bearer_challenge: false,
        }
    }

    fn error(status: u16, correlation_id: &str, code: &'static str, message: &'static str) -> Self {
        Self {
            status,
            correlation_id: correlation_id.to_owned(),
            body: json!({
                "ok": false,
                "correlation_id": correlation_id,
                "error": {
                    "code": code,
                    "message": message,
                },
            }),
            allow: None,
            bearer_challenge: false,
        }
    }
}

/// Resolve an exact path and method to a supported read-only endpoint.
pub fn route(method: &str, path: &str) -> Result<Endpoint, RouteError> {
    if method != "GET" {
        return Err(RouteError::MethodNotAllowed);
    }

    match path {
        "/health" => Ok(Endpoint::Health),
        "/api/status" => Ok(Endpoint::Status),
        "/api/queue" => Ok(Endpoint::Queue),
        "/api/cost" => Ok(Endpoint::Cost),
        "/api/audit" => Ok(Endpoint::Audit),
        _ => Err(RouteError::NotFound),
    }
}

/// Choose a safe correlation ID, preferring a valid caller-supplied value.
pub fn normalize_correlation_id(requested: Option<&str>, generated: &str) -> String {
    requested
        .filter(|value| is_valid_correlation_id(value))
        .or_else(|| is_valid_correlation_id(generated).then_some(generated))
        .unwrap_or("correlation-unavailable")
        .to_owned()
}

/// Apply configuration, authentication, authorization, and route policy.
pub fn handle_request(request: RequestMetadata<'_>, auth: AuthConfig<'_>) -> ApiResponse {
    let correlation_id = if is_valid_correlation_id(request.correlation_id) {
        request.correlation_id
    } else {
        "correlation-unavailable"
    };

    let Some(expected_secret) = auth.bearer_secret.filter(|secret| is_usable_secret(secret)) else {
        return ApiResponse::error(
            503,
            correlation_id,
            "auth_configuration_unavailable",
            "runtime authentication is not configured",
        );
    };

    let Some(owner_allowlist) = auth
        .owner_allowlist
        .filter(|allowlist| has_valid_principal(allowlist))
    else {
        return ApiResponse::error(
            503,
            correlation_id,
            "auth_configuration_unavailable",
            "runtime authentication is not configured",
        );
    };

    let Some(provided_secret) = request.authorization.and_then(parse_bearer) else {
        let mut response = ApiResponse::error(
            401,
            correlation_id,
            "unauthorized",
            "bearer authentication is required",
        );
        response.bearer_challenge = true;
        return response;
    };

    if !fixed_time_secret_eq(provided_secret, expected_secret) {
        let mut response = ApiResponse::error(
            401,
            correlation_id,
            "unauthorized",
            "bearer authentication is required",
        );
        response.bearer_challenge = true;
        return response;
    }

    let Some(owner) = request.owner.filter(|owner| is_valid_principal(owner)) else {
        return ApiResponse::error(
            403,
            correlation_id,
            "owner_forbidden",
            "owner is not permitted",
        );
    };

    if !owner_is_allowed(owner, owner_allowlist) {
        return ApiResponse::error(
            403,
            correlation_id,
            "owner_forbidden",
            "owner is not permitted",
        );
    }

    match route(request.method, request.path) {
        Ok(endpoint) => ApiResponse::success(correlation_id, endpoint_payload(endpoint)),
        Err(RouteError::MethodNotAllowed) => {
            let mut response = ApiResponse::error(
                405,
                correlation_id,
                "method_not_allowed",
                "only GET is supported",
            );
            response.allow = Some("GET");
            response
        }
        Err(RouteError::NotFound) => {
            ApiResponse::error(404, correlation_id, "not_found", "endpoint not found")
        }
    }
}

fn endpoint_payload(endpoint: Endpoint) -> Value {
    match endpoint {
        Endpoint::Health => json!({
            "service": "hermes-v5-worker",
            "status": "healthy",
            "mode": "read_only",
            "version": env!("CARGO_PKG_VERSION"),
        }),
        Endpoint::Status => json!({
            "service": "hermes-v5-worker",
            "status": "ready",
            "mode": "read_only",
            "version": env!("CARGO_PKG_VERSION"),
        }),
        Endpoint::Queue => json!({
            "available": false,
            "tasks": [],
            "count": 0,
            "source": "queue_binding_not_configured",
            "writable": false,
        }),
        Endpoint::Cost => json!({
            "available": false,
            "currency": "THB",
            "source": "cost_provider_not_configured",
        }),
        Endpoint::Audit => json!({
            "available": false,
            "entries": [],
            "count": 0,
            "source": "audit_binding_not_configured",
            "writable": false,
        }),
    }
}

fn parse_bearer(value: &str) -> Option<&str> {
    let (scheme, secret) = value.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("Bearer") || !is_usable_secret(secret) {
        return None;
    }
    Some(secret)
}

fn is_usable_secret(secret: &str) -> bool {
    !secret.is_empty()
        && secret.len() <= MAX_SECRET_BYTES
        && secret.bytes().all(|byte| byte.is_ascii_graphic())
}

fn fixed_time_secret_eq(left: &str, right: &str) -> bool {
    if left.len() > MAX_SECRET_BYTES || right.len() > MAX_SECRET_BYTES {
        return false;
    }

    let left = left.as_bytes();
    let right = right.as_bytes();
    let mut difference = left.len() ^ right.len();

    // Both sides are scanned to a fixed public upper bound, avoiding an
    // early exit based on a matching prefix or the configured secret length.
    for index in 0..MAX_SECRET_BYTES {
        let left_byte = left.get(index).copied().unwrap_or_default();
        let right_byte = right.get(index).copied().unwrap_or_default();
        difference |= usize::from(left_byte ^ right_byte);
    }

    difference == 0
}

fn has_valid_principal(allowlist: &str) -> bool {
    allowlist.split(',').map(str::trim).any(is_valid_principal)
}

fn owner_is_allowed(owner: &str, allowlist: &str) -> bool {
    allowlist
        .split(',')
        .map(str::trim)
        .filter(|candidate| is_valid_principal(candidate))
        .any(|candidate| candidate == owner)
}

fn is_valid_principal(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_PRINCIPAL_BYTES
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':' | b'@' | b'+')
        })
}

fn is_valid_correlation_id(value: &str) -> bool {
    (8..=MAX_CORRELATION_ID_BYTES).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
}

#[cfg(target_arch = "wasm32")]
mod runtime {
    use worker::wasm_bindgen::{self, prelude::wasm_bindgen};
    use worker::{event, Context, Env, Headers, Request, Response, Result};

    use super::{
        handle_request, normalize_correlation_id, ApiResponse, AuthConfig, RequestMetadata,
        API_TOKEN_BINDING, CORRELATION_HEADER, OWNER_ALLOWLIST_BINDING, OWNER_HEADER,
    };

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = ["globalThis", "crypto"], js_name = randomUUID)]
        fn crypto_random_uuid() -> String;
    }

    #[event(fetch)]
    pub async fn fetch(request: Request, env: Env, _context: Context) -> Result<Response> {
        let requested_correlation = read_header(&request, CORRELATION_HEADER);
        let generated_correlation = crypto_random_uuid();
        let correlation_id =
            normalize_correlation_id(requested_correlation.as_deref(), &generated_correlation);

        let bearer_secret = env
            .secret(API_TOKEN_BINDING)
            .ok()
            .map(|secret| secret.to_string());
        let owner_allowlist = env
            .var(OWNER_ALLOWLIST_BINDING)
            .ok()
            .map(|allowlist| allowlist.to_string());
        let authorization = read_header(&request, "Authorization");
        let owner = read_header(&request, OWNER_HEADER);
        let method = request.method();
        let path = request.path();

        let response = handle_request(
            RequestMetadata {
                method: method.as_ref(),
                path: &path,
                authorization: authorization.as_deref(),
                owner: owner.as_deref(),
                correlation_id: &correlation_id,
            },
            AuthConfig {
                bearer_secret: bearer_secret.as_deref(),
                owner_allowlist: owner_allowlist.as_deref(),
            },
        );

        into_worker_response(response)
    }

    fn read_header(request: &Request, name: &str) -> Option<String> {
        request.headers().get(name).ok().flatten()
    }

    fn into_worker_response(response: ApiResponse) -> Result<Response> {
        let mut headers = Headers::new();
        headers.set("Content-Type", "application/json; charset=utf-8")?;
        headers.set("Cache-Control", "no-store")?;
        headers.set("X-Content-Type-Options", "nosniff")?;
        headers.set(CORRELATION_HEADER, response.correlation_id())?;

        if let Some(allow) = response.allow() {
            headers.set("Allow", allow)?;
        }
        if response.bearer_challenge() {
            headers.set("WWW-Authenticate", "Bearer")?;
        }

        Ok(Response::builder()
            .with_status(response.status())
            .with_headers(headers)
            .fixed(response.json_body().into_bytes()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "test-token-with-sufficient-entropy-123456";
    const OWNER: &str = "sirinx-owner";
    const CORRELATION_ID: &str = "corr-12345678";

    fn valid_auth() -> AuthConfig<'static> {
        AuthConfig {
            bearer_secret: Some(TOKEN),
            owner_allowlist: Some("platform-admin,sirinx-owner"),
        }
    }

    fn request(path: &str) -> RequestMetadata<'_> {
        RequestMetadata {
            method: "GET",
            path,
            authorization: Some(concat!(
                "Bearer ",
                "test-token-with-sufficient-entropy-123456"
            )),
            owner: Some(OWNER),
            correlation_id: CORRELATION_ID,
        }
    }

    #[test]
    fn route_should_resolve_every_documented_endpoint() {
        let routes = [
            ("/health", Endpoint::Health),
            ("/api/status", Endpoint::Status),
            ("/api/queue", Endpoint::Queue),
            ("/api/cost", Endpoint::Cost),
            ("/api/audit", Endpoint::Audit),
        ];

        for (path, expected) in routes {
            assert_eq!(route("GET", path), Ok(expected));
        }
    }

    #[test]
    fn route_should_reject_non_get_methods() {
        for method in ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] {
            for path in [
                "/health",
                "/api/status",
                "/api/queue",
                "/api/cost",
                "/api/audit",
            ] {
                assert_eq!(route(method, path), Err(RouteError::MethodNotAllowed));
            }
        }
    }

    #[test]
    fn route_should_reject_unknown_paths() {
        assert_eq!(route("GET", "/api/unknown"), Err(RouteError::NotFound));
    }

    #[test]
    fn request_should_fail_closed_when_secret_binding_is_missing() {
        let response = handle_request(
            request("/health"),
            AuthConfig {
                bearer_secret: None,
                owner_allowlist: Some(OWNER),
            },
        );

        assert_eq!(response.status(), 503);
        assert_eq!(
            response.body()["error"]["code"],
            "auth_configuration_unavailable"
        );
    }

    #[test]
    fn request_should_fail_closed_when_owner_allowlist_is_missing() {
        let response = handle_request(
            request("/health"),
            AuthConfig {
                bearer_secret: Some(TOKEN),
                owner_allowlist: None,
            },
        );

        assert_eq!(response.status(), 503);
    }

    #[test]
    fn request_should_challenge_when_bearer_header_is_missing() {
        let mut metadata = request("/health");
        metadata.authorization = None;

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.status(), 401);
        assert!(response.bearer_challenge());
    }

    #[test]
    fn every_api_endpoint_should_require_bearer_authentication() {
        for path in ["/api/status", "/api/queue", "/api/cost", "/api/audit"] {
            let mut metadata = request(path);
            metadata.authorization = None;

            let response = handle_request(metadata, valid_auth());

            assert_eq!(response.status(), 401);
        }
    }

    #[test]
    fn every_api_endpoint_should_require_an_allowed_owner() {
        for path in ["/api/status", "/api/queue", "/api/cost", "/api/audit"] {
            let mut metadata = request(path);
            metadata.owner = Some("unlisted-owner");

            let response = handle_request(metadata, valid_auth());

            assert_eq!(response.status(), 403);
        }
    }

    #[test]
    fn request_should_reject_malformed_bearer_scheme() {
        let mut metadata = request("/health");
        metadata.authorization = Some("Basic dGVzdA==");

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.status(), 401);
    }

    #[test]
    fn request_should_reject_an_incorrect_bearer_secret_without_leaking_it() {
        let mut metadata = request("/health");
        metadata.authorization = Some("Bearer attacker-provided-secret");

        let response = handle_request(metadata, valid_auth());
        let body = response.json_body();

        assert_eq!(response.status(), 401);
        assert!(!body.contains("attacker-provided-secret"));
        assert!(!body.contains(TOKEN));
    }

    #[test]
    fn request_should_reject_a_missing_owner() {
        let mut metadata = request("/health");
        metadata.owner = None;

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.status(), 403);
    }

    #[test]
    fn request_should_reject_an_owner_outside_the_allowlist() {
        let mut metadata = request("/health");
        metadata.owner = Some("unknown-owner");

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.status(), 403);
    }

    #[test]
    fn authorized_request_should_return_the_success_contract() {
        let response = handle_request(request("/api/status"), valid_auth());

        assert_eq!(response.status(), 200);
        assert_eq!(response.body()["ok"], true);
        assert_eq!(response.body()["correlation_id"], CORRELATION_ID);
        assert_eq!(response.body()["data"]["mode"], "read_only");
    }

    #[test]
    fn authenticated_non_get_request_should_return_allow_header() {
        let mut metadata = request("/api/status");
        metadata.method = "DELETE";

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.status(), 405);
        assert_eq!(response.allow(), Some("GET"));
    }

    #[test]
    fn authenticated_unknown_path_should_return_json_error_contract() {
        let response = handle_request(request("/not-found"), valid_auth());

        assert_eq!(response.status(), 404);
        assert_eq!(response.body()["ok"], false);
        assert_eq!(response.body()["error"]["code"], "not_found");
        assert_eq!(response.body()["correlation_id"], CORRELATION_ID);
    }

    #[test]
    fn correlation_id_should_prefer_a_valid_incoming_value() {
        assert_eq!(
            normalize_correlation_id(Some("incoming-1234"), "generated-1234"),
            "incoming-1234"
        );
    }

    #[test]
    fn correlation_id_should_replace_an_invalid_incoming_value() {
        assert_eq!(
            normalize_correlation_id(Some("bad\nheader"), "generated-1234"),
            "generated-1234"
        );
    }

    #[test]
    fn response_should_fail_safe_when_policy_receives_an_invalid_correlation_id() {
        let mut metadata = request("/health");
        metadata.correlation_id = "bad\nheader";

        let response = handle_request(metadata, valid_auth());

        assert_eq!(response.correlation_id(), "correlation-unavailable");
        assert_eq!(response.body()["correlation_id"], "correlation-unavailable");
    }

    #[test]
    fn queue_cost_and_audit_should_report_unconfigured_sources_truthfully() {
        for path in ["/api/queue", "/api/cost", "/api/audit"] {
            let response = handle_request(request(path), valid_auth());
            assert_eq!(response.body()["data"]["available"], false);
        }
    }

    #[test]
    fn fixed_time_secret_comparison_should_require_exact_bytes() {
        assert!(fixed_time_secret_eq(TOKEN, TOKEN));
        assert!(!fixed_time_secret_eq(TOKEN, "different"));
        assert!(!fixed_time_secret_eq(TOKEN, "test-token"));
    }
}
