# Design: GHOSTCLAW Tooling Integration
## Change ID: 001-tooling-integration

### Architecture Decision
Use registry pattern with policy tiers to control external tooling.

### Components
```
.ghostclaw_registry/
├── tooling_registry_v1_4.yaml    # Tool definitions + tiers
└── tools/

.ghostclaw_runtime/
└── policy/
    └── tooling_action_tiers_v1_4.yaml  # Action rules
```

### Data Flow
1. Hermes reads registry to determine tool tier
2. Policy Guardian blocks D/X actions
3. File Lease Manager prevents path collision
4. Validator writes receipt evidence

### Tool Tier Mapping
- A: Read-only docs (OpenSpec, Logto design)
- B: Local safe mutation (9Router config, OpenSpec plans)
- C: Gated action (OpenClaw device access, Float16 GPU)
- D/X: Blocked (secret read, antibot bypass, stealth browser)