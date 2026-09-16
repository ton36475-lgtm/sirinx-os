# SIRINX Website LINE QR Link Recheck

Status: LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN
Date: 2026-07-06T21:20:24+0700
Scope: `apps/sirinx-site`
Mode: local_only_read_only_line_qr_link_recheck_no_message_send
Deploy: not run
Push: not run
External message send: not run
LINE webhook: not activated

## Purpose

This packet verifies the LINE Official QR image and public LINE links in read-only mode. It reduces pre-review risk, but it does not replace a real-device QR scan.

## LINE Official Data

- Display name: SIRINX โซล่าเซลล์
- Basic ID: `@304zrttj`
- Short link: `https://lin.ee/S97R6nj`
- Add Friend URL: `https://line.me/R/ti/p/%40304zrttj`
- Chat URL: `https://line.me/R/oaMessage/%40304zrttj`
- QR image URL: `https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr`

## QR Asset

- HTTP status: 200
- PNG signature: valid
- Width: 360
- Height: 360
- Bytes: 24045
- SHA-256: `8211596f38bafec06b8c0ceafe444f0dfe9746196c4684c9604f11c6a7a1639a`
- Acceptable for local review: yes

## Link Responses

| Link | HTTP status | Location | Acceptable read-only response |
| --- | --- | --- | --- |
| shortLink | 301 | https://line.me/R/ti/p/@304zrttj?ts=07020215&oat_content=url | yes |
| addFriendUrl | 200 | - | yes |
| chatUrl | 302 | / | yes |

## Manual Evidence Still Required

- real_device_qr_scan
- confirm_LINE_account_display_name_on_phone
- confirm_add_friend_or_chat_path_on_real_device

## Closed Gates

- deploy: blocked
- push: blocked
- line_webhook: blocked
- production_analytics: blocked
- crm_customer_data_storage: blocked
- customer_data_collection: blocked
- external_message_send: blocked
- provider_call: blocked
- paid_provider_call: blocked
- public_tunnel: blocked
- package_install: blocked
- production_mutation: blocked
- database_write_or_migration: blocked
- secret_or_env_read: blocked

## Next Safe Action

Scan the QR on a real device and confirm it opens SIRINX โซล่าเซลล์ before any deploy approval.

This recheck does not prove the QR was scanned on a real phone and does not grant deploy approval.
