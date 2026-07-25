"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  GOD_MODE_AGENTS,
  GOD_MODE_INFRA_ENDPOINTS,
  GOD_MODE_LAYERS,
  GOD_MODE_MODEL_ROUTING,
  GOD_MODE_PRIORITY_COLORS,
  GOD_MODE_QUEUE,
  GOD_MODE_R0_GATES,
  GOD_MODE_SECURITY_FLAGS,
  GOD_MODE_SOLAR_TARIFFS,
  GOD_MODE_STATUS_COLORS,
  type GodModePriority,
  getGodModeLayer,
  getGodModeQueueSummary,
} from "../../src/lib/god-mode-master-os";

type TabId = "queue" | "synthesis" | "r0gates";
type PriorityFilter = GodModePriority | "ALL";

function Badge({ label, color = "#475569" }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center rounded-[3px] px-2 text-[9px] font-black uppercase"
      style={{
        background: `${color}22`,
        color,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

function TierBlock({ tier, color, list }: { tier: string; color: string; list: readonly string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex w-full items-center justify-between gap-3 rounded border px-2.5 py-2 text-left"
        style={{
          background: `${color}18`,
          borderColor: `${color}44`,
        }}
      >
        <span className="text-[10px] font-black" style={{ color }}>
          {tier}
        </span>
        <span className="text-[10px]" style={{ color: `${color}aa` }}>
          {open ? "UP" : "DOWN"} {list.length}
        </span>
      </button>
      {open ? (
        <div
          className="rounded-b border border-t-0 bg-[#060c18] px-2.5 py-2"
          style={{ borderColor: `${color}22` }}
        >
          {list.map((agent) => (
            <div key={agent} className="py-1 text-[11px] leading-5 text-slate-400">
              <span style={{ color: `${color}99` }}>-</span> {agent}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GodModeMasterOS() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [tab, setTab] = useState<TabId>("queue");

  const visibleQueue = useMemo(
    () =>
      priorityFilter === "ALL"
        ? GOD_MODE_QUEUE
        : GOD_MODE_QUEUE.filter((task) => task.p === priorityFilter),
    [priorityFilter],
  );
  const queueSummary = useMemo(() => getGodModeQueueSummary(GOD_MODE_QUEUE), []);

  return (
    <main
      className="min-h-screen bg-[#04080f] text-slate-200"
      style={{
        fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      <header className="border-b border-[#0f2040] bg-[linear-gradient(90deg,#0d0623_0%,#06111f_60%,#040e1a_100%)] px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-[15px] font-black uppercase text-slate-100" style={{ letterSpacing: "0.08em" }}>
              <span className="text-amber-500">SIRINX</span> x GHOSTCLAWS
              <span className="ml-3 text-[11px] font-normal text-slate-600">GOD MODE MASTER OS v2.0</span>
            </h1>
            <p className="mt-1 text-[10px] leading-5 text-slate-600">
              A2A Adaptive Sync - LatentMAS Transport - Oracle Memory - Rust Orchestrator - 2026-06-28 - Phitsanulok
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Night Watch", value: "BLOCKED", color: "#ef4444" },
              { label: "Hermes Stack", value: "UNKNOWN", color: "#f59e0b" },
              { label: "R0 Gates", value: `${GOD_MODE_R0_GATES.length} PENDING`, color: "#f59e0b" },
              { label: "LatentMAS", value: "PLANNED", color: "#3b82f6" },
              { label: "Oracle Memory", value: "PLANNED", color: "#10b981" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded border bg-[#06111f] px-2.5 py-1 text-[10px]"
                style={{ borderColor: `${item.color}33` }}
              >
                <span className="text-slate-600">{item.label}: </span>
                <span className="font-black" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-62px)] grid-cols-1 gap-0 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
        <aside className="min-w-0 border-b border-[#0f2040] p-3.5 xl:border-b-0 xl:border-r">
          <p className="mb-2.5 text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
            Master Architecture - 6 Layers
          </p>

          {GOD_MODE_LAYERS.map((layer) => {
            const open = activeLayer === layer.id;

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveLayer(open ? null : layer.id)}
                className="mb-2 block w-full rounded-md border p-2.5 text-left transition-colors"
                style={{
                  borderColor: open ? `${layer.color}88` : "#0f2040",
                  borderLeft: `3px solid ${layer.color}`,
                  background: open ? "#060d1a" : "transparent",
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-5 min-w-7 items-center justify-center rounded border border-slate-700 px-1 text-[9px] text-slate-300">
                      {layer.icon}
                    </span>
                    <span className="text-[10px] font-black" style={{ color: layer.color }}>
                      {layer.id}
                    </span>
                  </span>
                  <Badge label={layer.status} color={GOD_MODE_STATUS_COLORS[layer.status]} />
                </span>
                <span className="mt-1.5 block text-[11px] font-bold text-slate-100">{layer.name}</span>

                {open
                  ? layer.components.map((component) => (
                      <span key={component.name} className="mt-2 block border-t border-[#0f2040] pt-2">
                        <span className="block text-[10px] font-bold" style={{ color: `${layer.color}dd` }}>
                          {component.name}
                        </span>
                        <span className="mt-1 block text-[10px] leading-5 text-slate-600">{component.detail}</span>
                      </span>
                    ))
                  : null}
              </button>
            );
          })}

          <section className="mt-3.5">
            <p className="mb-2 text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
              Permanent Security Flags
            </p>
            {GOD_MODE_SECURITY_FLAGS.map((flag) => (
              <div key={flag.label} className="mb-1 rounded border border-red-900 bg-[#140606] px-2 py-1.5 text-[10px]">
                <p className="font-black text-red-200">{flag.label}</p>
                <p className="mt-0.5 text-red-950">{flag.detail}</p>
              </div>
            ))}
          </section>
        </aside>

        <section className="min-w-0 p-3.5">
          <nav className="mb-3 flex flex-wrap gap-1">
            {[
              ["queue", "Priority Queue"],
              ["synthesis", "Synthesis Map"],
              ["r0gates", "R0 Gates"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as TabId)}
                className="rounded border-b-2 px-3.5 py-1.5 text-[10px] uppercase"
                style={{
                  background: tab === id ? "#0f2040" : "transparent",
                  color: tab === id ? "#e2e8f0" : "#475569",
                  borderColor: tab === id ? "#f59e0b" : "transparent",
                  fontWeight: tab === id ? 800 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "queue" ? (
            <>
              <div className="mb-2.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.1em" }}>
                  {visibleQueue.length} tasks - {queueSummary.blocked} blocked - {queueSummary.r0Gated} R0-gate
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["ALL", "P0", "P1", "P2", "P3", "P4"] as const).map((priority) => {
                    const color = priority === "ALL" ? "#64748b" : GOD_MODE_PRIORITY_COLORS[priority];
                    const selected = priorityFilter === priority;

                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setPriorityFilter(priority)}
                        className="h-6 min-w-9 rounded border px-2 text-[10px]"
                        style={{
                          borderColor: selected ? color : "#0f2040",
                          background: selected ? `${color}22` : "transparent",
                          color: selected ? color : "#475569",
                        }}
                      >
                        {priority}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                {visibleQueue.map((task) => {
                  const priorityColor = GOD_MODE_PRIORITY_COLORS[task.p];
                  const taskLayer = getGodModeLayer(task.layer);

                  return (
                    <article
                      key={task.id}
                      className="rounded-md border p-3"
                      style={{
                        borderColor: "#0f2040",
                        borderLeft: `3px solid ${priorityColor}`,
                        background:
                          task.status === "blocked"
                            ? "#140606"
                            : task.status === "r0-gate"
                              ? "#14100a"
                              : "#060c18",
                      }}
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge label={task.p} color={priorityColor} />
                          <span className="text-[9px]" style={{ color: `${taskLayer?.color ?? "#64748b"}88` }}>
                            [{task.layer}]
                          </span>
                          <h2 className="text-[11px] font-bold text-slate-100">{task.title}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge label={task.status} color={GOD_MODE_STATUS_COLORS[task.status]} />
                          <span className="text-[9px] text-slate-600">@{task.agent}</span>
                        </div>
                      </div>
                      <code className="mt-2 block rounded border border-[#0f2040] bg-[#020609] px-2.5 py-1.5 text-[10px] leading-5 text-slate-600">
                        {task.cmd}
                      </code>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {tab === "synthesis" ? (
            <div className="grid gap-3 leading-7">
              <p className="text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
                GhostClaws v2.0 - Master Synthesis
              </p>

              <section className="rounded-lg border border-indigo-950 bg-[linear-gradient(135deg,#06111f,#0d0623)] p-4">
                <p className="mb-2.5 text-[9px] uppercase text-indigo-300" style={{ letterSpacing: "0.12em" }}>
                  Synthesis Formula
                </p>
                <div className="text-xs">
                  <p className="font-black text-slate-100">GhostClaws v2.0 =</p>
                  <p className="text-pink-400">GhostClaws v1 <span className="text-[10px] text-slate-600">- LANE_HERMES + A2A2A scaffold</span></p>
                  <p className="text-amber-500">+ LatentMAS <span className="text-[10px] text-slate-600">- KV transport, benchmark-gated speed claims</span></p>
                  <p className="text-emerald-400">+ Oracle Memory <span className="text-[10px] text-slate-600">- vault, identity, Nothing is Deleted</span></p>
                  <p className="text-blue-400">+ KOB CLI Skills <span className="text-[10px] text-slate-600">- cross-agent portability, P1 to P5</span></p>
                  <p className="text-orange-400">+ SIRINX BI <span className="text-[10px] text-slate-600">- solar, tax shield, PPA, AGM Galaxy</span></p>
                </div>
              </section>

              <section className="rounded-lg border border-[#0f2040] bg-[#060c18] p-3.5">
                <h2 className="mb-2 text-[10px] font-black uppercase text-amber-500">Transport Principle</h2>
                <p className="border-l-4 border-amber-500 pl-3 text-[13px] italic leading-7 text-slate-500">
                  Text is the interface for humans. Latent/KV is the transport layer between agents.
                </p>
              </section>

              <section className="rounded-lg border border-[#0f2040] bg-[#060c18] p-3.5">
                <h2 className="mb-2 text-[10px] font-black uppercase text-emerald-400">Oracle Memory Principles</h2>
                {[
                  ["Nothing is Deleted", "soft delete only - timestamp is truth - audit trail"],
                  ["Patterns Over Intentions", "behavior over promise - observable state first"],
                  ["External Brain, Not Command", "Oracle suggests - Pitoon decides - always"],
                  ["Curiosity Creates Existence", "new Oracle buds from parent Oracle via awaken flow"],
                  ["Transparency (Rule 6)", "AI never pretends to be human - system must be visible"],
                ].map(([key, value]) => (
                  <p key={key} className="mb-1.5 text-[11px] leading-6">
                    <span className="text-emerald-400">- </span>
                    <span className="font-black text-emerald-100">{key}</span>
                    <span className="text-slate-600"> - {value}</span>
                  </p>
                ))}
              </section>

              <section className="rounded-lg border border-[#0f2040] bg-[#060c18] p-3.5">
                <h2 className="mb-2 text-[10px] font-black uppercase text-violet-400">Rust + Python Split</h2>
                {[
                  { who: "Rust Orchestrator", what: "agent graph - queue - memory bus - scheduler - benchmark - logging" },
                  { who: "Python / HF backend", what: "hidden_states - KV cache - latent steps - alignment Wa - vLLM" },
                  { who: "Critical path -> Rust", what: "memory bus - scheduler - cache store - inference adapter later" },
                ].map((row) => (
                  <p key={row.who} className="mb-1.5 text-[11px] leading-6">
                    <span className="font-black text-violet-300">{row.who}</span>
                    <span className="text-slate-600">{" -> "}</span>
                    <span className="text-slate-500">{row.what}</span>
                  </p>
                ))}
              </section>
            </div>
          ) : null}

          {tab === "r0gates" ? (
            <div>
              <p className="mb-3 text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
                R0 Security Gates - human approval required before execution
              </p>
              {GOD_MODE_R0_GATES.map((gate, index) => (
                <article
                  key={gate}
                  className="mb-2 rounded-md border border-red-900 bg-[#140606] p-3.5"
                  style={{ borderLeft: "3px solid #ef4444" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-6 min-w-8 items-center justify-center rounded border border-red-900 text-[10px] font-black text-red-300">
                      LOCK
                    </span>
                    <div>
                      <p className="font-black text-red-200">R0-{String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-0.5 text-red-400">{gate}</p>
                    </div>
                  </div>
                  <p className="mt-2 rounded border border-red-950 bg-[#0a0202] px-2.5 py-1.5 text-[10px] text-red-950">
                    NO auto-execution - Pitoon must explicitly approve in a new message.
                  </p>
                </article>
              ))}
              <section className="mt-3.5 rounded-lg border border-[#0f2040] bg-[#060c18] p-3.5">
                <h2 className="mb-1.5 font-black text-amber-500">R0 Approval Protocol</h2>
                <p className="text-[10px] leading-6 text-slate-500">
                  1. Pitoon sends: Approve R0-XX: gate name
                  <br />
                  2. Local agent confirms scope
                  <br />
                  3. Execute one gate only per approval
                  <br />
                  4. Log result to repo/runtime evidence and memory pulse
                  <br />
                  5. No batch approve - separate each gate
                </p>
              </section>
            </div>
          ) : null}
        </section>

        <aside className="min-w-0 border-t border-[#0f2040] p-3.5 xl:border-l xl:border-t-0">
          <p className="mb-2.5 text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
            SIRINX 21-Agent Identity Map
          </p>
          {GOD_MODE_AGENTS.map((agent) => (
            <TierBlock key={agent.tier} {...agent} />
          ))}

          <SidePanel title="Model Routing Table">
            {GOD_MODE_MODEL_ROUTING.map((model) => (
              <div
                key={model.score}
                className="mb-1 flex justify-between gap-2 rounded border bg-[#060c18] px-2 py-1.5"
                style={{ borderColor: `${model.color}22` }}
              >
                <span className="text-slate-600">score {model.score}</span>
                <span className="text-[10px] font-black" style={{ color: model.color }}>
                  {model.model}
                </span>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Infrastructure Endpoints">
            {GOD_MODE_INFRA_ENDPOINTS.map((endpoint) => (
              <div key={endpoint.name} className="mb-1 flex justify-between gap-2 rounded border border-[#0f2040] bg-[#060c18] px-2 py-1.5">
                <span className="text-slate-400">
                  {endpoint.name} <span className="text-slate-600">{endpoint.port}</span>
                </span>
                <span className="text-[9px] text-amber-500">UNKNOWN</span>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Thailand Solar Tariffs">
            {GOD_MODE_SOLAR_TARIFFS.map((tariff) => (
              <div
                key={tariff.label}
                className="mb-1 flex justify-between gap-2 rounded border bg-[#060c18] px-2 py-1.5"
                style={{ borderColor: `${tariff.color}33` }}
              >
                <span className="text-slate-500">{tariff.label}</span>
                <span className="font-black" style={{ color: tariff.color }}>
                  {tariff.value}
                </span>
              </div>
            ))}
          </SidePanel>

          <SidePanel title="Governance Risk Flags">
            <div className="rounded border border-amber-800 bg-[#14100a] px-2.5 py-2 text-[10px] leading-5 text-amber-300">
              <p className="font-black">Flowise CVE note</p>
              <p className="mt-1 text-amber-950">User-supplied: CVE-2026-40933, CVSS 9.9 RCE, patch 3.1.0+.</p>
              <p className="text-amber-950">Verify before security decisions or production blocking.</p>
            </div>
          </SidePanel>
        </aside>
      </div>
    </main>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3.5">
      <p className="mb-2 text-[9px] uppercase text-slate-600" style={{ letterSpacing: "0.12em" }}>
        {title}
      </p>
      {children}
    </section>
  );
}
