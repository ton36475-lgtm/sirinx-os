"use client";

import { useEffect, useMemo, useState } from "react";
import {
  centerBrainShellFallback,
  fetchCenterBrainStatus,
  type CenterBrainNode,
  type CenterBrainShellStatus,
} from "../../src/lib/centerbrain-client";
import {
  fetchHermesAgentAuditStatus,
  hermesAgentAuditFallback,
  type HermesAgentAuditStatus,
} from "../../src/lib/hermes-agent-audit-client";

const metricLabels = [
  ["AI Nodes", "aiNodes"],
  ["Devices", "deviceNodes"],
  ["Connectors", "connectorLanes"],
  ["Stacks", "stackLanes"],
  ["Live Actions", "liveExternalActions"],
] as const;

export function CenterBrainConsole() {
  const [status, setStatus] = useState<CenterBrainShellStatus>(centerBrainShellFallback);
  const [hermesAudit, setHermesAudit] =
    useState<HermesAgentAuditStatus>(hermesAgentAuditFallback);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCenterBrainStatus(), fetchHermesAgentAuditStatus()]).then(([nextStatus, audit]) => {
      if (mounted) {
        setStatus(nextStatus);
        setHermesAudit(audit);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const riskTone = useMemo(
    () => (status.source === "live" ? "Live local API" : "Fallback contract"),
    [status.source],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#101114] text-stone-100">
      <section className="relative isolate min-h-screen px-5 py-6 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(97,210,190,0.24),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(255,199,95,0.2),transparent_28%),linear-gradient(135deg,#101114_0%,#171916_46%,#242015_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

        <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-stone-100/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200">
              SIRINX CenterBrain
            </p>
            <h1 className="text-balance text-4xl font-black leading-[0.95] tracking-normal text-stone-50 sm:text-6xl lg:text-7xl">
              Local node command shell
            </h1>
          </div>
          <div className="w-full max-w-sm border border-stone-100/20 bg-stone-950/35 p-4 shadow-2xl shadow-black/20 backdrop-blur lg:translate-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Mode</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">{riskTone}</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              JSON-only consumer surface. No command execution, MCP start, connector activation,
              device control, deploy, or paid API call.
            </p>
          </div>
        </header>

        <section className="mx-auto mt-8 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricLabels.map(([label, key]) => (
            <article key={key} className="border border-stone-100/15 bg-stone-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{label}</p>
              <p className="mt-3 text-3xl font-black text-stone-50">{status.summary[key]}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="grid gap-5">
            <Panel title="AI Node Order" nodes={status.aiNodes} accent="emerald" />
            <Panel title="Device Sync Map" nodes={status.deviceNodes} accent="amber" />
          </div>

          <div className="grid gap-5">
            <Panel title="Stack Lanes" nodes={status.stackLanes} accent="sky" />
            <section className="border border-red-200/20 bg-red-950/20 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-black text-red-100">Blocked Actions</h2>
                <span className="border border-red-200/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-100">
                  hard stop
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {status.blockedActions.map((action) => (
                  <span
                    key={action}
                    className="border border-red-100/20 bg-red-950/35 px-2 py-1 text-xs text-red-100"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-[1fr_1fr]">
          <Panel title="Connector Lanes" nodes={status.connectorLanes} accent="stone" />
          <section className="border border-stone-100/15 bg-stone-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Stop Point</p>
            <p className="mt-3 text-xl font-black text-stone-50">{status.stopPoint}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Guard label="Commands" value={status.canExecuteCommands} />
              <Guard label="Connectors" value={status.canActivateConnectors} />
              <Guard label="MCP" value={status.guardrails.canRunMcp} />
              <Guard label="Deploy" value={status.canDeploy} />
            </dl>
          </section>
        </section>

        <section className="mx-auto mt-5 max-w-7xl border border-amber-200/20 bg-amber-950/15 p-5">
          <div className="flex flex-col gap-3 border-b border-amber-100/15 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Hermes Agent</p>
              <h2 className="mt-2 text-2xl font-black text-stone-50">Messaging Audit & Approval</h2>
            </div>
            <span className="w-fit border border-amber-100/25 bg-stone-950/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-100">
              {hermesAudit.status}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {hermesAudit.gateways.map((gateway) => (
              <article key={gateway.id} className="border border-stone-100/10 bg-stone-950/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-stone-50">{gateway.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                      {gateway.id}
                    </p>
                  </div>
                  <span className={gateway.ready ? "text-xs font-black text-emerald-200" : "text-xs font-black text-red-200"}>
                    {gateway.ready ? "ready" : "blocked"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-stone-300">{gateway.status}</p>
                <p className="mt-3 text-xs leading-5 text-stone-400">{gateway.nextAction}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="border border-red-100/15 bg-red-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-red-100">Blocked</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hermesAudit.blockedActions.map((action) => (
                  <span key={action} className="border border-red-100/20 px-2 py-1 text-xs text-red-100">
                    {action}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-stone-100/15 bg-stone-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Manual Commands</p>
              <div className="mt-3 grid gap-2">
                {(hermesAudit.manualCommands.length > 0 ? hermesAudit.manualCommands : ["Evidence incomplete - no restart command display"]).map((command) => (
                  <code key={command} className="border border-stone-100/10 bg-black/25 px-3 py-2 text-sm text-stone-100">
                    {command}
                  </code>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-400">
                API execution is disabled. Restart remains manual and approval-gated.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Panel({
  title,
  nodes,
  accent,
}: {
  title: string;
  nodes: CenterBrainNode[];
  accent: "emerald" | "amber" | "sky" | "stone";
}) {
  const accentClass = {
    emerald: "text-emerald-200 border-emerald-200/25",
    amber: "text-amber-200 border-amber-200/25",
    sky: "text-sky-200 border-sky-200/25",
    stone: "text-stone-200 border-stone-200/25",
  }[accent];

  return (
    <section className="border border-stone-100/15 bg-stone-950/35 p-5 backdrop-blur">
      <h2 className={`border-l-4 pl-3 text-lg font-black ${accentClass}`}>{title}</h2>
      <div className="mt-4 grid gap-3">
        {nodes.map((node) => (
          <article
            key={`${node.id}-${node.label}`}
            className="grid grid-cols-[1fr_auto] gap-3 border border-stone-100/10 bg-stone-900/40 p-3"
          >
            <div>
              <p className="font-bold text-stone-50">{node.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                {node.id}
              </p>
            </div>
            <p className="self-start border border-stone-100/15 px-2 py-1 text-right text-xs text-stone-300">
              {node.status}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Guard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="border border-stone-100/10 bg-stone-900/35 p-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
      <dd className={value ? "mt-2 font-black text-red-200" : "mt-2 font-black text-emerald-200"}>
        {value ? "ON" : "OFF"}
      </dd>
    </div>
  );
}
