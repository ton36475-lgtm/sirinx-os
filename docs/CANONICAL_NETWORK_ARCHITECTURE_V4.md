# SIRINX OS — Canonical Network Architecture V4 (LOCKED)

**Status:** LOCKED_BY_OWNER_REQUIREMENT
**Supersedes:** V3 (Poipet as Heavy Production Worker → DEPRECATED)
**Date:** 2026-07-17
**Lock Authority:** Owner directive

---

## Asset Classification

| Machine | Position | Role | Trust Zone | Sensitive Data |
|---------|----------|------|------------|----------------|
| **local** | Main LAN | Mac Mini M2 — Core Control Plane | **CORE_TRUSTED** | ✅ Allowed |
| **Editing-PC** | Same LAN as Mac Mini | Video editing, FFmpeg, media rendering | **LOCAL_PRODUCTION_WORKER** | Media scope only |
| **WarLand** | Remote / different network | Research + Cybersecurity Testing | **EXTERNAL_UNTRUSTED_LAB** | ❌ PROHIBITED |
| **Poipet-PC** | Poipet / different network | Research + Cybersecurity Testing | **EXTERNAL_UNTRUSTED_LAB** | ❌ PROHIBITED |
| **AIAgent** | Unknown host | Legacy / unmapped device | **QUARANTINED_UNTIL_IDENTIFIED** | ❌ PROHIBITED |

---

## Topology

```
                         INTERNET
                            │
             ┌──────────────┴──────────────┐
             │                             │
     APPROVED MOBILE                EXTERNAL LAB ZONE
     (Owner's phone)               (Remote / different network)
             │                     ┌───────────────┐
             │ CRD                 │ WarLand       │
             │ Core Account + PIN  │ Poipet-PC     │
             ▼                     │ Cyber Lab     │
  ┌────────────────────────┐       └───────┬───────┘
  │ local — Mac Mini M2    │               │
  │ Hermes / Core DB       │               │ Upload results only
  │ OmniRoute / Ledger     │               ▼
  └───────────┬────────────┘       ┌─────────────────────┐
              │ Trusted LAN        │ QUARANTINE DROP ZONE│
              │                    │ No Core credentials │
              ▼                    └──────────┬──────────┘
  ┌────────────────────────┐                 │
  │ Local Editing-PC Node  │                 │ Mac initiates pull
  │ FFmpeg / Render / Cut  │◄────────────────┘
  └────────────────────────┘
```

### One-Way Authority Rule

```
External Lab → Quarantine Broker     ✅ ALLOWED (upload only)
Core Mac     → Pull from Broker      ✅ ALLOWED (Mac initiates)
External Lab → Core Mac directly     ❌ DENIED
External Lab → Core Database         ❌ DENIED
External Lab → OmniRoute :20128      ❌ DENIED
External Lab → Editing-PC            ❌ DENIED
```

---

## Chrome Remote Desktop Policy

```yaml
chrome_remote_desktop:
  local_mac_m2:
    enabled: true
    delete_host_entry: false          # PROHIBITED
    disable_remote_connections: false # PROHIBITED
    owner_remote_access: REQUIRED
    allowed_account: CORE_OWNER_ACCOUNT
    allowed_client_policy:
      - APPROVED_MOBILE_ONLY
    authentication:
      - google_account
      - two_step_verification_or_passkey
      - unique_host_pin
```

**No-lockout invariant:**
- `local` host MUST remain online
- Mobile test required before each change
- Never disable CRD or delete local entry

---

## Security Realm Separation

| Realm | Account | Visible Hosts |
|-------|---------|---------------|
| **CORE-REMOTE** | Core owner Google account | `local` only |
| **LAB-REMOTE** | Separate Lab Google account | WarLand, Poipet-PC only |

```
Phone → Core Account → local           ✅
Phone → Lab Account  → WarLand/Poipet  ✅
WarLand → Core Account                  SIGNED OUT
Poipet  → Core Account                  SIGNED OUT
Lab Account → local                      NOT REGISTERED
```

**PIN isolation:** local, WarLand, Poipet-PC must each have unique PINs.

---

## Firewall Matrix — Mac Mini M2

```yaml
mac_mini_security:
  chrome_remote_desktop:
    allowed: true
    public_port_forwarding: false     # CRD uses Google relay, no port forward

  inbound_services:
    ssh_remote_login: disabled_unless_explicitly_required
    screen_sharing: disabled_unless_explicitly_required
    apple_remote_management: disabled
    database_ports_from_wan: denied
    omniroute_20128_from_wan: denied
    core_api_from_external_lab: denied

  firewall:
    enabled: true
    stealth_mode: recommended
    allow_required_local_apps_only: true
```

## Firewall Matrix — Core Router

