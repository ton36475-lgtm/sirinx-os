import { expect, test } from "@playwright/test";

test.describe("Developer Command Center", () => {
  test("loads live dashboard data and dry-run actions", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Developer Command Center" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Process Control Center" })).toBeVisible();
    await expect(page.locator("#vibeStatus")).toHaveText("Dry-run command");
    await expect(page.locator("#vibeRule")).toContainText("Work in order");
    await expect(page.locator("#vibeProcessLane")).toContainText("Freeze Public Website Baseline");
    await expect(page.locator("#vibeProcessLane")).toContainText("Local Lead Qualification Routing");
    await expect(page.locator("#vibeProcessLane")).toContainText("Build Solis Read-Only Connector");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Public Website Control");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Lead Qualification Routing");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Solis Load Balancing");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Telegram / LINE Bridge");
    await expect(page.getByRole("heading", { name: "Vibe Coding Agent" })).toBeVisible();
    await expect(page.locator("#vibeAgentStatus")).toHaveText(/Agent local ready|Agent blocked/);
    await expect(page.locator("#vibeAgentSummary")).toContainText("Safe Actions");
    await expect(page.locator("#vibeAgentSafeActions")).toContainText("Verify Local Workspace");
    await expect(page.locator("#vibeAgentSafeActions")).toContainText("pnpm verify:workspace");
    await expect(page.locator("#vibeAgentBlockedGates")).toContainText("Telegram/LINE Recipient");
    await expect(page.locator("#vibeAgentApprovalPacket")).toContainText("human review");
    await expect(page.getByRole("heading", { name: "Connector Panel" })).toBeVisible();
    await expect(page.locator("#connectorPanelStatus")).toHaveText("Registry local ready");
    await expect(page.locator("#connectorPanelSummary")).toContainText("15");
    await expect(page.locator("#connectorPanelSummary")).toContainText("7");
    await expect(page.locator("#connectorPanelSummary")).toContainText("47");
    await expect(page.locator("#connectorOwnerList")).toContainText("shogun");
    await expect(page.locator("#connectorOwnerList")).toContainText("planner");
    await expect(page.locator("#connectorOwnerList")).toContainText("backend");
    await expect(page.locator("#connectorOwnerList")).toContainText("scribe");
    await expect(page.locator("#connectorOwnerList")).toContainText("qa");
    await expect(page.locator("#connectorOwnerList")).toContainText("devops");
    await expect(page.locator("#connectorOwnerList")).toContainText("security");
    await expect(page.locator("#connectorList")).toContainText("OpenAI Developers");
    await expect(page.locator("#connectorList")).toContainText("Supabase");
    await expect(page.locator("#connectorList")).toContainText("GitHub");
    await expect(page.locator("#connectorList")).toContainText("LOCKED / LOCAL-ONLY");
    await expect(page.locator("#connectorGateList")).toContainText("external_connector_activation");
    await expect(page.locator("#connectorGateList")).toContainText("real_mcp_execution");
    await expect(page.locator("#connectorGateList")).toContainText("telegram_send");
    await expect(page.locator("#connectorGateList")).toContainText("paid_api_call");
    await expect(page.locator("#connectorGateList")).toContainText("secret_read_or_print");
    await expect(page.locator("#connectorStopPoint")).toContainText("WAITING FOR HUMAN APPROVAL");
    await expect(page.locator(".connector-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Agent Launch Gate" })).toBeVisible();
    await expect(page.locator("#agentLaunchStatus")).toHaveText(/Launch gate local ready|local-launch-gate-ready|Launch gate blocked/);
    await expect(page.locator("#agentLaunchSummary")).toContainText("Manual Only");
    await expect(page.locator("#agentLaunchCommandList")).toContainText("Codex");
    await expect(page.locator("#agentLaunchBlockedList")).toContainText("agent_auto_execute");
    await expect(page.getByRole("heading", { name: "Agent Driver" })).toBeVisible();
    await expect(page.locator("#agentDriverStatus")).toHaveText(/Agent driver local ready|agent-driver-ready-local-only|Agent driver blocked/);
    await expect(page.locator("#agentDriverSummary")).toContainText("Passed");
    await expect(page.locator("#agentDriverSummary")).toContainText("Executed");
    await expect(page.locator("#agentDriverLaneList")).toContainText("Codex");
    await expect(page.locator("#agentDriverLaneList")).toContainText("passed");
    await expect(page.locator("#agentDriverLaneList")).toContainText("Hermes Agent");
    await expect(page.locator("#agentDriverLaneList")).toContainText("side_effectful");
    await expect(page.locator("#agentDriverEvidenceList")).toContainText("SIRINX_AGENT_DRIVER_V1.md");
    await expect(page.locator("#agentDriverEvidenceList")).toContainText("dry-run-only");
    await expect(page.locator("#agentDriverBlockedList")).toContainText("file_edit_by_agent");
    await expect(page.locator("#agentDriverBlockedList")).toContainText("mcp_server_start");
    await expect(page.locator("#agentDriverBlockedList")).toContainText("install_packages");
    await expect(page.locator(".agent-driver-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "CenterBrain Hub" })).toBeVisible();
    await expect(page.locator("#centerBrainStatus")).toHaveText(/CenterBrain local ready|centerbrain-hub-ready-local-only|CenterBrain blocked/);
    await expect(page.locator("#centerBrainSummary")).toContainText("AI Nodes");
    await expect(page.locator("#centerBrainSummary")).toContainText("Live Actions");
    await expect(page.locator("#centerBrainNodeList")).toContainText("Codex");
    await expect(page.locator("#centerBrainNodeList")).toContainText("Mac mini");
    await expect(page.locator("#centerBrainNodeList")).toContainText("Mobile phone");
    await expect(page.locator("#centerBrainStackList")).toContainText("Next.js");
    await expect(page.locator("#centerBrainStackList")).toContainText("Tailwind");
    await expect(page.locator("#centerBrainStackList")).toContainText("Go");
    await expect(page.locator("#centerBrainBlockedList")).toContainText("external_connector_activation");
    await expect(page.locator("#centerBrainBlockedList")).toContainText("device_remote_control");
    await expect(page.locator("#centerBrainBlockedList")).toContainText("mobile_push_notification");
    await expect(page.locator(".centerbrain-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hermes Team + Qwen + Antigravity" })).toBeVisible();
    await expect(page.locator("#teamRuntimeStatus")).toHaveText(/Team runtime bridge ready|Team runtime blocked/);
    await expect(page.locator("#teamRuntimeSummary")).toContainText("Cloud Models");
    await expect(page.locator("#teamRuntimeSummary")).toContainText("Paid API Exec");
    await expect(page.locator("#teamRuntimeLaneList")).toContainText("Hermes Agent Team");
    await expect(page.locator("#teamRuntimeLaneList")).toContainText("Antigravity CLI Watch");
    await expect(page.locator("#teamRuntimeModelList")).toContainText("qwen/qwen3.7-max");
    await expect(page.locator("#teamRuntimeModelList")).toContainText("OpenRouter");
    await expect(page.locator("#teamRuntimeBlockedList")).toContainText("openrouter_provider_call");
    await expect(page.locator("#teamRuntimeBlockedList")).toContainText("antigravity_cli_auto_run");
    await expect(page.locator(".team-runtime-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "OpenRouter Qwen Adapter" })).toBeVisible();
    await expect(page.locator("#openRouterQwenAdapterStatus")).toHaveText(/Adapter ready|Adapter blocked/);
    await expect(page.locator("#openRouterQwenAdapterSummary")).toContainText("qwen/qwen3.7-max");
    await expect(page.locator("#openRouterQwenAdapterSummary")).toContainText("qwen/qwen3-max");
    await expect(page.locator("#openRouterQwenAdapterPolicyList")).toContainText("response_format");
    await expect(page.locator("#openRouterQwenAdapterPolicyList")).toContainText("provider.zdr");
    await expect(page.locator("#openRouterQwenAdapterPolicyList")).toContainText("explicit-cache-control");
    await expect(page.locator("#openRouterQwenAdapterBlockedList")).toContainText("openrouter_provider_call");
    await expect(page.locator("#openRouterQwenAdapterBlockedList")).toContainText("provider_credit_spend");
    await expect(page.locator(".openrouter-qwen-adapter-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Model Routing Approval" })).toBeVisible();
    await expect(page.locator("#modelRoutingApprovalStatus")).toHaveText(/Approval ready|Approval blocked/);
    await expect(page.locator("#modelRoutingApprovalSummary")).toContainText("qwen/qwen3.7-max");
    await expect(page.locator("#modelRoutingApprovalSummary")).toContainText("qwen/qwen3-max");
    await expect(page.locator("#modelRoutingApprovalEvidenceList")).toContainText("model_slug_locked");
    await expect(page.locator("#modelRoutingApprovalEvidenceList")).toContainText("one_future_smoke_requires_approval");
    await expect(page.locator("#modelRoutingApprovalBlockedList")).toContainText("openrouter_provider_call");
    await expect(page.locator("#modelRoutingApprovalBlockedList")).toContainText("non_dry_run_model_smoke");
    await expect(page.locator(".model-routing-approval-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hermes Adaptive Command Gateway" })).toBeVisible();
    await expect(page.locator("#adaptiveCommandGatewayStatus")).toHaveText(/Adaptive gateway ready|Gateway blocked/);
    await expect(page.locator("#adaptiveCommandGatewaySummary")).toContainText("Fast ACK");
    await expect(page.locator("#adaptiveCommandGatewayCommandList")).toContainText("/clear");
    await expect(page.locator("#adaptiveCommandGatewayCommandList")).toContainText("/kanban boards switch <slug>");
    await expect(page.locator("#adaptiveCommandGatewayModelList")).toContainText("qwen/qwen3.7-max");
    await expect(page.locator("#adaptiveCommandGatewayModelList")).toContainText("qwen/qwen3.7-max");
    await expect(page.locator("#adaptiveCommandGatewayBlockedList")).toContainText("message_send");
    await expect(page.locator("#adaptiveCommandGatewayBlockedList")).toContainText("provider_call");
    await expect(page.locator(".adaptive-command-gateway-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hermes Spec-First Swarm" })).toBeVisible();
    await expect(page.locator("#specFirstSwarmStatus")).toHaveText(/Spec-first state ready|Spec-first blocked/);
    await expect(page.locator("#specFirstSwarmSummary")).toContainText("APPROVE_IMPLEMENTATION");
    await expect(page.locator("#specFirstSwarmSummary")).toContainText("APPROVAL_GATE");
    await expect(page.locator("#specFirstSwarmFileList")).toContainText(".hermes/context.md");
    await expect(page.locator("#specFirstSwarmFileList")).toContainText("docs/03-technical-spec.md");
    await expect(page.locator("#specFirstSwarmRoleList")).toContainText("Hermes Orchestrator");
    await expect(page.locator("#specFirstSwarmRoleList")).toContainText("Coder Agent");
    await expect(page.locator("#specFirstSwarmBlockedList")).toContainText("write_code_before_approval");
    await expect(page.locator("#specFirstSwarmBlockedList")).toContainText("install_packages");
    await expect(page.locator("#specFirstSwarmBlockedList")).toContainText("paid_api_call");
    await expect(page.locator(".spec-first-swarm-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "RAG / turbovec" })).toBeVisible();
    await expect(page.locator("#localRagStatus")).toHaveText(/RAG local ready|RAG blocked/);
    await expect(page.locator("#localRagSummary")).toContainText("Full Repo");
    await expect(page.locator("#localRagSummary")).toContainText("turbovec");
    await expect(page.locator("#localRagDependencyList")).toContainText("turbovec");
    await expect(page.locator("#localRagCorpusList")).toContainText("full-repo-safe-text");
    await expect(page.locator("#localRagBlockedList")).toContainText("paid_api_call");
    await expect(page.locator("#localRagBlockedList")).toContainText("secret_read_or_print");
    await expect(page.locator("#localRagStopPoint")).toContainText("WAITING FOR HUMAN APPROVAL");
    await expect(page.locator(".local-rag-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Image-to-Image Gateway" })).toBeVisible();
    await expect(page.locator("#imageEditStatus")).toHaveText(/Image edit local ready|Image edit blocked/);
    await expect(page.locator("#imageEditSummary")).toContainText("Required");
    await expect(page.locator("#imageEditSummary")).toContainText("Blocked");
    await expect(page.locator("#imageEditContractList")).toContainText("image_edit");
    await expect(page.locator("#imageEditContractList")).toContainText("prompt");
    await expect(page.locator("#imageEditContractList")).toContainText("image_ref");
    await expect(page.locator("#imageEditAcceptanceList")).toContainText("patch_ready");
    await expect(page.locator("#imageEditAcceptanceList")).toContainText("gateway_restart_required");
    await expect(page.locator("#imageEditAcceptanceList")).toContainText("needs_manual_probe");
    await expect(page.locator("#imageEditAcceptanceList")).toContainText("text_to_image_fallback");
    await expect(page.locator("#imageEditEvidenceList")).toContainText("image_ref_preserved");
    await expect(page.locator("#imageEditEvidenceList")).toContainText("image_edit_selected");
    await expect(page.locator("#imageEditEvidenceList")).toContainText("image_generate_not_selected");
    await expect(page.locator("#imageEditEvidenceList")).toContainText("Human review stays pending");
    await expect(page.locator("#imageEditInvalidList")).toContainText("separate turns");
    await expect(page.locator("#imageEditBlockedList")).toContainText("text_to_image_fallback_when_source_image_exists");
    await expect(page.locator("#imageEditStopPoint")).toContainText("WAITING");
    await expect(page.locator(".image-edit-panel button")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "SOC Truth Protocol" })).toBeVisible();
    await expect(page.locator("#socStatus")).toHaveText(/SOC local ready|SOC blocked/);
    await expect(page.locator("#socSummary")).toContainText("Telegram");
    await expect(page.locator("#socSnapshotList")).toContainText("CPU");
    await expect(page.locator("#socSnapshotList")).toContainText("Memory");
    await expect(page.locator("#socGateList")).toContainText("Telegram delivery");
    await expect(page.locator("#truthRuleList")).toContainText("Telegram delivery");
    await expect(page.locator("#socNextActions")).toContainText("Complete Telegram/LINE");
    await expect(page.getByRole("heading", { name: "Capture Health" })).toBeVisible();
    await expect(page.locator("#leadHealthStatus")).toHaveText(/Local ready|Lead blocked/);
    await expect(page.locator("#leadHealthSummary")).toContainText("Local Handler");
    await expect(page.locator("#leadHealthSummary")).toContainText("Schema");
    await expect(page.locator("#leadHealthSummary")).toContainText("Lead Lane");
    await expect(page.locator("#leadHealthSummary")).toContainText("Traffic");
    await expect(page.locator("#leadHealthSummary")).toContainText("Risk Flags");
    await expect(page.locator("#leadHealthLocal")).toContainText("tRPC batch parser");
    await expect(page.locator("#leadHealthLocal")).toContainText("Lead intake schema");
    await expect(page.locator("#leadHealthLocal")).toContainText("Qualification model");
    await expect(page.locator("#leadHealthLocal")).toContainText("Lead quality reasons");
    await expect(page.locator("#leadHealthLocal")).toContainText("Attribution and risk");
    await expect(page.locator("#leadHealthProduction")).toContainText("Production POST");
    await expect(page.locator("#leadAuditEvent")).toContainText("Lead lane");
    await expect(page.locator("#leadAuditEvent")).toContainText("Risk flags");
    await expect(page.locator("#leadAuditBlocks")).toContainText("crm-write");
    await expect(page.locator("#leadAuditBlocks")).toContainText("production-lead-post");
    await expect(page.locator("#leadAuditEvidence")).toContainText("At least one valid contact channel");
    await expect(page.getByRole("heading", { name: "Sales Artifacts" })).toBeVisible();
    await expect(page.locator("#salesArtifactsStatus")).toHaveText(/Artifacts ready|Artifacts review/);
    await expect(page.locator("#salesArtifactsSummary")).toContainText("Proposal Draft");
    await expect(page.locator("#salesArtifactsList")).toContainText("Residential Solar ESS Proposal Template");
    await expect(page.getByRole("heading", { name: "Assumption Preview" })).toBeVisible();
    await expect(page.locator("#roiPreviewStatus")).toHaveText(/ROI ready|ROI blocked/);
    await expect(page.locator("#roiCaseList")).toContainText("realistic case");
    await expect(page.locator("#roiReviewGates")).toContainText("PEA Smartlist");
    await page.locator("#roiMonthlyBill").fill("8500");
    await page.locator("#roiDaytimeRatio").fill("0.45");
    await page.locator("#roiBackupPriority").selectOption("high");
    await page.locator("#roiPhaseType").selectOption("3-phase");
    await page.getByRole("button", { name: "Calculate Local ROI" }).click();
    await expect(page.locator("#roiPreviewSummary")).toContainText("H-10");
    await expect(page.getByRole("heading", { name: "Draft Preview" })).toBeVisible();
    await expect(page.locator("#proposalDraftStatus")).toHaveText(/Draft ready|Draft blocked/);
    await expect(page.locator("#proposalDraftPreview")).toContainText("Local Proposal Draft Preview");
    await expect(page.locator("#proposalDraftPreview")).toContainText("Equipment Approval Evidence");
    await expect(page.locator("#proposalDraftPreview")).toContainText("Local ROI Planning Preview");
    await expect(page.locator("#proposalDraftWriteButton")).toBeVisible();
    await expect(page.locator("#proposalDraftWriteButton")).toBeEnabled();
    await expect(page.locator("#proposalDraftWriteResult")).toContainText("Proposal Drafts");
    await expect(page.getByRole("heading", { name: "External Send Review" })).toBeVisible();
    await expect(page.locator("#proposalReviewStatus")).toHaveText("Send blocked");
    await expect(page.locator("#proposalReviewSummary")).toContainText("Blocked");
    await expect(page.locator("#proposalReviewList")).toContainText("ROI preview");
    await expect(page.locator("#proposalReviewList")).toContainText("PEA inverter verification");
    await expect(page.locator("#proposalReviewNextActions")).toContainText("Keep CRM writes");
    await expect(page.locator("#proposalReviewWriteButton")).toBeVisible();
    await expect(page.locator("#proposalReviewWriteButton")).toBeEnabled();
    await expect(page.locator("#proposalReviewWriteResult")).toContainText("Proposal Review Packets");
    await expect(page.getByRole("heading", { name: "Mobile Review Packet" })).toBeVisible();
    await expect(page.locator("#mobileReviewStatus")).toHaveText("Mobile packet ready");
    await expect(page.locator("#mobileReviewSummary")).toContainText("Not From Packet");
    await expect(page.locator("#mobileReviewCommandList")).toContainText("Review proposal gate status");
    await expect(page.locator("#mobileReviewWriteButton")).toBeEnabled();
    await expect(page.locator("#mobileReviewWriteResult")).toContainText("Codex Mobile Review Packets");
    await expect(page.getByRole("heading", { name: "Current Pending Work" })).toBeVisible();
    await expect(page.locator("#pendingWorkStatus")).toHaveText("External gates blocked");
    await expect(page.locator("#pendingWorkSummary")).toContainText("Hidden Backlog");
    await expect(page.locator("#pendingWorkSummary")).toContainText("No");
    await expect(page.locator("#pendingWorkList")).toContainText("Part 1: Codex Mobile QR/MFA Pairing");
    await expect(page.locator("#pendingWorkList")).toContainText("Part 2: SIRINX OS GitHub Publish Target");
    await expect(page.getByRole("heading", { name: "Approval Phrase Packets" })).toBeVisible();
    await expect(page.locator("#externalGateStatus")).toHaveText("Packets ready");
    await expect(page.locator("#externalGateSummary")).toContainText("Off");
    await expect(page.locator("#externalGateList")).toContainText("Gate 1: Codex Mobile QR/MFA Pairing");
    await expect(page.locator("#externalGateList")).toContainText("Gate 2: Telegram/LINE Recipient And Token Setup");
    await expect(page.locator("#externalGateList")).toContainText("Gate 3: Solis API Consent And Read-Only Telemetry");
    await expect(page.locator("#externalGateList")).toContainText("Gate 4: Cloudflare Bot Management Official Review");
    await expect(page.locator("#externalGateWriteButton")).toBeEnabled();
    await expect(page.locator("#externalGateWriteResult")).toContainText("External Gate Approval Packets");
    await expect(page.getByRole("heading", { name: "Gate Audit Preflight" })).toBeVisible();
    await expect(page.locator("#externalGatePreflightStatus")).toHaveText("Preflight ready");
    await expect(page.locator("#externalGatePreflightSummary")).toContainText("Off");
    await expect(page.locator("#externalGatePreflightSummary")).toContainText("Manual");
    await expect(page.locator("#externalGatePreflightSummary")).toContainText("Official Review");
    await expect(page.locator("#externalGatePreflightList")).toContainText("Gate 1: Codex Mobile QR/MFA Pairing");
    await expect(page.locator("#externalGatePreflightList")).toContainText("Gate 3: Solis API Consent And Read-Only Telemetry");
    await expect(page.locator("#externalGatePreflightList")).toContainText("blocked-consent-credential-mapping-required");
    await expect(page.locator("#externalGatePreflightWriteButton")).toBeEnabled();
    await expect(page.locator("#externalGatePreflightWriteResult")).toContainText("External Gate Audit Preflight");
    await expect(page.getByRole("heading", { name: "Evidence Readiness" })).toBeVisible();
    await expect(page.locator("#externalGateEvidenceStatus")).toHaveText("Evidence blocked");
    await expect(page.locator("#externalGateEvidenceSummary")).toContainText("Unsafe");
    await expect(page.locator("#externalGateEvidenceList")).toContainText("Codex Mobile QR/MFA Pairing");
    await expect(page.locator("#externalGateEvidenceList")).toContainText("incomplete-evidence");
    await expect(page.getByRole("heading", { name: "Gate Runner Readiness" })).toBeVisible();
    await expect(page.locator("#externalGateRunnerStatus")).toHaveText("Runner blocked");
    await expect(page.locator("#externalGateRunnerSummary")).toContainText("Executable Now");
    await expect(page.locator("#externalGateRunnerList")).toContainText("SIRINX OS GitHub Publish Target");
    await expect(page.locator("#externalGateRunnerList")).toContainText("git remote -v");
    await expect(page.getByRole("heading", { name: "Agent Connection" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Executive Live Command View" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Repo, Subdomain, And Integration Control" })).toBeVisible();
    await expect(page.locator("#executiveStatus")).toHaveText(/HQ (live|partial)/);
    await expect(page.locator("#executiveAgents")).toContainText("Hermes Agent Team");
    await expect(page.locator("#executiveProjects")).toContainText("SIRINX public website management");
    await expect(page.locator("#executiveProjects")).toContainText("www.sirinx.co");
    await expect(page.locator("#executiveProjects")).toContainText("Subdomain integration inventory");
    await expect(page.locator("#executiveProjects")).toContainText("SIRINX developer command center");
    await expect(page.locator("#hermesDashboardState")).toHaveText(/Online|Offline/);
    await expect(page.locator("#hermesGatewayState")).toHaveText(/Running|Stopped/);
    await expect(page.locator("#hermesKanbanState")).toContainText("ready");
    await expect(page.locator("#apiState")).toHaveText("API ok");
    await expect(page.locator("#gateList")).toContainText("Dry-run lock");
    await expect(page.locator("#gateList")).toContainText("Human approval required");
    await expect(page.getByRole("heading", { name: "Kill Switches" })).toBeVisible();
    await expect(page.locator("#switchList")).toContainText("Customer messaging");
    await expect(page.locator("#switchList")).toContainText("off");
    await expect(page.getByRole("heading", { name: "Human Approval Queue" })).toBeVisible();
    await expect(page.locator("#approvalList")).toContainText("Evaluate release preflight");
    await expect(page.locator("#approvalList")).toContainText("Customer message send");
    await expect(page.locator("#approvalList")).toContainText("blocked");
    const approvalEvidenceResponse = await page.request.get("http://127.0.0.1:8711/api/approval-evidence");
    expect(approvalEvidenceResponse.ok()).toBeTruthy();
    const approvalEvidence = await approvalEvidenceResponse.json();
    expect(approvalEvidence.status).toBe("ready-local-approval-evidence");
    expect(approvalEvidence.externalWrites).toBe(false);
    expect(approvalEvidence.summary.items).toBeGreaterThan(0);
    const approvalEvidenceDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/approval-evidence/write", {
      data: { dryRun: true }
    });
    expect(approvalEvidenceDryRunResponse.ok()).toBeTruthy();
    const approvalEvidenceDryRun = await approvalEvidenceDryRunResponse.json();
    expect(approvalEvidenceDryRun.status).toBe("dry-run-ready");
    expect(approvalEvidenceDryRun.didWrite).toBe(false);
    expect(approvalEvidenceDryRun.externalWrites).toBe(false);
    const vibeAgentResponse = await page.request.get("http://127.0.0.1:8711/api/vibe-coding-agent");
    expect(vibeAgentResponse.ok()).toBeTruthy();
    const vibeAgent = await vibeAgentResponse.json();
    expect(vibeAgent.status).toBe("local-agent-ready");
    expect(vibeAgent.externalWrites).toBe(false);
    expect(vibeAgent.canExecuteExternally).toBe(false);
    expect(vibeAgent.canRunMcp).toBe(false);
    expect(vibeAgent.safeActions.some((action) => action.command === "pnpm verify:workspace")).toBe(true);
    expect(vibeAgent.blockedActions).toContain("deploy");
    const gatewayAgentResponse = await page.request.get("http://127.0.0.1:8711/api/gateway-agent");
    expect(gatewayAgentResponse.ok()).toBeTruthy();
    const gatewayAgent = await gatewayAgentResponse.json();
    expect(gatewayAgent.externalWrites).toBe(false);
    expect(gatewayAgent.canRunMcp).toBe(false);
    expect(gatewayAgent.connectorRegistry.summary.connectorsTotal).toBe(15);
    const aiTeamPairingResponse = await page.request.get("http://127.0.0.1:8711/api/ai-team-pairing");
    expect(aiTeamPairingResponse.ok()).toBeTruthy();
    const aiTeamPairing = await aiTeamPairingResponse.json();
    expect(aiTeamPairing.canSendMessages).toBe(false);
    expect(aiTeamPairing.summary.pairedRoles).toBe(47);
    const connectorRegistryResponse = await page.request.get("http://127.0.0.1:8711/api/connector-registry");
    expect(connectorRegistryResponse.ok()).toBeTruthy();
    const connectorRegistry = await connectorRegistryResponse.json();
    expect(connectorRegistry.summary.connectorsTotal).toBe(15);
    expect(connectorRegistry.summary.ownerLanes).toBe(7);
    expect(connectorRegistry.summary.activatableConnectors).toBe(0);
    expect(connectorRegistry.connectors.every((connector) => connector.canActivate === false)).toBe(true);
    expect(connectorRegistry.connectors.every((connector) => connector.canRunMcp === false)).toBe(true);
    const launchGateResponse = await page.request.get("http://127.0.0.1:8711/api/agent-launch-gate");
    expect(launchGateResponse.ok()).toBeTruthy();
    const launchGate = await launchGateResponse.json();
    expect(launchGate.status).toBe("local-launch-gate-ready");
    expect(launchGate.summary.agentsTotal).toBe(9);
    expect(launchGate.summary.autoExecutable).toBe(0);
    expect(launchGate.canLaunchAgents).toBe(false);
    expect(launchGate.canRunMcp).toBe(false);
    expect(launchGate.canReadSecrets).toBe(false);
    expect(launchGate.agents.every((agent) => agent.command.startsWith("ollama launch "))).toBe(true);
    const launchGateDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/agent-launch-gate/plan/dry-run", {
      data: { agentId: "codex-app", goal: "manual smoke only" }
    });
    expect(launchGateDryRunResponse.ok()).toBeTruthy();
    const launchGateDryRun = await launchGateDryRunResponse.json();
    expect(launchGateDryRun.status).toBe("dry-run-agent-launch-plan-ready");
    expect(launchGateDryRun.commandExecuted).toBe(false);
    expect(launchGateDryRun.manualCommand).toBe("ollama launch codex-app");
    const agentDriverResponse = await page.request.get("http://127.0.0.1:8711/api/agent-driver");
    expect(agentDriverResponse.ok()).toBeTruthy();
    const agentDriver = await agentDriverResponse.json();
    expect(agentDriver.status).toBe("agent-driver-ready-local-only");
    expect(agentDriver.summary.agentsTotal).toBe(9);
    expect(agentDriver.summary.commandExecuted).toBe(0);
    expect(agentDriver.nextRecommendedAgent.id).toBe("codex");
    expect(agentDriver.canEditFiles).toBe(false);
    expect(agentDriver.canStartMcp).toBe(false);
    expect(agentDriver.canInstallPackages).toBe(false);
    expect(agentDriver.canSendMessages).toBe(false);
    expect(agentDriver.canDeploy).toBe(false);
    const agentDriverDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/agent-driver/smoke/dry-run", {
      data: { agentId: "codex", goal: "read-only smoke" }
    });
    expect(agentDriverDryRunResponse.ok()).toBeTruthy();
    const agentDriverDryRun = await agentDriverDryRunResponse.json();
    expect(agentDriverDryRun.status).toBe("dry-run-agent-driver-smoke-ready");
    expect(agentDriverDryRun.classification).toBe("passed");
    expect(agentDriverDryRun.commandExecuted).toBe(false);
    expect(agentDriverDryRun.approvedReadOnlyCommand).toContain("--help");
    expect(agentDriverDryRun.nextRecommendedAgent.id).toBe("claude-code");
    const centerBrainResponse = await page.request.get("http://127.0.0.1:8711/api/centerbrain-hub");
    expect(centerBrainResponse.ok()).toBeTruthy();
    const centerBrain = await centerBrainResponse.json();
    expect(centerBrain.status).toBe("centerbrain-hub-ready-local-only");
    expect(centerBrain.summary.aiNodes).toBe(9);
    expect(centerBrain.summary.deviceNodes).toBe(3);
    expect(centerBrain.summary.connectorLanes).toBe(15);
    expect(centerBrain.summary.liveExternalActions).toBe(0);
    expect(centerBrain.canActivateConnectors).toBe(false);
    expect(centerBrain.canRunMcp).toBe(false);
    expect(centerBrain.canSendMessages).toBe(false);
    expect(centerBrain.canDeploy).toBe(false);
    const centerBrainDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/centerbrain-hub/sync/dry-run", {
      data: { requestId: "browser-centerbrain", goal: "local-only adaptive sync", targetDevices: ["mac", "pc", "mobile"] }
    });
    expect(centerBrainDryRunResponse.ok()).toBeTruthy();
    const centerBrainDryRun = await centerBrainDryRunResponse.json();
    expect(centerBrainDryRun.status).toBe("dry-run-centerbrain-sync-ready");
    expect(centerBrainDryRun.syncPlan.devices.map((device) => device.id)).toEqual(["mac", "pc", "mobile"]);
    expect(centerBrainDryRun.canActivateConnectors).toBe(false);
    expect(centerBrainDryRun.canRunMcp).toBe(false);
    const teamRuntimeResponse = await page.request.get("http://127.0.0.1:8711/api/team-runtime-bridge");
    expect(teamRuntimeResponse.ok()).toBeTruthy();
    const teamRuntime = await teamRuntimeResponse.json();
    expect(teamRuntime.status).toBe("team-runtime-bridge-ready-local-only");
    expect(teamRuntime.selectedCloudModelId).toBe("qwen/qwen3.7-max");
    expect(teamRuntime.summary.paidApiExecutable).toBe(0);
    expect(teamRuntime.canCallPaidApi).toBe(false);
    expect(teamRuntime.canRunAntigravityCli).toBe(false);
    expect(teamRuntime.canReadSecrets).toBe(false);
    expect(teamRuntime.openRouterQwenAdapter.primaryModel).toBe("qwen/qwen3.7-max");
    expect(teamRuntime.openRouterQwenAdapter.canCallPaidApi).toBe(false);
    const qwenAdapterResponse = await page.request.get("http://127.0.0.1:8711/api/openrouter-qwen-adapter");
    expect(qwenAdapterResponse.ok()).toBeTruthy();
    const qwenAdapter = await qwenAdapterResponse.json();
    expect(qwenAdapter.status).toBe("openrouter-qwen-adapter-ready-local-only");
    expect(qwenAdapter.providerCalled).toBe(false);
    expect(qwenAdapter.secretsRead).toBe(false);
    expect(qwenAdapter.canCallPaidApi).toBe(false);
    const qwenAdapterDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/openrouter-qwen-adapter/plan/dry-run", {
      data: {
        requestId: "browser-openrouter-qwen",
        goal: "plan Hermes routing with Qwen 3.7 Max",
        mode: "jsonStrict",
        sensitivity: "internal_repo_analysis"
      }
    });
    expect(qwenAdapterDryRunResponse.ok()).toBeTruthy();
    const qwenAdapterDryRun = await qwenAdapterDryRunResponse.json();
    expect(qwenAdapterDryRun.status).toBe("dry-run-openrouter-qwen-adapter-ready");
    expect(qwenAdapterDryRun.providerCalled).toBe(false);
    expect(qwenAdapterDryRun.commandExecuted).toBe(false);
    expect(qwenAdapterDryRun.requestPreview.body.models).toEqual(["qwen/qwen3.7-max", "qwen/qwen3-max"]);
    const modelRoutingApprovalResponse = await page.request.get("http://127.0.0.1:8711/api/model-routing-approval/openrouter-qwen");
    expect(modelRoutingApprovalResponse.ok()).toBeTruthy();
    const modelRoutingApproval = await modelRoutingApprovalResponse.json();
    expect(modelRoutingApproval.status).toBe("openrouter-qwen-model-routing-approval-ready-local-only");
    expect(modelRoutingApproval.modelSlugLocked).toBe("qwen/qwen3.7-max");
    expect(modelRoutingApproval.providerCalled).toBe(false);
    expect(modelRoutingApproval.keyValuePrinted).toBe(false);
    expect(modelRoutingApproval.canCallPaidApi).toBe(false);
    const modelRoutingApprovalDryRunResponse = await page.request.post(
      "http://127.0.0.1:8711/api/model-routing-approval/openrouter-qwen/dry-run",
      {
        data: {
          requestId: "browser-model-routing-approval",
          goal: "prepare one future qwen smoke approval"
        }
      }
    );
    expect(modelRoutingApprovalDryRunResponse.ok()).toBeTruthy();
    const modelRoutingApprovalDryRun = await modelRoutingApprovalDryRunResponse.json();
    expect(modelRoutingApprovalDryRun.status).toBe("dry-run-openrouter-qwen-model-routing-approval-ready");
    expect(modelRoutingApprovalDryRun.providerCalled).toBe(false);
    expect(modelRoutingApprovalDryRun.commandExecuted).toBe(false);
    expect(modelRoutingApprovalDryRun.approvalPacket.path).toBe("docs/approvals/OPENROUTER_QWEN_MODEL_ROUTING_APPROVAL.md");
    const adaptiveGatewayResponse = await page.request.get("http://127.0.0.1:8711/api/hermes-adaptive-command-gateway");
    expect(adaptiveGatewayResponse.ok()).toBeTruthy();
    const adaptiveGateway = await adaptiveGatewayResponse.json();
    expect(adaptiveGateway.status).toBe("hermes-adaptive-command-gateway-ready-local-only");
    expect(adaptiveGateway.aliases.clear).toBe("reset");
    expect(adaptiveGateway.commandRegistry).toContain("/clear");
    expect(adaptiveGateway.modelPolicy.router.model).toBe("qwen/qwen3.7-max");
    expect(adaptiveGateway.modelPolicy.planner.model).toBe("qwen/qwen3.7-max");
    expect(adaptiveGateway.messageSent).toBe(false);
    expect(adaptiveGateway.providerCalled).toBe(false);
    expect(adaptiveGateway.canExecuteAgents).toBe(false);
    const adaptiveGatewayDryRunResponse = await page.request.post(
      "http://127.0.0.1:8711/api/hermes-adaptive-command-gateway/telegram/dry-run",
      {
        data: {
          requestId: "browser-adaptive-gateway",
          source: "telegram",
          command: '/mission route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync pc,mobile --mode adaptive'
        }
      }
    );
    expect(adaptiveGatewayDryRunResponse.ok()).toBeTruthy();
    const adaptiveGatewayDryRun = await adaptiveGatewayDryRunResponse.json();
    expect(adaptiveGatewayDryRun.status).toBe("long_job_queued_dry_run");
    expect(adaptiveGatewayDryRun.ack.shouldRespondImmediately).toBe(true);
    expect(adaptiveGatewayDryRun.job.status).toBe("QUEUED");
    expect(adaptiveGatewayDryRun.mission.status).toBe("WAITING_APPROVAL");
    expect(adaptiveGatewayDryRun.messageSent).toBe(false);
    expect(adaptiveGatewayDryRun.providerCalled).toBe(false);
    expect(adaptiveGatewayDryRun.commandExecuted).toBe(false);
    const specFirstSwarmResponse = await page.request.get("http://127.0.0.1:8711/api/hermes-spec-first-swarm");
    expect(specFirstSwarmResponse.ok()).toBeTruthy();
    const specFirstSwarm = await specFirstSwarmResponse.json();
    expect(specFirstSwarm.status).toBe("hermes-spec-first-swarm-ready-live-local-state");
    expect(specFirstSwarm.currentPhase).toBe("APPROVAL_GATE");
    expect(specFirstSwarm.approvalPhrase).toBe("APPROVE_IMPLEMENTATION");
    expect(specFirstSwarm.canModifySource).toBe(false);
    expect(specFirstSwarm.canInstallPackages).toBe(false);
    expect(specFirstSwarm.canStartMcp).toBe(false);
    expect(specFirstSwarm.canCallProvider).toBe(false);
    const specFirstSwarmDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/hermes-spec-first-swarm/plan/dry-run", {
      data: {
        requestId: "browser-spec-first-swarm",
        goal: "write requirements for a local-only dashboard feature",
        phase: "GRILLING"
      }
    });
    expect(specFirstSwarmDryRunResponse.ok()).toBeTruthy();
    const specFirstSwarmDryRun = await specFirstSwarmDryRunResponse.json();
    expect(specFirstSwarmDryRun.status).toBe("dry-run-hermes-spec-first-swarm-ready");
    expect(specFirstSwarmDryRun.selectedPhase).toBe("GRILLING");
    expect(specFirstSwarmDryRun.commandExecuted).toBe(false);
    expect(specFirstSwarmDryRun.canModifySource).toBe(false);
    const teamRuntimeDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/team-runtime-bridge/plan/dry-run", {
      data: { requestId: "browser-team-runtime", goal: "local-only qwen openrouter bridge", requestedModel: "qwen 3.7 max" }
    });
    expect(teamRuntimeDryRunResponse.ok()).toBeTruthy();
    const teamRuntimeDryRun = await teamRuntimeDryRunResponse.json();
    expect(teamRuntimeDryRun.status).toBe("dry-run-team-runtime-bridge-ready");
    expect(teamRuntimeDryRun.selectedModel.modelId).toBe("qwen/qwen3.7-max");
    expect(teamRuntimeDryRun.providerCalled).toBe(false);
    expect(teamRuntimeDryRun.commandExecuted).toBe(false);
    expect(teamRuntimeDryRun.secretsRead).toBe(false);
    const localRagResponse = await page.request.get("http://127.0.0.1:8711/api/local-rag");
    expect(localRagResponse.ok()).toBeTruthy();
    const localRag = await localRagResponse.json();
    expect(localRag.status).toBe("local-rag-prototype-ready");
    expect(localRag.corpusScope.id).toBe("full-repo-safe-text");
    expect(localRag.canCallPaidApi).toBe(false);
    expect(localRag.canReadSecrets).toBe(false);
    const localRagQueryResponse = await page.request.post("http://127.0.0.1:8711/api/local-rag/query/dry-run", {
      data: { query: "gateway approval evidence", source: "playwright" }
    });
    expect(localRagQueryResponse.ok()).toBeTruthy();
    const localRagQuery = await localRagQueryResponse.json();
    expect(localRagQuery.status).toBe("dry-run-local-rag-query-ready");
    expect(localRagQuery.embeddingBackend).toBe("deterministic-local-fixture");
    expect(localRagQuery.externalWrites).toBe(false);
    expect(localRagQuery.canCallPaidApi).toBe(false);
    const imageEditResponse = await page.request.get("http://127.0.0.1:8711/api/hermes-image-edit");
    expect(imageEditResponse.ok()).toBeTruthy();
    const imageEdit = await imageEditResponse.json();
    expect(imageEdit.status).toBe("ready-local-only");
    expect(imageEdit.image_edit).toBe(true);
    expect(imageEdit.caption_required).toBe(true);
    expect(imageEdit.fallback_text_to_image_blocked).toBe(true);
    expect(imageEdit.canRunMcp).toBe(false);
    expect(imageEdit.canReadSecrets).toBe(false);
    expect(imageEdit.acceptancePacket).toMatchObject({
      patch_ready: true,
      gateway_restart_required: true,
      provider_edit_capability: "needs_manual_probe",
      text_to_image_fallback: "blocked",
      canRestartGateway: false,
      canCallProvider: false
    });
    const imageEditDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/hermes-image-edit/dry-run", {
      data: {
        image_ref: "/tmp/food.png",
        caption: "change only the plate from black to white"
      }
    });
    expect(imageEditDryRunResponse.ok()).toBeTruthy();
    const imageEditDryRun = await imageEditDryRunResponse.json();
    expect(imageEditDryRun.status).toBe("dry-run-image-edit-ready");
    expect(imageEditDryRun.externalWrites).toBe(false);
    expect(imageEditDryRun.hermesInbox.imageEdit.image_ref).toBe("/tmp/food.png");
    expect(imageEditDryRun.hermesInbox.imageEdit.fallback_text_to_image_blocked).toBe(true);
    const acceptanceDryRunResponse = await page.request.post(
      "http://127.0.0.1:8711/api/hermes-image-edit/acceptance/dry-run",
      {
        data: {
          image_ref: "/tmp/food.png",
          caption: "change only the plate from black to white"
        }
      }
    );
    expect(acceptanceDryRunResponse.ok()).toBeTruthy();
    const acceptanceDryRun = await acceptanceDryRunResponse.json();
    expect(acceptanceDryRun.status).toBe("acceptance-dry-run-ready");
    expect(acceptanceDryRun.externalWrites).toBe(false);
    expect(acceptanceDryRun.canRestartGateway).toBe(false);
    expect(acceptanceDryRun.canCallProvider).toBe(false);
    expect(acceptanceDryRun.providerCapabilityCheck.checkedLive).toBe(false);
    expect(acceptanceDryRun.gatewayRestartChecklist.autoRestart).toBe(false);
    expect(acceptanceDryRun.evidence.image_ref_preserved).toBe(true);
    expect(acceptanceDryRun.evidence.image_generate_not_selected).toBe(true);
    const socStatusResponse = await page.request.get("http://127.0.0.1:8711/api/soc/status");
    expect(socStatusResponse.ok()).toBeTruthy();
    const socStatus = await socStatusResponse.json();
    expect(socStatus.externalWrites).toBe(false);
    expect(socStatus.telegram.canSend).toBe(false);
    expect(socStatus.snapshot.cpu).toBeTruthy();
    expect(socStatus.truthStates.cpu).toBe("observed");
    expect(socStatus.telegram.status).toBe("blocked-evidence-incomplete");
    const truthProtocolResponse = await page.request.get("http://127.0.0.1:8711/api/truth-protocol");
    expect(truthProtocolResponse.ok()).toBeTruthy();
    const truthProtocol = await truthProtocolResponse.json();
    expect(truthProtocol.status).toBe("local-truth-protocol-ready");
    expect(truthProtocol.externalWrites).toBe(false);
    expect(truthProtocol.reportRules.some((rule) => rule.id === "telegram-delivery" && rule.requiredState === "observed")).toBe(true);
    await expect(page.getByRole("heading", { name: "Local API Events" })).toBeVisible();
    const initialAuditText = await page.locator("#auditList").innerText();
    expect(initialAuditText).toMatch(/No local API audit events recorded yet\.|dry-run \/ dry-run action|hermes-inbox-dry-run/);
    await expect(page.locator("#actionList")).toContainText("Run dashboard QA checklist");
    await expect(page.locator("#actionList")).toContainText("External adapter smoke");
    await expect(page.locator("#actionList")).toContainText("Prepare subdomain build preflight");
    await expect(page.locator("#actionList")).toContainText("Prepare Solis read-only connector");
    await expect(page.locator("#toolSummary")).toContainText("Main Website");
    await expect(page.locator("#toolSubdomainList")).toContainText("www.sirinx.co");
    await expect(page.locator("#toolSubdomainList")).toContainText("do-not-touch");
    await expect(page.locator("#toolIntegrationList")).toContainText("Telegram");
    await expect(page.locator("#toolBlockerList")).toContainText("telegram-token-rotation");
    await expect(page.locator("#toolRepoList")).toContainText("sirinx");
    await expect(page.locator("#githubIntegrationStatus")).toContainText("12 repos");
    await expect(page.locator("#githubIntegrationSummary")).toContainText("GitHub audit clones");
    await expect(page.locator("#githubIntegrationList")).toContainText("sirinx-solar-energy");
    await expect(page.locator("#githubIntegrationList")).toContainText("oz-corp-omega-dual-node");
    await expect(page.locator("#githubExtractionList")).toContainText("solar-ops-workflow-map");
    await expect(page.locator("#githubExtractionList")).toContainText("agent-runtime-safe-command-map");
    await expect(page.locator("#githubExtractionList")).toContainText("marketing-crm-schema-comparison");
    await expect(page.locator("#githubIntegrationNextActions")).toContainText("bounded extraction tasks");

    await page.getByRole("button", { name: "Dry run" }).first().click();
    await expect(page.locator("#eventLog")).toContainText("simulated_only");
    await expect(page.locator("#auditList")).toContainText("simulated_only");
    await expect(page.locator("#auditList")).toContainText("no external writes");

    const approvalAction = page.locator(".action-row").filter({ hasText: "Evaluate release preflight" });
    await approvalAction.getByRole("button", { name: "Dry run" }).click();
    await expect(page.locator("#eventLog")).toContainText("queued_for_approval");
    await expect(page.locator("#auditList")).toContainText("queued_for_approval");

    const riskyAction = page.locator(".action-row").filter({ hasText: "External adapter smoke" });
    await riskyAction.getByRole("button", { name: "Dry run" }).click();
    await expect(page.locator("#eventLog")).toContainText("blocked_by_kill_switch");
    await expect(page.locator("#auditList")).toContainText("blocked_by_kill_switch");

    const inventoryResponse = await page.request.get("http://127.0.0.1:8711/api/project-inventory");
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventory = await inventoryResponse.json();
    expect(inventory.mainWebsiteProtected).toBe(true);
    expect(inventory.externalWrites).toBe(false);
    expect(inventory.subdomains.some((entry) => entry.host === "www.sirinx.co" && entry.action === "do-not-touch")).toBe(true);
    const githubIntegrationResponse = await page.request.get("http://127.0.0.1:8711/api/github-integration");
    expect(githubIntegrationResponse.ok()).toBeTruthy();
    const githubIntegration = await githubIntegrationResponse.json();
    expect(githubIntegration.status).toBe("inventory-ready");
    expect(githubIntegration.externalWrites).toBe(false);
    expect(githubIntegration.summary.repositories).toBe(12);
    expect(githubIntegration.summary.extractionTasks).toBeGreaterThanOrEqual(7);
    expect(githubIntegration.extractionTasks.some((task) => task.id === "solar-ops-workflow-map" && task.repo === "sirinx-solar-energy")).toBe(true);
    expect(githubIntegration.extractionTasks.some((task) => task.id === "mobile-companion-sensitive-gate" && task.status === "blocked-sensitive-file")).toBe(true);
    expect(githubIntegration.repositories.some((repo) => repo.name === "sirinx" && repo.priority === "P0")).toBe(true);
    expect(githubIntegration.repositories.some((repo) => repo.name === "oz-corp-omega-dual-node" && repo.status === "quarantine-reference")).toBe(true);
    const leadHealthResponse = await page.request.get("http://127.0.0.1:8711/api/lead-health");
    expect(leadHealthResponse.ok()).toBeTruthy();
    const leadHealth = await leadHealthResponse.json();
    expect(leadHealth.externalWrites).toBe(false);
    expect(leadHealth.productionPostProbeRun).toBe(false);
    expect(leadHealth.local.ok).toBe(true);
    expect(leadHealth.schema.version).toBe("2026-05-19.lead-intake.v1");
    expect(leadHealth.schema.fieldCount).toBeGreaterThan(0);
    expect(leadHealth.schema.contactChannelFields).toEqual(["email", "phone", "lineUserId"]);
    expect(leadHealth.qualificationModel.modelVersion).toBe("2026-05-20.lead-qualification.v2");
    expect(leadHealth.qualificationModel.externalWrites).toBe(false);
    expect(leadHealth.qualificationModel.workflowLane).toBe("sales-engineering-review");
    expect(Array.isArray(leadHealth.qualificationModel.reasons)).toBe(true);
    expect(Array.isArray(leadHealth.qualificationModel.riskFlags)).toBe(true);
    const leadAuditResponse = await page.request.get("http://127.0.0.1:8711/api/lead-event-audit");
    expect(leadAuditResponse.ok()).toBeTruthy();
    const leadAudit = await leadAuditResponse.json();
    expect(leadAudit.status).toBe("ready-local-lead-event-audit");
    expect(leadAudit.externalWrites).toBe(false);
    expect(leadAudit.productionPostProbeRun).toBe(false);
    expect(leadAudit.crmWrites).toBe(false);
    expect(leadAudit.supabaseWrites).toBe(false);
    expect(leadAudit.leadEvent.workflowLane).toBe("sales-engineering-review");
    expect(leadAudit.leadEvent.contactEvidence.rawContactValuesStored).toBe(false);
    expect(leadAudit.blockedExternalActions.some((action) => action.id === "crm-write")).toBe(true);
    expect(leadAudit.blockedExternalActions.some((action) => action.id === "production-lead-post")).toBe(true);
    const leadCrmResponse = await page.request.get("http://127.0.0.1:8711/api/lead-crm-contract");
    expect(leadCrmResponse.ok()).toBeTruthy();
    const leadCrm = await leadCrmResponse.json();
    expect(leadCrm.status).toBe("ready-local-lead-crm-contract");
    expect(leadCrm.externalWrites).toBe(false);
    expect(leadCrm.crmWrites).toBe(false);
    expect(leadCrm.supabaseWrites).toBe(false);
    expect(leadCrm.summary.databaseWorkReady).toBe(false);
    expect(leadCrm.sirinxLeadGroups.some((group) => group.id === "audit")).toBe(true);
    const solarOpsResponse = await page.request.get("http://127.0.0.1:8711/api/solar-ops-contract");
    expect(solarOpsResponse.ok()).toBeTruthy();
    const solarOps = await solarOpsResponse.json();
    expect(solarOps.status).toBe("ready-local-solar-ops-contract");
    expect(solarOps.externalWrites).toBe(false);
    expect(solarOps.supabaseWrites).toBe(false);
    expect(solarOps.summary.entities).toBe(8);
    expect(solarOps.entities.some((entity) => entity.id === "installation-project")).toBe(true);
    expect(solarOps.blockedImports.some((item) => item.id === "database-schema-apply")).toBe(true);
    const policyCoreResponse = await page.request.get("http://127.0.0.1:8711/api/policy-core");
    expect(policyCoreResponse.ok()).toBeTruthy();
    const policyCore = await policyCoreResponse.json();
    expect(policyCore.status).toBe("local-policy-engine-ready");
    expect(policyCore.externalWrites).toBe(false);
    expect(policyCore.summary).toMatchObject({
      samples: 5,
      allowed: 1,
      approval_required: 2,
      blocked: 2,
      externalWrites: false
    });
    const hermesInboxResponse = await page.request.post("http://127.0.0.1:8711/api/hermes-inbox/dry-run", {
      data: {
        requestId: "e2e-hermes-inbox",
        source: "codex-local",
        target: { id: "docs/knowledge/SIRINX_PLAN.md" },
        intent: { type: "local-doc-write", summary: "E2E dry-run", rawTextIncluded: false },
        action: {
          id: "e2e-hermes-inbox",
          type: "local-doc-write",
          externalWrite: false
        },
        dryRun: true
      },
      headers: {
        "x-sirinx-source": "codex-local"
      }
    });
    expect(hermesInboxResponse.ok()).toBeTruthy();
    const hermesInbox = await hermesInboxResponse.json();
    expect(hermesInbox.status).toBe("allowed");
    expect(hermesInbox.externalWrites).toBe(false);
    const hermesInboxApprovalResponse = await page.request.post("http://127.0.0.1:8711/api/hermes-inbox/dry-run", {
      data: {
        requestId: "e2e-hermes-inbox-approval",
        source: "codex-local",
        target: { id: "cloudflare:main-router" },
        intent: { type: "cloudflare-deploy", summary: "E2E approval dry-run", rawTextIncluded: false },
        action: {
          id: "e2e-hermes-cloudflare",
          type: "cloudflare-deploy",
          externalWrite: true,
          productionWrite: true
        },
        dryRun: true
      }
    });
    expect(hermesInboxApprovalResponse.status()).toBe(202);
    const hermesInboxApproval = await hermesInboxApprovalResponse.json();
    expect(hermesInboxApproval.status).toBe("approval_required");
    expect(hermesInboxApproval.externalWrites).toBe(false);
    expect(hermesInboxApproval.approvalRequest.status).toBe("pending");
    const approvalQueueAfterInbox = await (await page.request.get("http://127.0.0.1:8711/api/approval-queue")).json();
    expect(approvalQueueAfterInbox.items.some((item) => item.actionId === "e2e-hermes-cloudflare")).toBe(true);
    await expect(page.getByRole("heading", { name: "Policy Dry-Run Preview" })).toBeVisible();
    await expect(page.locator("#hermesInboxStatus")).toContainText("Ready");
    await page.getByRole("button", { name: "Run Local Inbox Dry-Run" }).click();
    await expect(page.locator("#hermesInboxStatus")).toContainText("Allowed local");
    await expect(page.locator("#hermesInboxRunResult")).toContainText("externalWrites=false");
    const salesArtifactsResponse = await page.request.get("http://127.0.0.1:8711/api/sales-artifacts");
    expect(salesArtifactsResponse.ok()).toBeTruthy();
    const salesArtifacts = await salesArtifactsResponse.json();
    expect(salesArtifacts.externalWrites).toBe(false);
    expect(salesArtifacts.status).toBe("ready-local");
    expect(salesArtifacts.proposalDraftReadiness).toBe("ready-local-draft");
    expect(salesArtifacts.items.some((item) => item.id === "proposal-template" && item.ready)).toBe(true);
    const roiPreviewResponse = await page.request.get("http://127.0.0.1:8711/api/roi-preview");
    expect(roiPreviewResponse.ok()).toBeTruthy();
    const roiPreview = await roiPreviewResponse.json();
    expect(roiPreview.status).toBe("ready-local-roi-preview");
    expect(roiPreview.externalWrites).toBe(false);
    expect(roiPreview.customerVisible).toBe(false);
    expect(roiPreview.result.recommendedPackage.id).toBe("H-20");
    expect(roiPreview.result.cases).toHaveLength(3);
    const customRoiPreviewResponse = await page.request.post("http://127.0.0.1:8711/api/roi-preview", {
      data: {
        assumptions: {
          monthly_bill_thb: 8500,
          daytime_load_ratio: 0.45,
          backup_priority: "high",
          phase_type: "3-phase"
        }
      }
    });
    expect(customRoiPreviewResponse.ok()).toBeTruthy();
    const customRoiPreview = await customRoiPreviewResponse.json();
    expect(customRoiPreview.externalWrites).toBe(false);
    expect(customRoiPreview.result.recommendedPackage.id).toBe("H-10");
    expect(customRoiPreview.result.cases.find((item) => item.name === "realistic").estimatedMonthlySavingsThb).toBeGreaterThan(0);
    const proposalDraftResponse = await page.request.get("http://127.0.0.1:8711/api/proposal-draft");
    expect(proposalDraftResponse.ok()).toBeTruthy();
    const proposalDraft = await proposalDraftResponse.json();
    expect(proposalDraft.externalWrites).toBe(false);
    expect(proposalDraft.customerVisible).toBe(false);
    expect(proposalDraft.status).toBe("ready-local-preview");
    expect(proposalDraft.safeWriteTargetRoot).toContain("Proposal Drafts");
    expect(proposalDraft.roiPreview.recommendedPackage).toBe("H-20");
    expect(proposalDraft.roiPreview.externalWrites).toBe(false);
    expect(proposalDraft.draft.markdown).toContain("PEA Smartlist exact inverter verification");
    expect(proposalDraft.draft.markdown).toContain("Local ROI Planning Preview");
    expect(proposalDraft.draft.markdown).toContain("| realistic |");
    const proposalDraftWriteDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/proposal-draft/write", {
      data: { dryRun: true }
    });
    expect(proposalDraftWriteDryRunResponse.ok()).toBeTruthy();
    const proposalDraftWriteDryRun = await proposalDraftWriteDryRunResponse.json();
    expect(proposalDraftWriteDryRun.status).toBe("dry-run-ready");
    expect(proposalDraftWriteDryRun.didWrite).toBe(false);
    expect(proposalDraftWriteDryRun.wouldWrite).toBe(true);
    expect(proposalDraftWriteDryRun.externalWrites).toBe(false);
    expect(proposalDraftWriteDryRun.targetPath).toContain("Proposal Drafts");
    const proposalReviewResponse = await page.request.get("http://127.0.0.1:8711/api/proposal-review");
    expect(proposalReviewResponse.ok()).toBeTruthy();
    const proposalReview = await proposalReviewResponse.json();
    expect(proposalReview.status).toBe("blocked-external-send");
    expect(proposalReview.localWorkflowReady).toBe(true);
    expect(proposalReview.canSendExternally).toBe(false);
    expect(proposalReview.externalWrites).toBe(false);
    expect(proposalReview.items.some((item) => item.id === "roi-preview" && item.complete)).toBe(true);
    expect(proposalReview.items.some((item) => item.id === "pea-inverter-verification" && item.blocksExternalSend)).toBe(true);
    expect(proposalReview.summary.blockingExternalSend).toBeGreaterThan(0);
    expect(proposalReview.reviewPacketTargetRoot).toContain("Proposal Review Packets");
    const proposalReviewWriteDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/proposal-review/write", {
      data: { dryRun: true }
    });
    expect(proposalReviewWriteDryRunResponse.ok()).toBeTruthy();
    const proposalReviewWriteDryRun = await proposalReviewWriteDryRunResponse.json();
    expect(proposalReviewWriteDryRun.status).toBe("dry-run-ready");
    expect(proposalReviewWriteDryRun.didWrite).toBe(false);
    expect(proposalReviewWriteDryRun.wouldWrite).toBe(true);
    expect(proposalReviewWriteDryRun.externalWrites).toBe(false);
    expect(proposalReviewWriteDryRun.targetPath).toContain("Proposal Review Packets");
    const mobileReviewPacketResponse = await page.request.get("http://127.0.0.1:8711/api/mobile-review-packet");
    expect(mobileReviewPacketResponse.ok()).toBeTruthy();
    const mobileReviewPacket = await mobileReviewPacketResponse.json();
    expect(mobileReviewPacket.status).toBe("ready-local-mobile-review");
    expect(mobileReviewPacket.externalWrites).toBe(false);
    expect(mobileReviewPacket.mobileCanApproveExternally).toBe(false);
    expect(mobileReviewPacket.summary.pendingApprovals).toBeGreaterThanOrEqual(1);
    expect(mobileReviewPacket.proposalReview.status).toBe("blocked-external-send");
    const mobileReviewWriteDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/mobile-review-packet/write", {
      data: { dryRun: true }
    });
    expect(mobileReviewWriteDryRunResponse.ok()).toBeTruthy();
    const mobileReviewWriteDryRun = await mobileReviewWriteDryRunResponse.json();
    expect(mobileReviewWriteDryRun.status).toBe("dry-run-ready");
    expect(mobileReviewWriteDryRun.didWrite).toBe(false);
    expect(mobileReviewWriteDryRun.wouldWrite).toBe(true);
    expect(mobileReviewWriteDryRun.externalWrites).toBe(false);
    expect(mobileReviewWriteDryRun.targetPath).toContain("Codex Mobile Review Packets");
    const externalGateResponse = await page.request.get("http://127.0.0.1:8711/api/external-gate-packets");
    expect(externalGateResponse.ok()).toBeTruthy();
    const externalGatePackets = await externalGateResponse.json();
    expect(externalGatePackets.status).toBe("ready-local-packets");
    expect(externalGatePackets.externalWrites).toBe(false);
    expect(externalGatePackets.canExecuteNow).toBe(false);
    expect(externalGatePackets.summary.packets).toBe(4);
    expect(externalGatePackets.packets.some((item) => item.id === "gate-codex-mobile-qr-mfa" && item.approvalPhrase.includes("Set up Codex mobile"))).toBe(true);
    expect(externalGatePackets.packets.some((item) => item.id === "gate-cloudflare-bot-management-review" && item.approvalPhrase.includes("Bot Management"))).toBe(true);
    expect(externalGatePackets.packets.every((item) => item.canExecuteNow === false)).toBe(true);
    const externalGateWriteDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/external-gate-packets/write", {
      data: { dryRun: true }
    });
    expect(externalGateWriteDryRunResponse.ok()).toBeTruthy();
    const externalGateWriteDryRun = await externalGateWriteDryRunResponse.json();
    expect(externalGateWriteDryRun.status).toBe("dry-run-ready");
    expect(externalGateWriteDryRun.didWrite).toBe(false);
    expect(externalGateWriteDryRun.wouldWrite).toBe(true);
    expect(externalGateWriteDryRun.externalWrites).toBe(false);
    expect(externalGateWriteDryRun.targetPath).toContain("External Gate Approval Packets");
    const externalGatePreflightResponse = await page.request.get("http://127.0.0.1:8711/api/external-gate-preflight");
    expect(externalGatePreflightResponse.ok()).toBeTruthy();
    const externalGatePreflight = await externalGatePreflightResponse.json();
    expect(externalGatePreflight.status).toBe("ready-local-preflight");
    expect(externalGatePreflight.externalWrites).toBe(false);
    expect(externalGatePreflight.canExecuteNow).toBe(false);
    expect(externalGatePreflight.summary.entries).toBe(4);
    expect(externalGatePreflight.summary.manualHumanGates).toBe(1);
    expect(externalGatePreflight.summary.optionalOfficialReview).toBe(1);
    expect(externalGatePreflight.summary.canExecuteNow).toBe(0);
    expect(externalGatePreflight.entries.some((item) => item.id === "gate-codex-mobile-qr-mfa" && item.status === "manual-human-gate")).toBe(true);
    expect(externalGatePreflight.entries.some((item) => item.id === "gate-solis-readonly-telemetry" && item.status === "blocked-consent-credential-mapping-required")).toBe(true);
    expect(externalGatePreflight.entries.every((item) => item.canExecuteNow === false && item.externalWrites === false)).toBe(true);
    const externalGatePreflightWriteDryRunResponse = await page.request.post("http://127.0.0.1:8711/api/external-gate-preflight/write", {
      data: { dryRun: true }
    });
    expect(externalGatePreflightWriteDryRunResponse.ok()).toBeTruthy();
    const externalGatePreflightWriteDryRun = await externalGatePreflightWriteDryRunResponse.json();
    expect(externalGatePreflightWriteDryRun.status).toBe("dry-run-ready");
    expect(externalGatePreflightWriteDryRun.didWrite).toBe(false);
    expect(externalGatePreflightWriteDryRun.wouldWrite).toBe(true);
    expect(externalGatePreflightWriteDryRun.externalWrites).toBe(false);
    expect(externalGatePreflightWriteDryRun.targetPath).toContain("External Gate Audit Preflight");
    const externalGateEvidenceResponse = await page.request.get("http://127.0.0.1:8711/api/external-gate-evidence");
    expect(externalGateEvidenceResponse.ok()).toBeTruthy();
    const externalGateEvidence = await externalGateEvidenceResponse.json();
    expect(externalGateEvidence.status).toBe("blocked-evidence-incomplete");
    expect(externalGateEvidence.externalWrites).toBe(false);
    expect(externalGateEvidence.canExecuteExternally).toBe(false);
    expect(externalGateEvidence.summary.gates).toBe(5);
    expect(externalGateEvidence.summary.ready).toBe(0);
    expect(externalGateEvidence.summary.incomplete).toBe(5);
    expect(externalGateEvidence.summary.unsafe).toBe(0);
    const externalGateRunnerResponse = await page.request.get("http://127.0.0.1:8711/api/external-gate-runner");
    expect(externalGateRunnerResponse.ok()).toBeTruthy();
    const externalGateRunner = await externalGateRunnerResponse.json();
    expect(externalGateRunner.status).toBe("blocked-external-execution");
    expect(externalGateRunner.externalWrites).toBe(false);
    expect(externalGateRunner.canExecuteNow).toBe(false);
    expect(externalGateRunner.summary.gates).toBe(5);
    expect(externalGateRunner.summary.executableNow).toBe(0);
    expect(externalGateRunner.runs.some((item) => item.id === "sirinx-os-github-publish" && item.blockedExternalActions.includes("git push"))).toBe(true);
    const pendingWorkResponse = await page.request.get("http://127.0.0.1:8711/api/pending-work");
    expect(pendingWorkResponse.ok()).toBeTruthy();
    const pendingWork = await pendingWorkResponse.json();
    expect(pendingWork.status).toBe("blocked-external-gates");
    expect(pendingWork.externalWrites).toBe(false);
    expect(pendingWork.canExecuteNow).toBe(false);
    expect(pendingWork.summary.pendingItems).toBe(5);
    expect(pendingWork.summary.hiddenBacklog).toBe(false);
    expect(pendingWork.pendingItems.map((item) => item.id).slice(0, 2)).toEqual([
      "codex-mobile-qr-mfa",
      "sirinx-os-github-publish"
    ]);
    expect(consoleErrors).toEqual([]);
  });

  test("stays usable at mobile width", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Developer Command Center" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Process Control Center" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Executive Live Command View" })).toBeVisible();
    await expect(page.locator("#actionList")).toContainText("Run dashboard QA checklist");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("uses safe fallback controls when the API is offline", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/?api=http://127.0.0.1:65535");

    await expect(page.locator("#apiState")).toHaveText("API offline");
    await expect(page.locator("#gateList")).toContainText("Dry-run lock");
    await expect(page.locator("#gateList")).toContainText("Cloud mutation");
    await expect(page.locator("#switchList")).toContainText("Paid API calls");
    await expect(page.locator("#approvalList")).toContainText("Local fallback approval");
    await expect(page.locator("#auditList")).toContainText("api_offline");
    await expect(page.locator("#vibeProcessLane")).toContainText("Control API unavailable");
    await expect(page.locator("#connectorPanelStatus")).toHaveText("Registry blocked");
    await expect(page.locator("#connectorPanelSummary")).toContainText("0");
    await expect(page.locator("#connectorList")).toContainText("Connector registry unavailable");
    await expect(page.locator("#connectorGateList")).toContainText("Start the local control API");
    await expect(page.locator("#leadHealthStatus")).toHaveText("Lead blocked");
    await expect(page.locator("#leadHealthNextActions")).toContainText("Start the local control API");
    await expect(page.locator("#salesArtifactsStatus")).toHaveText("Artifacts review");
    await expect(page.locator("#salesArtifactsNextActions")).toContainText("Start the local control API");
    await expect(page.locator("#roiPreviewStatus")).toHaveText("ROI blocked");
    await expect(page.locator("#roiCaseList")).toContainText("unavailable");
    await expect(page.locator("#roiCalculateButton")).toBeDisabled();
    await expect(page.locator("#proposalDraftStatus")).toHaveText("Draft blocked");
    await expect(page.locator("#proposalDraftPreview")).toContainText("unavailable");
    await expect(page.locator("#proposalDraftWriteButton")).toBeDisabled();
    await expect(page.locator("#proposalDraftWriteResult")).toContainText("waits for draft readiness");
    await expect(page.locator("#proposalReviewStatus")).toHaveText("Send blocked");
    await expect(page.locator("#proposalReviewList")).toContainText("Proposal review unavailable");
    await expect(page.locator("#proposalReviewWriteButton")).toBeDisabled();
    await expect(page.locator("#proposalReviewWriteResult")).toContainText("waits for API readiness");
    await expect(page.locator("#mobileReviewStatus")).toHaveText("Mobile packet blocked");
    await expect(page.locator("#mobileReviewCommandList")).toContainText("Start the local control API");
    await expect(page.locator("#mobileReviewWriteButton")).toBeDisabled();
    await expect(page.locator("#pendingWorkStatus")).toHaveText("Ledger unavailable");
    await expect(page.locator("#pendingWorkList")).toContainText("Pending work ledger unavailable");
    await expect(page.locator("#externalGateStatus")).toHaveText("Packets blocked");
    await expect(page.locator("#externalGateList")).toContainText("External gate packets unavailable");
    await expect(page.locator("#externalGateWriteButton")).toBeDisabled();
    await expect(page.locator("#externalGatePreflightStatus")).toHaveText("Preflight blocked");
    await expect(page.locator("#externalGatePreflightList")).toContainText("External gate preflight unavailable");
    await expect(page.locator("#externalGatePreflightWriteButton")).toBeDisabled();
    await expect(page.locator("#externalGateEvidenceStatus")).toHaveText("Evidence unavailable");
    await expect(page.locator("#externalGateEvidenceList")).toContainText("External gate evidence unavailable");
    await expect(page.locator("#externalGateRunnerStatus")).toHaveText("Runner unavailable");
    await expect(page.locator("#externalGateRunnerList")).toContainText("External gate runner unavailable");
    await expect(page.locator("#actionList")).toContainText("Freeze Mac live baseline");
    await expect(page.locator("#executiveStatus")).toHaveText("HQ partial");
    await expect(page.locator("#toolSubdomainList")).toContainText("www.sirinx.co");
    await expect(page.locator("#projectInventoryStatus")).toContainText("0 repos");
    await expect(page.locator("#githubIntegrationStatus")).toContainText("0 repos");
    await expect(page.locator("#githubIntegrationList")).toContainText("Fallback");
    await expect(page.locator("#githubExtractionList")).toContainText("Fallback");

    await page.getByRole("button", { name: "Dry run" }).first().click();
    await expect(page.locator("#eventLog")).toContainText("dry-run unavailable");
    expect(consoleErrors.filter((message) => !message.includes("ERR_CONNECTION_REFUSED"))).toEqual([]);
  });

  test("does not expose public production endpoints in the dashboard", async ({ page }) => {
    await page.goto("/");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/dev\.sirinx\.co|studio\.sirinx\.co|n8n\.sirinx\.co|grafana\.sirinx\.co/i);

    const externalLinks = await page.locator("a[href]").evaluateAll((links) =>
      links.map((link) => link.href).filter((href) => !href.startsWith("http://127.0.0.1") && !href.startsWith("http://localhost"))
    );
    expect(externalLinks).toEqual([]);
  });
});
