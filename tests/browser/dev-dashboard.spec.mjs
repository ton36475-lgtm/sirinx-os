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
    await expect(page.getByRole("heading", { name: "Agent Connection" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Executive Live Command View" })).toBeVisible();
    await expect(page.locator("#executiveStatus")).toHaveText(/HQ (live|partial)/);
    await expect(page.locator("#executiveAgents")).toContainText("Hermes Agent Team");
    await expect(page.locator("#executiveProjects")).toContainText("SIRINX developer command center");
    await expect(page.locator("#hermesDashboardState")).toHaveText(/Online|Offline/);
    await expect(page.locator("#hermesGatewayState")).toHaveText(/Running|Stopped/);
    await expect(page.locator("#hermesKanbanState")).toContainText("ready");
    await expect(page.locator("#apiState")).toHaveText("API ok");
    await expect(page.locator("#gateList")).toContainText("Dry-run lock");
    await expect(page.locator("#gateList")).toContainText("Human approval required");
    await expect(page.locator("#actionList")).toContainText("Run dashboard QA checklist");

    await page.getByRole("button", { name: "Dry run" }).first().click();
    await expect(page.locator("#eventLog")).toContainText("simulated_only");
    expect(consoleErrors).toEqual([]);
  });

  test("stays usable at mobile width", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Developer Command Center" })).toBeVisible();
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
    await expect(page.locator("#actionList")).toContainText("Freeze Mac live baseline");
    await expect(page.locator("#executiveStatus")).toHaveText("HQ partial");

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
