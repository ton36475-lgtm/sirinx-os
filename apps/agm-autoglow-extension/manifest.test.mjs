import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

async function loadManifest() {
  return JSON.parse(await readFile(join(here, "manifest.json"), "utf8"));
}

describe("AGM AUTOGLOW Chrome extension manifest", () => {
  it("uses Manifest V3 with a side panel entry point", async () => {
    const manifest = await loadManifest();

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.side_panel.default_path).toBe("sidepanel.html");
    expect(manifest.background.service_worker).toBe("service-worker.js");
  });

  it("keeps permissions minimal for an assisted workflow", async () => {
    const manifest = await loadManifest();

    expect(manifest.permissions).toEqual(["storage", "sidePanel", "activeTab"]);
    expect(manifest.permissions).not.toContain("debugger");
    expect(manifest.permissions).not.toContain("cookies");
    expect(manifest.permissions).not.toContain("tabs");
  });

  it("limits host access to Google Labs pages only", async () => {
    const manifest = await loadManifest();

    expect(manifest.host_permissions).toEqual(["https://labs.google/*"]);
  });
});
