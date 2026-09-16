# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_A_FIGMA.md
**Part A — Figma Integration Layer (Design System Bridge)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## A.1 Figma API Capabilities (Research Summary)

### Core Functions
- **REST API v3**: `GET/POST /v1/files`, `GET/POST /v1/images`, `GET /v1/nodes`
- **Authentication**: OAuth 2.0, personal access tokens
- **Rate Limits**: 30 req/min for personal tokens, 200 req/min for OAuth apps
- **Image Export**: PNG, JPG, SVG, PDF (max 4096px)

### Key Endpoints
```
GET    /v1/files/{file_key}/nodes          # Get node tree
GET    /v1/files/{file_key}/images         # Export images
GET    /v1/files/{file_key}/components     # Component library
POST   /v1/files/{file_key}/comments       # Add comments
GET    /v1/me                              # User info
GET    /v1/teams/{team_id}/projects        # Projects list
```

### Figma Plugin Architecture
- Runs in iframe with `parent.postMessage()` bridge
- Access to DOM limited - uses `figma` global object
- Can read/write node properties, create components
- Storage via `figma.clientStorage` (local) and `figma.fileKey` (shared)

---

## A.2 Design System Integration Schema

### Figma Node Sync (LangGraph State)
```typescript
interface FigmaDesignState {
  file_key: string;
  nodes: Array<{
    node_id: string;
    name: string;
    type: 'FRAME' | 'COMPONENT' | 'TEXT' | 'RECTANGLE';
    size: { width: number; height: number };
    children?: string[]; // node_ids
  }>;
  components: Array<{
    component_id: string;
    name: string;
    description: string;
    properties: Record<string, any>;
  }>;
  figma_version_id: string;
  sirinx_component_map: Record<string, string>; // figma_id -> sirinx_id
}
```

### Token Synchronization
```
FIGMA_TOKEN_SYNC = {
  colors: {
    'void': '#050607',
    'panel': '#0C0F12', 
    'ice': '#9BEAF0',
    -- tier colors synced from code --
  },
  typography: {
    display: 'Chakra Petch',
    body: 'IBM Plex Sans Thai',
    mono: 'JetBrains Mono'
  }
}
```

---

## A.3 Godmode Figma Commands

### /figma-pull [file_key]
- Action: Sync Figma file to LangGraph Layer 2
- Risk Tier: LOW
- Target: hermes-worker → FigmaClient DO

### /figma-export [node_id] [format]
- Action: Export node as image
- Risk Tier: LOW
- Output: R2 storage + Telegram reply

### /figma-components
- Action: List component library
- Risk Tier: LOW

### /figma-diff [version_a] [version_b]
- Action: Compare design versions
- Risk Tier: LOW/MED (depending on output)

---

## A.4 Integration Points (for Masterprompt)
- **WebSocket**: Real-time node change notifications
- **DO Storage**: Cache Figma JSON in Workers KV
- **R2 Binding**: Export image storage
- **Linear Mapping**: Design tasks → engineering tickets