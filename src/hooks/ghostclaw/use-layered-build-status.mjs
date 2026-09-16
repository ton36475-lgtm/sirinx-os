import {
  LayeredBuildStatusClientError,
  createLayeredBuildStatusClient,
} from "../../lib/api/ghostclaw/layered-build-status-client.mjs";

export const LAYERED_BUILD_STATUS_HOOK_STATES = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
});

function nowIso() {
  return new Date().toISOString();
}

function freezeSnapshot(snapshot) {
  return Object.freeze({
    status: snapshot.status,
    data: snapshot.data ?? null,
    error: snapshot.error ?? null,
    view: snapshot.view ?? null,
    updated_at: snapshot.updated_at ?? null,
  });
}

function toPublicError(error) {
  if (error instanceof LayeredBuildStatusClientError) {
    return Object.freeze({
      name: error.name,
      message: error.message,
      code: error.details?.code ?? error.details?.body?.error?.code ?? "STATUS_UNAVAILABLE",
      status: error.details?.status ?? null,
    });
  }
  return Object.freeze({
    name: "LayeredBuildStatusHookError",
    message: error?.message || "Layered build status failed.",
    code: "STATUS_UNAVAILABLE",
    status: null,
  });
}

export function createLayeredBuildStatusViewModel(data) {
  if (!data) {
    return null;
  }

  const phaseStatus = data.phase_status || {};
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  const blockedActions = Array.isArray(data.blocked_actions) ? data.blocked_actions : [];

  return Object.freeze({
    mission_id: data.mission_id,
    mode: data.mode,
    current_packet_id: data.current_packet?.packet_id ?? null,
    current_layer: data.current_packet?.layer ?? null,
    current_status: data.current_packet?.status ?? null,
    next_packet_id: data.next_packet_gate?.next_packet_id ?? null,
    next_packet_opened: data.next_packet_gate?.opened === true,
    phase_count: Object.keys(phaseStatus).length,
    receipt_count: receipts.length,
    blocked_action_count: blockedActions.length,
    local_only: data.local_only === true,
  });
}

export function isLayeredBuildStatusEmpty(data) {
  if (!data) {
    return true;
  }
  const phaseCount = Object.keys(data.phase_status || {}).length;
  const receiptCount = Array.isArray(data.receipts) ? data.receipts.length : 0;
  return phaseCount === 0 && receiptCount === 0;
}

export function createLayeredBuildStatusState({
  client = createLayeredBuildStatusClient(),
  initialData = null,
  clock = nowIso,
} = {}) {
  let snapshot = freezeSnapshot({
    status: initialData ? LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS : LAYERED_BUILD_STATUS_HOOK_STATES.IDLE,
    data: initialData,
    view: createLayeredBuildStatusViewModel(initialData),
    updated_at: initialData ? clock() : null,
  });
  const listeners = new Set();

  function emit(nextSnapshot) {
    snapshot = freezeSnapshot(nextSnapshot);
    for (const listener of listeners) {
      listener(snapshot);
    }
    return snapshot;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Layered build status subscriber must be a function.");
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function load(query = {}) {
    emit({
      status: LAYERED_BUILD_STATUS_HOOK_STATES.LOADING,
      data: snapshot.data,
      view: snapshot.view,
      updated_at: clock(),
    });

    try {
      const data = await client.getStatus(query);
      const empty = isLayeredBuildStatusEmpty(data);
      return emit({
        status: empty ? LAYERED_BUILD_STATUS_HOOK_STATES.EMPTY : LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS,
        data,
        view: createLayeredBuildStatusViewModel(data),
        updated_at: clock(),
      });
    } catch (error) {
      return emit({
        status: LAYERED_BUILD_STATUS_HOOK_STATES.ERROR,
        data: snapshot.data,
        view: snapshot.view,
        error: toPublicError(error),
        updated_at: clock(),
      });
    }
  }

  function reset() {
    return emit({
      status: LAYERED_BUILD_STATUS_HOOK_STATES.IDLE,
      data: null,
      view: null,
      updated_at: null,
    });
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    load,
    reset,
    subscribe,
  });
}

export function useLayeredBuildStatus(options = {}) {
  return createLayeredBuildStatusState(options);
}
