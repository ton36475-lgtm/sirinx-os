import {
  LAYERED_BUILD_STATUS_HOOK_STATES,
} from "../../hooks/ghostclaw/use-layered-build-status.mjs";

export const LAYERED_BUILD_STATUS_PANEL_VARIANTS = Object.freeze({
  IDLE: "neutral",
  LOADING: "info",
  SUCCESS: "success",
  EMPTY: "muted",
  ERROR: "danger",
});

function asText(value, fallback = "Not available") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new TypeError("Layered build status panel requires a hook snapshot object.");
  }
  if (typeof snapshot.status !== "string") {
    throw new TypeError("Layered build status panel snapshot.status must be a string.");
  }
  return {
    status: snapshot.status,
    view: snapshot.view && typeof snapshot.view === "object" ? snapshot.view : null,
    error: snapshot.error && typeof snapshot.error === "object" ? snapshot.error : null,
    updated_at: snapshot.updated_at ?? null,
  };
}

function createMetric(label, value) {
  return Object.freeze({
    label,
    value: asText(value),
  });
}

function createBasePanel({ title, status, tone, badge, summary, updatedAt }) {
  return {
    component: "LayeredBuildStatusPanel",
    title,
    status,
    tone,
    badge,
    summary,
    updated_at: updatedAt,
    aria_live: status === LAYERED_BUILD_STATUS_HOOK_STATES.ERROR ? "assertive" : "polite",
    metrics: [],
    actions: [],
  };
}

function createSuccessPanel({ title, snapshot, actionLabel }) {
  const view = snapshot.view;
  const panel = createBasePanel({
    title,
    status: LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS,
    tone: LAYERED_BUILD_STATUS_PANEL_VARIANTS.SUCCESS,
    badge: asText(view?.current_status, "success"),
    summary: `${asText(view?.current_packet_id)} is on ${asText(view?.current_layer)}.`,
    updatedAt: snapshot.updated_at,
  });

  panel.metrics = Object.freeze([
    createMetric("Mission", view?.mission_id),
    createMetric("Mode", view?.mode),
    createMetric("Next packet", view?.next_packet_id),
    createMetric("Phases", view?.phase_count ?? 0),
    createMetric("Receipts", view?.receipt_count ?? 0),
    createMetric("Blocked actions", view?.blocked_action_count ?? 0),
  ]);
  panel.actions = Object.freeze([
    Object.freeze({
      label: actionLabel,
      enabled: view?.next_packet_opened === true,
      reason: view?.next_packet_opened === true
        ? "Next packet gate is open."
        : "Next packet gate remains closed.",
    }),
  ]);
  return Object.freeze(panel);
}

export function createLayeredBuildStatusPanel(snapshotInput, options = {}) {
  const snapshot = normalizeSnapshot(snapshotInput);
  const title = asText(options.title, "GhostClaw Layered Build");
  const actionLabel = asText(options.actionLabel, "Continue");

  if (snapshot.status === LAYERED_BUILD_STATUS_HOOK_STATES.LOADING) {
    return Object.freeze(createBasePanel({
      title,
      status: snapshot.status,
      tone: LAYERED_BUILD_STATUS_PANEL_VARIANTS.LOADING,
      badge: "Loading",
      summary: "Reading local layered build status.",
      updatedAt: snapshot.updated_at,
    }));
  }

  if (snapshot.status === LAYERED_BUILD_STATUS_HOOK_STATES.ERROR) {
    const code = asText(snapshot.error?.code, "STATUS_UNAVAILABLE");
    return Object.freeze(createBasePanel({
      title,
      status: snapshot.status,
      tone: LAYERED_BUILD_STATUS_PANEL_VARIANTS.ERROR,
      badge: code,
      summary: asText(snapshot.error?.message, "Layered build status is unavailable."),
      updatedAt: snapshot.updated_at,
    }));
  }

  if (snapshot.status === LAYERED_BUILD_STATUS_HOOK_STATES.EMPTY) {
    return Object.freeze(createBasePanel({
      title,
      status: snapshot.status,
      tone: LAYERED_BUILD_STATUS_PANEL_VARIANTS.EMPTY,
      badge: "Empty",
      summary: "No layered build status entries are available yet.",
      updatedAt: snapshot.updated_at,
    }));
  }

  if (snapshot.status === LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS && snapshot.view) {
    return createSuccessPanel({ title, snapshot, actionLabel });
  }

  return Object.freeze(createBasePanel({
    title,
    status: LAYERED_BUILD_STATUS_HOOK_STATES.IDLE,
    tone: LAYERED_BUILD_STATUS_PANEL_VARIANTS.IDLE,
    badge: "Idle",
    summary: "Layered build status has not loaded yet.",
    updatedAt: snapshot.updated_at,
  }));
}

export function renderLayeredBuildStatusPanelText(panel) {
  if (!panel || typeof panel !== "object") {
    throw new TypeError("Layered build status panel text renderer requires a panel model.");
  }
  const metrics = Array.isArray(panel.metrics) && panel.metrics.length > 0
    ? panel.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(" | ")
    : "No metrics";
  return `${panel.title} [${panel.badge}] ${panel.summary} ${metrics}`;
}
