import {
  createLayeredBuildStatusPanel,
  renderLayeredBuildStatusPanelText,
} from "../../components/ghostclaw/layered-build-status-panel.mjs";
import {
  useLayeredBuildStatus,
} from "../../hooks/ghostclaw/use-layered-build-status.mjs";

export const GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID = "ghostclaw-layered-build-status";

function createPageModel({ title, description, panel }) {
  return Object.freeze({
    page_id: GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID,
    component: "GhostClawLayeredBuildStatusPage",
    title,
    description,
    layout: "single-page-command-center",
    sections: Object.freeze([
      Object.freeze({
        id: "layered-build-status",
        component: panel.component,
        panel,
      }),
    ]),
    text_fallback: renderLayeredBuildStatusPanelText(panel),
    page_gate: Object.freeze({
      one_page_at_a_time: true,
      cross_page_editing: false,
    }),
  });
}

export function createGhostClawLayeredBuildStatusPage({
  state = useLayeredBuildStatus(),
  title = "GhostClaw Layered Build Status",
  description = "Local-only view for the MaxPlus GLM-5.2 layered build lock.",
  panelTitle = "Layered Build",
} = {}) {
  function render() {
    const snapshot = state.getSnapshot();
    const panel = createLayeredBuildStatusPanel(snapshot, {
      title: panelTitle,
      actionLabel: "Open next packet",
    });
    return createPageModel({ title, description, panel });
  }

  async function load(query = {}) {
    await state.load(query);
    return render();
  }

  return Object.freeze({
    page_id: GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID,
    render,
    load,
    subscribe: state.subscribe,
  });
}

export function createGhostClawLayeredBuildStatusPageRoute(options = {}) {
  const page = createGhostClawLayeredBuildStatusPage(options);
  return Object.freeze({
    page_id: page.page_id,
    render: page.render,
    load: page.load,
  });
}
