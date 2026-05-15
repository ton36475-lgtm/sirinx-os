function envEnabled(name) {
  return process.env[name] === "true";
}

export const switches = [
  {
    id: "cloud-mutation",
    title: "Cloud mutation",
    env: "CLOUDFLARE_MUTATION_ENABLED",
    enabled: envEnabled("CLOUDFLARE_MUTATION_ENABLED"),
    description: "Allows cloud resource writes only after explicit approval."
  },
  {
    id: "customer-messaging",
    title: "Customer messaging",
    env: "CUSTOMER_MESSAGE_SEND_ENABLED",
    enabled: envEnabled("CUSTOMER_MESSAGE_SEND_ENABLED"),
    description: "Allows customer-facing sends only after explicit approval."
  },
  {
    id: "paid-api",
    title: "Paid API calls",
    env: "PAID_API_CALLS_ENABLED",
    enabled: envEnabled("PAID_API_CALLS_ENABLED"),
    description: "Allows paid API usage only after cost and approval gates pass."
  },
  {
    id: "public-ai-exposure",
    title: "Public AI exposure",
    env: "PUBLIC_AI_EXPOSURE_ENABLED",
    enabled: envEnabled("PUBLIC_AI_EXPOSURE_ENABLED"),
    description: "Allows public exposure of local AI services only after release approval."
  },
  {
    id: "destructive-mcp",
    title: "Destructive MCP tools",
    env: "DESTRUCTIVE_MCP_TOOLS_ENABLED",
    enabled: envEnabled("DESTRUCTIVE_MCP_TOOLS_ENABLED"),
    description: "Allows destructive MCP actions only after explicit approval."
  },
  {
    id: "render-export",
    title: "Render and export",
    env: "RENDER_EXPORT_ENABLED",
    enabled: envEnabled("RENDER_EXPORT_ENABLED"),
    description: "Allows render/export workflows only after explicit approval."
  }
];

export function getSwitch(id) {
  return switches.find((item) => item.id === id);
}

export function evaluateRequiredSwitches(requiredSwitches = []) {
  const blocked = requiredSwitches
    .map((id) => getSwitch(id))
    .filter((item) => item && !item.enabled);

  return {
    allowed: blocked.length === 0,
    blocked
  };
}
