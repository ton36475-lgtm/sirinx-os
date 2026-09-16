/**
 * Manifest Store: persists rollback / simulation manifests locally.
 * All blocked or simulated actions leave a reproducible manifest.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export interface SimulationManifest {
  schema: "ghostclaw.simulation_manifest.v3_2";
  manifest_id: string;
  correlation_id: string;
  mission_id: string;
  created_at: string;
  /** If true, no filesystem mutation was performed */
  simulation_only: boolean;
  action_requested: string;
  action_class: string;
  final_tier: string;
  reason: string;
  safe_replacement_action?: string | undefined;
  target_files: string[];
  /** path -> sha256 of original content (zero hash if new file) */
  snapshots: Record<string, string>;
  rollback_commands: string[];
  /** Codex CLI dry-run preview if available */
  codex_dry_run_preview?: string | undefined;
  /** Notes for operator review; no secrets */
  notes?: string | undefined;
}

export interface ManifestStoreOptions {
  projectRoot?: string | undefined;
  manifestsDir?: string | undefined;
}

function manifestDir(options: ManifestStoreOptions): string {
  const root = options.projectRoot ?? process.cwd();
  return join(root, options.manifestsDir ?? ".ghostclaw_runtime/manifests");
}

function nowIso(): string {
  return new Date().toISOString();
}

export function zeroHash(): string {
  return "0".repeat(64);
}

export async function writeSimulationManifest(
  partial: Omit<SimulationManifest, "manifest_id" | "created_at" | "schema"> & {
    manifest_id?: string;
    created_at?: string;
  },
  options: ManifestStoreOptions = {}
): Promise<SimulationManifest> {
  const manifest: SimulationManifest = {
    schema: "ghostclaw.simulation_manifest.v3_2",
    manifest_id: partial.manifest_id ?? `SM-${randomUUID().slice(0, 8)}`,
    created_at: partial.created_at ?? nowIso(),
    correlation_id: partial.correlation_id,
    mission_id: partial.mission_id,
    simulation_only: partial.simulation_only,
    action_requested: partial.action_requested,
    action_class: partial.action_class,
    final_tier: partial.final_tier,
    reason: partial.reason,
    safe_replacement_action: partial.safe_replacement_action,
    target_files: partial.target_files,
    snapshots: partial.snapshots,
    rollback_commands: partial.rollback_commands,
    codex_dry_run_preview: partial.codex_dry_run_preview,
    notes: partial.notes,
  };
  const dir = manifestDir(options);
  const path = join(dir, `${manifest.manifest_id}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}
