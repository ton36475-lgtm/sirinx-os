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
    await expect(page.locator("#vibeProcessLane")).toContainText("Build Solis Read-Only Connector");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Public Website Control");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Solis Load Balancing");
    await expect(page.locator("#vibeFunctionGrid")).toContainText("Telegram / LINE Bridge");
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
