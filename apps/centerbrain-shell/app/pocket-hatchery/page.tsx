import type { Metadata } from "next";
import {
  getPocketHatcherySummary,
  listPocketHatcheryCreatures,
} from "../../src/lib/pocket-hatchery";

export const metadata: Metadata = {
  title: "Pocket Hatchery | SIRINX CenterBrain",
  description: "Read-only Pocket Hatchery catalog and R0 safety gate viewer.",
};

const stageOrder = ["egg", "hatchling", "juvenile", "adult", "elder"];

function formatCondition(condition: { type: string; value: number }) {
  return `${condition.type.replaceAll("_", " ")} >= ${condition.value}`;
}

export default function PocketHatcheryPage() {
  const creatures = listPocketHatcheryCreatures();
  const summary = getPocketHatcherySummary();
  const families = Array.from(new Set(creatures.map((creature) => creature.family))).sort();

  return (
    <main className="min-h-screen bg-[#101114] text-stone-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-12">
        <header className="grid gap-5 border-b border-stone-100/15 pb-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
              GhostClaws Agent Factory v4
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-black leading-none tracking-normal text-stone-50 sm:text-6xl">
              Pocket Hatchery
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
              Read-only catalog for the deterministic testnet-first MVP. Public wallet flow stays on
              WAX Cloud Wallet or My Cloud Wallet, and all external writes remain blocked.
            </p>
          </div>

          <aside className="border border-amber-100/20 bg-amber-950/15 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Release Mode</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Gate label="Route" value={summary.route} />
              <Gate label="Catalog" value={`${summary.totalCreatures} sample`} />
              <Gate label="External Writes" value={summary.externalWrites ? "ON" : "OFF"} safe />
              <Gate label="Paid Randomness" value={summary.paidRandomness ? "ON" : "OFF"} safe />
            </dl>
          </aside>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
          <div className="border border-stone-100/15 bg-stone-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Wallet Path</p>
            <h2 className="mt-3 text-2xl font-black text-stone-50">Public signer stays out of repo</h2>
            <div className="mt-4 grid gap-3">
              {summary.publicWalletPath.map((wallet) => (
                <div key={wallet} className="border border-stone-100/10 bg-stone-900/35 p-3">
                  <p className="font-bold text-stone-50">{wallet}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-400">
                    Identity and transaction prompts belong to the wallet provider. This page stores no key,
                    seed, session token, or signer material.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-red-200/20 bg-red-950/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-red-100">Blocked Actions</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.blockedActions.map((action) => (
                <span
                  key={action}
                  className="border border-red-100/20 bg-red-950/40 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-red-100"
                >
                  {action}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-red-100/80">
              R0 testnet deploy, real wallet connector implementation, and any production write remain
              approval-gated outside this viewer.
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border border-stone-100/15 bg-stone-950/35 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Families</p>
            <div className="mt-4 grid gap-2">
              {families.map((family) => (
                <div key={family} className="border-l-4 border-emerald-200/60 bg-stone-900/35 px-3 py-2">
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-100">{family}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-stone-400">Stage Order</p>
            <ol className="mt-4 grid gap-2">
              {stageOrder.map((stage, index) => (
                <li key={stage} className="flex items-center gap-2 text-sm text-stone-300">
                  <span className="inline-flex h-6 w-6 items-center justify-center border border-stone-100/15 text-xs font-black text-amber-100">
                    {index + 1}
                  </span>
                  <span className="capitalize">{stage}</span>
                </li>
              ))}
            </ol>
          </aside>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {creatures.map((creature) => (
              <article key={creature.id} className="border border-stone-100/15 bg-stone-950/35 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{creature.id}</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-stone-50">{creature.name}</h2>
                  </div>
                  <span className="border border-emerald-100/20 bg-emerald-950/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                    deterministic
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
                  <Fact label="Family" value={creature.family} />
                  <Fact label="Rarity" value={creature.rarity} />
                  <Fact label="Stage" value={creature.stage} />
                </dl>

                <div className="mt-5 border-t border-stone-100/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Evolution</p>
                  <p className="mt-2 text-sm font-bold text-stone-100">
                    {creature.evolvesTo ? `${creature.id} -> ${creature.evolvesTo}` : `${creature.id} -> final`}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {creature.evolveConditions.map((condition) => (
                      <code
                        key={`${creature.id}-${condition.type}`}
                        className="border border-stone-100/10 bg-black/25 px-3 py-2 text-xs text-stone-300"
                      >
                        {formatCondition(condition)}
                      </code>
                    ))}
                  </div>
                </div>

                <p className="mt-4 break-all border-t border-stone-100/10 pt-4 font-mono text-xs leading-5 text-stone-500">
                  {creature.metadataUri}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Gate({ label, value, safe = false }: { label: string; value: string; safe?: boolean }) {
  return (
    <div className="border border-stone-100/10 bg-stone-950/35 p-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</dt>
      <dd className={safe ? "mt-2 font-black text-emerald-200" : "mt-2 font-black text-stone-100"}>{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-100/10 bg-stone-900/35 p-3">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">{label}</dt>
      <dd className="mt-2 font-black capitalize text-stone-100">{value}</dd>
    </div>
  );
}
