/**
 * Packet Bus: local file-bus I/O for A2A2A packets.
 * Mirrors INBOX_OUTBOX_PROTOCOL.md shape and writes to _A2A_QUEUE/.
 * No runtime queue execution, no external send.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export const DEFAULT_QUEUE_ROOT = "_A2A_QUEUE";

export type PacketStatus = "inbox" | "working" | "outbox" | "done" | "blocked";
export type PacketRisk = "safe" | "medium" | "high" | "critical";
export type PacketAgent = "hermes" | "codex" | "claude" | "opencode" | "copilot" | "opus" | "kob" | "human";

export interface A2APacket {
  id: string;
  project: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  title: string;
  agent: PacketAgent;
  status: PacketStatus;
  risk: PacketRisk;
  input: string[];
  output: string[];
  approval_required: boolean;
  /** ISO timestamp */
  created_at: string;
  /** Optional A2A2A message envelope */
  a2a2a_message?: Record<string, unknown>;
  /** Optional broker receipt envelope */
  receipt?: Record<string, unknown>;
  /** Optional simulation-only manifest reference */
  manifest_id?: string;
  /** Human-readable notes; no secrets */
  notes?: string;
}

export interface PacketBusOptions {
  queueRoot?: string | undefined;
  projectRoot?: string | undefined;
}

function queueDir(options: PacketBusOptions): string {
  const root = options.projectRoot ?? process.cwd();
  return join(root, options.queueRoot ?? DEFAULT_QUEUE_ROOT);
}

function packetPath(status: PacketStatus, id: string, options: PacketBusOptions): string {
  const base = id.endsWith(".json") ? id : `${id}.json`;
  return join(queueDir(options), status, base);
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function writePacket(
  packet: Omit<A2APacket, "id" | "created_at"> & { id?: string; created_at?: string },
  options: PacketBusOptions = {}
): Promise<A2APacket> {
  const full: A2APacket = {
    ...packet,
    id: packet.id ?? `${packet.status}_${randomUUID().slice(0, 8)}`,
    created_at: packet.created_at ?? nowIso(),
  };
  const path = packetPath(full.status, full.id, options);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(full, null, 2) + "\n", "utf8");
  return full;
}

export async function readPacket(
  status: PacketStatus,
  id: string,
  options: PacketBusOptions = {}
): Promise<A2APacket | null> {
  try {
    const path = packetPath(status, id, options);
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as A2APacket;
  } catch {
    return null;
  }
}

export async function listPackets(
  status: PacketStatus,
  options: PacketBusOptions = {}
): Promise<A2APacket[]> {
  const dir = join(queueDir(options), status);
  try {
    const entries = await readdir(dir);
    const packets: A2APacket[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const p = await readPacket(status, entry, options);
      if (p) packets.push(p);
    }
    return packets.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch {
    return [];
  }
}

/**
 * Move a packet from one status directory to another.
 * This renames the file across status directories (no data loss) so the
 * packet's canonical status is updated per INBOX_OUTBOX_PROTOCOL flow.
 */
export async function movePacket(
  fromStatus: PacketStatus,
  toStatus: PacketStatus,
  id: string,
  options: PacketBusOptions = {}
): Promise<A2APacket | null> {
  const p = await readPacket(fromStatus, id, options);
  if (!p) return null;
  const moved: A2APacket = { ...p, status: toStatus };
  const dest = packetPath(toStatus, id, options);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, JSON.stringify(moved, null, 2) + "\n", "utf8");
  await unlink(packetPath(fromStatus, id, options));
  return moved;
}
