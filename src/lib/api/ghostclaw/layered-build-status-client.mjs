import {
  LAYERED_BUILD_ERROR_CODES,
  LAYERED_BUILD_STATUS_ROUTE,
  createLayeredBuildContractError,
  mockLayeredBuildStatusResponse,
  validateLayeredBuildStatusResponse,
} from "../contracts/ghostclaw-layered-build-contract.mjs";

export class LayeredBuildStatusClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LayeredBuildStatusClientError";
    this.details = details;
  }
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function buildQuery({ includeReceipts = false, layer } = {}) {
  const params = new URLSearchParams();
  if (includeReceipts) {
    params.set("include_receipts", "true");
  }
  if (layer) {
    params.set("layer", layer);
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

function buildUrl(baseUrl, query) {
  return `${trimTrailingSlash(baseUrl)}${LAYERED_BUILD_STATUS_ROUTE.path}${buildQuery(query)}`;
}

function assertResponseContract(body) {
  const validation = validateLayeredBuildStatusResponse(body);
  if (!validation.ok) {
    throw new LayeredBuildStatusClientError("Layered build status response violates the frozen contract.", {
      code: LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION,
      issues: validation.issues,
    });
  }
  return body;
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new LayeredBuildStatusClientError("Layered build status response is not valid JSON.", {
      code: LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
      cause: error.message,
    });
  }
}

function normalizeErrorBody(body, status) {
  if (body?.error?.code) {
    return body;
  }
  return createLayeredBuildContractError(
    LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
    "Layered build status request failed.",
    { status },
  );
}

export function createLayeredBuildStatusClient({
  baseUrl = "",
  fetchImpl = globalThis.fetch,
  headers = {},
  allowMockFallback = false,
  mockResponse = mockLayeredBuildStatusResponse,
} = {}) {
  async function getStatus(query = {}) {
    if (typeof fetchImpl !== "function") {
      if (allowMockFallback) {
        return assertResponseContract(mockResponse);
      }
      throw new LayeredBuildStatusClientError("No fetch implementation is available for layered build status.", {
        code: LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
      });
    }

    const response = await fetchImpl(buildUrl(baseUrl, query), {
      method: LAYERED_BUILD_STATUS_ROUTE.method,
      headers: {
        accept: "application/json",
        ...headers,
      },
    });
    const body = await parseJsonResponse(response);

    if (!response.ok) {
      throw new LayeredBuildStatusClientError("Layered build status request returned an error.", {
        status: response.status,
        body: normalizeErrorBody(body, response.status),
      });
    }

    return assertResponseContract(body);
  }

  return Object.freeze({
    route: LAYERED_BUILD_STATUS_ROUTE,
    buildUrl: (query = {}) => buildUrl(baseUrl, query),
    getStatus,
  });
}

export function createMockLayeredBuildStatusClient(response = mockLayeredBuildStatusResponse) {
  const body = assertResponseContract(response);
  return Object.freeze({
    route: LAYERED_BUILD_STATUS_ROUTE,
    buildUrl: () => LAYERED_BUILD_STATUS_ROUTE.path,
    getStatus: async () => body,
  });
}