```yaml
core_router:
  wan_to_lan_default: DENY
  port_forwarding:
    tcp_22: DENY
    tcp_3389: DENY
    tcp_5900: DENY
    tcp_445: DENY
    tcp_20128: DENY
    database_ports: DENY
  site_to_site_vpn_from_poipet: DENY
  site_to_site_vpn_from_warland: DENY
  route_advertisement_from_lab_nodes: DENY
  reverse_ssh_tunnels: DENY
```

### External nodes MUST NOT be:
- Tailscale subnet router into Core LAN
- ZeroTier bridge into Core LAN
- Cloudflare Tunnel connector routing to Core
- SSH reverse tunnel
- VPN peer advertising Mac's subnet
- CRD client holding Core account
- Agent holding Telegram/GitHub/Cloudflare/database credentials

---

## Local Editing-PC Policy

```yaml
local_editing_pc:
  network: SAME_LAN_AS_MAC
  role: [VIDEO_EDITING, FFMPEG, MEDIA_RENDERING]
  
  allowed:
    - receive_video_files_on_LAN
    - run_FFmpeg
    - edit_render
    - return_media_output
  
  denied_by_default:
    - core_database_direct_access
    - master_secrets
    - telegram_bot_token
    - github_admin_token
    - cloudflare_account_token
    - omniroute_admin_endpoint
    - full_home_directory_share
```

### Share Structure
```
Mac Mini M2
├── MEDIA_INBOX/       → Editing-PC read-only
├── MEDIA_WORK/        → Editing-PC read-write
├── MEDIA_OUTPUT/      → Editing-PC write, Mac validate
└── CORE_PRIVATE/      → Editing-PC DENIED
```

### Editing-PC Firewall
| Source | Destination | Action |
|--------|-------------|--------|
| Mac M2 | Editing-PC media | ALLOW |
| Editing-PC | Mac media share | ALLOW (exact port+IP) |
| Editing-PC | Core Database | **DENY** |
| Editing-PC | Secret Store | **DENY** |
| Internet | Editing-PC RDP/SSH | **DENY** |
| WarLand/Poipet | Editing-PC | **DENY** |

---

## External Lab Data Policy

### Allowed outbound to Lab
- public_urls
- public_repositories
- synthetic_test_data
- redacted_logs
- disposable_lab_credentials
- explicit_non_sensitive_job_manifest

### PROHIBITED outbound to Lab
- customer_personal_data
- production_database_exports
- private_business_documents
- payment_information
- private_media
- authentication_cookies
- browser_profiles
- ssh_private_keys
- api_tokens
- telegram_tokens
- github_write_tokens
- cloudflare_admin_tokens
- core_source_with_embedded_secrets
- mac_home_directory
- backup_encryption_keys

---

## Quarantine Pull Model

```
WarLand / Poipet
    │
    │ HTTPS PUT (scoped presigned URL only)
    ▼
Cloudflare R2: external-lab-quarantine bucket
    │
    │ Mac polls and pulls (Core initiates)
    ▼
Mac: quarantine/incoming
    │
    ├── SHA-256 hash verification
    ├── malware scan
    ├── archive inspection
    ├── MIME validation
    ├── secret scan
    └── manual/agent review
           │
           ▼
       verified/import
```

### Upload Ticket Policy
```yaml
external_upload_ticket:
  operation: PutObject
  object_key: external-lab/<node>/<job>/<artifact>
  expires_in: 10_minutes
  can_list_bucket: false
  can_read_core_objects: false
  can_overwrite_verified_objects: false
  core_credentials_on_lab_node: false
```

**Post-pull:** Revoke ticket → validate SHA-256 → move to verified → retention → receipt
**Forbidden:** Execute files from external lab directly on Mac.

---

## Canonical Lock Summary

| Item | Status |
|------|--------|
| Mac Mini + Editing-PC same LAN | ✅ CORRECTED |
| Poipet as production heavy worker | ❌ REMOVED |
| WarLand/Poipet as external lab | 🔒 LOCKED |
| Sensitive data to external lab | ❌ PROHIBITED |
| External lab remote back to core | ❌ PROHIBITED |
| Local Mac mobile remote access | ✅ PRESERVED |
| Actual device configuration changed | false (documentation only) |

---

## Node Identity Mapping (Canonical)

| Old Identity | New Identity | Trust Zone |
|-------------|-------------|------------|
| `poipet_pc_heavy_worker` | `local_mac_m2_core` | CORE_TRUSTED |
| (none) | `editing_pc_local` | LOCAL_PRODUCTION_WORKER |
| (none) | `warland_lab` | EXTERNAL_UNTRUSTED_LAB |
| (none) | `poipet_lab` | EXTERNAL_UNTRUSTED_LAB |
| (none) | `aiagent_unknown` | QUARANTINED |
