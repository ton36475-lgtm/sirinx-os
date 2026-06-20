import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDashboardProject } from "./autoglow-dashboard-core.mjs";
import {
  attachSceneImage,
  createStorePaths,
  initializeDatabase,
  readDatabase,
  removeSceneImage,
  upsertProject
} from "./autoglow-backend-store.mjs";

const tempRoots = [];

async function createTempStore() {
  const root = await mkdtemp(join(tmpdir(), "agm-autoglow-store-"));
  tempRoots.push(root);
  return createStorePaths(root);
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("AGM AUTOGLOW backend store", () => {
  it("initializes a local database and persists the dashboard project", async () => {
    const paths = await createTempStore();
    const seedProject = createDashboardProject();

    await initializeDatabase(paths, seedProject);
    const database = await readDatabase(paths);

    expect(database.schemaVersion).toBe("agm-autoglow.local-db.v1");
    expect(database.projects[seedProject.id].productName).toBe(seedProject.productName);
  });

  it("upserts a project and attaches an image file to a storyboard scene", async () => {
    const paths = await createTempStore();
    const project = createDashboardProject();
    const imageData = Buffer.from("fake-png-image").toString("base64");

    await initializeDatabase(paths, project);
    const updated = await upsertProject(paths, {
      ...project,
      productName: "AGM AUTOGLOW Image Storyboard"
    });
    const result = await attachSceneImage(paths, updated.id, "scene-001", {
      fileName: "hero shot.png",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${imageData}`,
      altText: "Hero product reference"
    });

    expect(result.asset.originalName).toBe("hero shot.png");
    expect(result.asset.mimeType).toBe("image/png");
    expect(result.asset.relativeUrl).toMatch(/^\/uploads\//);
    expect(result.project.scenes[0].attachments).toHaveLength(1);

    const savedFile = await readFile(join(paths.publicRoot, result.asset.relativeUrl));
    expect(savedFile.toString()).toBe("fake-png-image");

    const savedDatabase = await readDatabase(paths);
    expect(savedDatabase.projects[project.id].productName).toBe("AGM AUTOGLOW Image Storyboard");
    expect(savedDatabase.projects[project.id].scenes[0].attachments[0].altText).toBe("Hero product reference");
  });

  it("removes an image attachment from the storyboard and the upload folder", async () => {
    const paths = await createTempStore();
    const project = createDashboardProject();

    await initializeDatabase(paths, project);
    const { asset } = await attachSceneImage(paths, project.id, "scene-001", {
      fileName: "scene-ref.webp",
      mimeType: "image/webp",
      dataUrl: `data:image/webp;base64,${Buffer.from("webp-bytes").toString("base64")}`,
      altText: "Scene reference"
    });
    const removed = await removeSceneImage(paths, project.id, "scene-001", asset.id);

    expect(removed.scenes[0].attachments).toHaveLength(0);
    await expect(stat(join(paths.publicRoot, asset.relativeUrl))).rejects.toThrow();
  });
});
