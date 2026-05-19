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
    await expect(page.locator("#externalGateStatus")).toHaveText("Packets blocked");
    await expect(page.locator("#externalGateList")).toContainText("External gate packets unavailable");
    await expect(page.locator("#externalGateWriteButton")).toBeDisabled();
    await expect(page.locator("#externalGatePreflightStatus")).toHaveText("Preflight blocked");
    await expect(page.locator("#externalGatePreflightList")).toContainText("External gate preflight unavailable");
    await expect(page.locator("#externalGatePreflightWriteButton")).toBeDisabled();
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
