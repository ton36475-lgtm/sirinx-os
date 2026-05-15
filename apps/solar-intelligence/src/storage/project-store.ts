import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const projectStoreRoot =
  process.env.SOLAR_INTEL_PROJECT_STORE || "/Users/sirinx/sirinx-os/data/solar-intelligence/projects";

export interface StoredProjectRecord {
  id: string;
  kind: "solar-proposal" | "ci-bess" | "usage-profile" | "quotation" | "competitor-intelligence";
  name: string;
  savedAt: string;
  payload: unknown;
  result: unknown;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function saveProjectRecord(record: Omit<StoredProjectRecord, "id" | "savedAt">): Promise<{
  id: string;
  path: string;
}> {
  const savedAt = new Date().toISOString();
  const id = `${record.kind}-${slug(record.name || "project")}-${savedAt.replace(/[:.]/g, "-")}`;
  const fullRecord: StoredProjectRecord = {
    ...record,
    id,
    savedAt
  };
  const directory = join(projectStoreRoot, record.kind);
  const path = join(directory, `${id}.json`);

  await mkdir(directory, { recursive: true });
  await writeFile(path, JSON.stringify(fullRecord, null, 2), "utf8");

  return { id, path };
}

export async function listProjectRecords(): Promise<Array<Pick<StoredProjectRecord, "id" | "kind" | "name" | "savedAt">>> {
  try {
    const kinds = await readdir(projectStoreRoot, { withFileTypes: true });
    const records: Array<Pick<StoredProjectRecord, "id" | "kind" | "name" | "savedAt">> = [];

    for (const kind of kinds) {
      if (!kind.isDirectory()) {
        continue;
      }
      const directory = join(projectStoreRoot, kind.name);
      const files = await readdir(directory);
      for (const file of files.filter((item) => item.endsWith(".json"))) {
        const raw = await readFile(join(directory, file), "utf8");
        const parsed = JSON.parse(raw) as StoredProjectRecord;
        records.push({
          id: parsed.id,
          kind: parsed.kind,
          name: parsed.name,
          savedAt: parsed.savedAt
        });
      }
    }

    return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}
