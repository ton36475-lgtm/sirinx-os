// Integration: GODMODE V5 + 47 Ronin Lead Routing
// services/dev-control-api/src/ronin-godmode-bridge.mjs

export const RONIN_GODMODE_BRIDGE = {
  lanes: {
    "sales-engineering-review": { 
      tier: "HIGH", // Requires approval
      worker_target: "hermes-worker" 
    },
    "qualification-follow-up": { 
      tier: "MED", 
      abort_window: "15min" 
    },
    "nurture-and-education": { 
      tier: "LOW", 
      auto_approved: true 
    }
  },
  obsidian_sync: {
    vault_path: "~/Documents/Obsidian Vault/SIRINX",
    dashboard_files: [
      "Lead Qualification Lane Database.md",
      "Sales Engineering Dashboard.md"
    ]
  },
  safety_gate: {
    // No external writes per original spec
    external_write: false,
    // But can write to Obsidian locally
    local_write: true
  }
}