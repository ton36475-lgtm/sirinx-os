export const CREATOR_SIGNAL_TYPES = Object.freeze([
  "ai_workflow",
  "developer_tooling",
  "product_shipping",
  "growth_system",
  "design_storytelling",
  "prompt_pattern",
  "market_observation",
  "unknown"
] as const);

export type CreatorSignalType = (typeof CREATOR_SIGNAL_TYPES)[number];

export type CreatorSignalInput = {
  title?: string;
  note?: string;
};

export type CreatorSignalClassification = {
  signalTypes: CreatorSignalType[];
  confidence: number;
  humanReviewRequired: true;
  directCopyAllowed: false;
  automationAllowed: false;
};

export function classifyCreatorSignal(input: CreatorSignalInput = {}): CreatorSignalClassification {
  const text = `${input.title || ""} ${input.note || ""}`.toLowerCase();
  const matches: CreatorSignalType[] = [];
  if (/(agent|workflow|automation|operator|copilot)/.test(text)) matches.push("ai_workflow");
  if (/(developer|cli|repo|code|tooling|plugin|mcp)/.test(text)) matches.push("developer_tooling");
  if (/(ship|launch|mvp|product|build in public|saas)/.test(text)) matches.push("product_shipping");
  if (/(growth|funnel|roas|acquisition|campaign|community)/.test(text)) matches.push("growth_system");
  if (/(design|ux|interface|visual|storytelling|brand)/.test(text)) matches.push("design_storytelling");
  if (/(prompt|system prompt|template|playbook)/.test(text)) matches.push("prompt_pattern");
  if (/(trend|market|pricing|competitor|category)/.test(text)) matches.push("market_observation");

  return {
    signalTypes: matches.length ? [...new Set(matches)] : ["unknown"],
    confidence: matches.length ? Math.min(0.9, 0.45 + matches.length * 0.12) : 0.2,
    humanReviewRequired: true,
    directCopyAllowed: false,
    automationAllowed: false
  };
}
