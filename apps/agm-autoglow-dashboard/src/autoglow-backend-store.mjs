import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DATABASE_SCHEMA_VERSION = "agm-autoglow.local-db.v1";

const DEFAULT_DATA_ROOT = fileURLToPath(new URL("../data/", import.meta.url));
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function createStorePaths(root = DEFAULT_DATA_ROOT) {
  return {
    root,
    databasePath: join(root, "autoglow-db.json"),
    uploadsDir: join(root, "uploads"),
    publicRoot: root
  };
}

export async function initializeDatabase(paths = createStorePaths(), seedProject) {
  await mkdir(paths.uploadsDir, { recursive: true });
  await mkdir(dirname(paths.databasePath), { recursive: true });

  const existing = await readDatabase(paths).catch(() => null);
  if (existing) {
    return existing;
  }

  const database = createEmptyDatabase();
  if (seedProject) {
    database.projects[seedProject.id] = normalizeProject(seedProject);
  }
  await writeDatabase(paths, database);
  return database;
}

export async function readDatabase(paths = createStorePaths()) {
  const raw = await readFile(paths.databasePath, "utf8");
  const database = JSON.parse(raw);
  return normalizeDatabase(database);
}

export async function writeDatabase(paths = createStorePaths(), database) {
  const normalized = normalizeDatabase(database);
  normalized.updatedAt = new Date().toISOString();
  await mkdir(dirname(paths.databasePath), { recursive: true });
  await writeFile(paths.databasePath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export async function getPrimaryProject(paths = createStorePaths(), seedProject) {
  const database = await initializeDatabase(paths, seedProject);
  const firstProject = Object.values(database.projects)[0];
  if (firstProject) {
    return firstProject;
  }

  if (!seedProject) {
    throw new Error("project_not_found");
  }
  return upsertProject(paths, seedProject);
}

export async function upsertProject(paths = createStorePaths(), project) {
  if (!project?.id) {
    throw new Error("project_id_required");
  }

  const database = await initializeDatabase(paths, project);
  const normalizedProject = normalizeProject(project);
  database.projects[normalizedProject.id] = normalizedProject;
  await writeDatabase(paths, database);
  return normalizedProject;
}

export async function attachSceneImage(paths = createStorePaths(), projectId, sceneId, input) {
  const database = await initializeDatabase(paths);
  const project = database.projects[projectId];
  if (!project) {
    throw new Error("project_not_found");
  }

  const scene = project.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    throw new Error("scene_not_found");
  }

  const file = decodeImageInput(input);
  const assetId = `img-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const safeName = sanitizeFileName(input.fileName || `scene-${scene.sceneNo}${file.extension}`);
  const storedName = `${scene.id}-${assetId}-${safeName}`;
  const absolutePath = join(paths.uploadsDir, storedName);
  await mkdir(paths.uploadsDir, { recursive: true });
  await writeFile(absolutePath, file.buffer);

  const asset = {
    id: assetId,
    type: "storyboard_image",
    originalName: input.fileName || safeName,
    fileName: storedName,
    mimeType: file.mimeType,
    relativeUrl: `/uploads/${storedName}`,
    altText: String(input.altText || "").trim(),
    sizeBytes: file.buffer.byteLength,
    createdAt: new Date().toISOString()
  };

  scene.attachments = [...(scene.attachments || []), asset];
  project.updatedAt = new Date().toISOString();
  await writeDatabase(paths, database);

  return {
    asset,
    project: normalizeProject(project)
  };
}

export async function removeSceneImage(paths = createStorePaths(), projectId, sceneId, assetId) {
  const database = await initializeDatabase(paths);
  const project = database.projects[projectId];
  if (!project) {
    throw new Error("project_not_found");
  }

  const scene = project.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    throw new Error("scene_not_found");
  }

  const asset = (scene.attachments || []).find((item) => item.id === assetId);
  scene.attachments = (scene.attachments || []).filter((item) => item.id !== assetId);
  project.updatedAt = new Date().toISOString();
  await writeDatabase(paths, database);

  if (asset?.relativeUrl?.startsWith("/uploads/")) {
    await rm(join(paths.publicRoot, asset.relativeUrl), { force: true });
  }

  return normalizeProject(project);
}

function createEmptyDatabase() {
  return {
    schemaVersion: DATABASE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    projects: {}
  };
}

function normalizeDatabase(database) {
  const next = {
    schemaVersion: database?.schemaVersion || DATABASE_SCHEMA_VERSION,
    updatedAt: database?.updatedAt || new Date().toISOString(),
    projects: {}
  };

  for (const [projectId, project] of Object.entries(database?.projects || {})) {
    next.projects[projectId] = normalizeProject(project);
  }

  return next;
}

function normalizeProject(project) {
  return {
    ...project,
    scenes: (project.scenes || []).map((scene) => ({
      ...scene,
      attachments: Array.isArray(scene.attachments) ? scene.attachments : []
    }))
  };
}

function decodeImageInput(input = {}) {
  const dataUrl = String(input.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error("invalid_image_data_url");
  }

  const mimeType = String(input.mimeType || match[1]).toLowerCase();
  if (mimeType !== match[1].toLowerCase() || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("unsupported_image_type");
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.byteLength) {
    throw new Error("empty_image_upload");
  }
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error("image_upload_too_large");
  }

  return {
    buffer,
    mimeType,
    extension: extensionForMimeType(mimeType)
  };
}

function extensionForMimeType(mimeType) {
  return {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif"
  }[mimeType] || ".img";
}

function sanitizeFileName(fileName) {
  const extension = extname(fileName);
  const base = fileName.slice(0, Math.max(0, fileName.length - extension.length));
  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeExtension = extension.toLowerCase().replace(/[^.\w]/g, "");
  return `${safeBase || "image"}${safeExtension || ".img"}`;
}
