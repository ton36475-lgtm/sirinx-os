import {
  createLayeredBuildStatusState,
} from "../../hooks/ghostclaw/use-layered-build-status.mjs";
import {
  createMockLayeredBuildStatusClient,
} from "../../lib/api/ghostclaw/layered-build-status-client.mjs";
import {
  mockLayeredBuildStatusResponse,
} from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";
import {
  createGhostClawLayeredBuildStatusPage,
} from "./layered-build-status-page.mjs";

export const localhostUatStatusResponse = Object.freeze({
  ...mockLayeredBuildStatusResponse,
  current_packet: Object.freeze({
    packet_id: "P11-review-validation",
    layer: "review_validation",
    status: "review_warn",
    active_file_lease: null,
    packet_receipt: ".ghostclaw_runtime/a2a2a/receipts/P11-review-validation.receipt.json",
  }),
  phase_status: Object.freeze({
    backend_domain_schema: "review_pass",
    backend_service_logic: "review_pass",
    api_contract_freeze: "review_pass",
    api_route_handler: "review_pass",
    api_client_wiring: "review_pass",
    frontend_state_hooks: "review_pass",
    frontend_components: "review_pass",
    frontend_pages_one_by_one: "review_pass:ghostclaw-layered-build-status",
    local_uat: "localhost_mount_ready",
    review_validation: "review_warn",
  }),
  next_packet_gate: Object.freeze({
    next_packet_id: "P12-local-commit-gate",
    opened: false,
    reason: "Commit gate remains closed until browser UAT receipt is written.",
  }),
  receipts: Object.freeze([
    Object.freeze({
      packet_id: "P09-layered-build-status-page",
      path: ".ghostclaw_runtime/a2a2a/receipts/P09-layered-build-status-page.receipt.json",
      status: "ready_for_review",
    }),
    Object.freeze({
      packet_id: "P11-review-validation",
      path: ".ghostclaw_runtime/a2a2a/receipts/P11-review-validation.receipt.json",
      status: "WARN",
    }),
  ]),
  updated_at: "2026-06-30T11:49:34Z",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLayeredBuildStatusLocalhostHtml(model) {
  const panel = model.sections[0]?.panel;
  if (!panel) {
    throw new TypeError("Layered build localhost page requires a panel section.");
  }
  const metrics = (panel.metrics || [])
    .map((metric) => `
      <div class="metric" data-uat-metric="${escapeHtml(metric.label)}">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.value)}</strong>
      </div>
    `)
    .join("");

  return `
    <section class="shell" data-uat-page="${escapeHtml(model.page_id)}">
      <div class="header">
        <div>
          <h1>${escapeHtml(model.title)}</h1>
          <p class="summary">${escapeHtml(model.description)}</p>
        </div>
        <div class="status" data-uat-status="${escapeHtml(panel.status)}">${escapeHtml(panel.badge)}</div>
      </div>
      <div class="panel" data-uat-panel="${escapeHtml(panel.component)}">
        <p class="${panel.tone === "danger" ? "summary error" : "summary"}">${escapeHtml(panel.summary)}</p>
        <div class="metrics">${metrics || '<div class="metric"><span>Status</span><strong>No metrics</strong></div>'}</div>
      </div>
    </section>
  `;
}

export async function createLayeredBuildStatusLocalhostModel({
  response = localhostUatStatusResponse,
} = {}) {
  const state = createLayeredBuildStatusState({
    client: createMockLayeredBuildStatusClient(response),
  });
  const page = createGhostClawLayeredBuildStatusPage({
    state,
    title: "GhostClaw Layered Build Status",
    description: "Localhost UAT mount for the strict backend to frontend packet sequence.",
    panelTitle: "Layered Build Gate",
  });
  return page.load();
}

export async function mountLayeredBuildStatusLocalhostPage(root) {
  if (!root) {
    throw new TypeError("Layered build localhost mount requires a root element.");
  }
  const model = await createLayeredBuildStatusLocalhostModel();
  root.innerHTML = renderLayeredBuildStatusLocalhostHtml(model);
  root.dataset.uatMounted = "true";
  root.dataset.uatPageId = model.page_id;
  return model;
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-uat-root='ghostclaw-layered-build-status']");
  mountLayeredBuildStatusLocalhostPage(root).catch((error) => {
    if (root) {
      root.innerHTML = `<p class="error" data-uat-error="mount">${escapeHtml(error.message)}</p>`;
    }
  });
}
