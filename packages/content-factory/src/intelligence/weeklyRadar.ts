import { X_AI_ACCOUNTS, X_AI_RADAR_POLICY, validateXAccounts, type XAccountSeed } from "./xAccounts.js";
import { classifyCreatorSignal } from "./signalClassifier.js";

export type WeeklyRadarObservation = {
  sourceHandle?: string;
  sourceUrl?: string | null;
  title?: string;
  summary?: string;
};

export function buildWeeklyRadar({
  weekOf,
  observations = [],
  accounts = X_AI_ACCOUNTS
}: {
  weekOf?: string;
  observations?: WeeklyRadarObservation[];
  accounts?: readonly XAccountSeed[];
} = {}) {
  const accountValidation = validateXAccounts(accounts);
  const rows = observations.map((observation) => ({
    sourceHandle: observation.sourceHandle || "manual",
    sourceUrl: observation.sourceUrl || null,
    summary: observation.summary || "",
    classification: classifyCreatorSignal({
      title: observation.title,
      note: observation.summary
    })
  }));

  return {
    ok: accountValidation.ok,
    weekOf: weekOf || new Date().toISOString().slice(0, 10),
    policy: X_AI_RADAR_POLICY,
    accounts: accounts.map((account) => ({
      handle: account.handle,
      sourceUrl: account.sourceUrl,
      verificationStatus: account.verificationStatus,
      evidenceNote: account.evidenceNote
    })),
    observations: rows,
    findings: accountValidation.findings,
    stop: "LOCAL_ONLY_NO_X_AUTOMATION_NO_COPYING_NO_IMPERSONATION"
  };
}
