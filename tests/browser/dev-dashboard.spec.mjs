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
    await expect(page.locator("#executiveStatus")).toHaveText("HQ live");
    await expect(page.locator("#executiveAgents")).toContainText("Hermes Agent Team");
    await expect(page.locator("#executiveProjects")).toContainText("SIRINX developer command center");
    await expect(page.locator("#hermesDashboardState")).toHaveText("Online");
    await expect(page.locator("#hermesGatewayState")).toHaveText("Running");
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
});
