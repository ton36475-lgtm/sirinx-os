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
    await expect(page.locator("#leadHealthLocal")).toContainText("tRPC batch parser");
    await expect(page.locator("#leadHealthLocal")).toContainText("Lead intake schema");
    await expect(page.locator("#leadHealthLocal")).toContainText("Qualification model");
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
    await expect(page.getByRole("heading", { name: "Local API Events" })).toBeVisible();
    const initialAuditText = await page.locator("#auditList").innerText();
    expect(initialAuditText).toMatch(/No local API audit events recorded yet\.|dry-run \/ dry-run action/);
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
    const leadHealthResponse = await page.request.get("http://127.0.0.1:8711/api/lead-health");
    expect(leadHealthResponse.ok()).toBeTruthy();
    const leadHealth = await leadHealthResponse.json();
    expect(leadHealth.externalWrites).toBe(false);
    expect(leadHealth.productionPostProbeRun).toBe(false);
    expect(leadHealth.local.ok).toBe(true);
    expect(leadHealth.schema.version).toBe("2026-05-19.lead-intake.v1");
    expect(leadHealth.schema.fieldCount).toBeGreaterThan(0);
    expect(leadHealth.schema.contactChannelFields).toEqual(["email", "phone", "lineUserId"]);
    expect(leadHealth.qualificationModel.modelVersion).toBe("2026-05-19.lead-qualification.v1");
    expect(leadHealth.qualificationModel.externalWrites).toBe(false);
    expect(leadHealth.qualificationModel.workflowLane).toBe("sales-engineering-review");
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
    await expect(page.locator("#actionList")).toContainText("Freeze Mac live baseline");
    await expect(page.locator("#executiveStatus")).toHaveText("HQ partial");
    await expect(page.locator("#toolSubdomainList")).toContainText("www.sirinx.co");
    await expect(page.locator("#projectInventoryStatus")).toContainText("0 repos");

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
