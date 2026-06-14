# PEA Off-Peak Calendar Source Capture - 2025

## Source

- Official page: <https://www.pea.co.th/announcements/off-peak-calendar>
- Official image asset found on page: <https://www.pea.co.th/sites/default/files/documents/off-peak/off-peak-2568.jpg>
- Source year: 2568 / 2025
- Captured: 2026-06-01

## Finding

The PEA page is live and official, but the exposed calendar image is for 2568 / 2025. Treat this as a historical source capture, not as the 2569 / 2026 operating calendar.

The calendar image marks Off-Peak dates in green for TOU usage. This is useful for SIRINX solar, battery, EV charging, and TOU billing simulations after the year and source asset are validated.

## Local Integration Boundary

- Safe now: store source URLs, year metadata, and source-quality notes locally.
- Blocked now: writing to Supabase, creating production tables, or treating this as the 2026 calendar.
- Approval phrase for Supabase write: `APPROVE_SUPABASE_WRITE_PEA_OFFPEAK`.

## Suggested Supabase Table Draft

```sql
create table pea_offpeak_calendars (
  id uuid primary key default gen_random_uuid(),
  source_year_be integer not null,
  source_year_ce integer not null,
  source_page_url text not null,
  source_image_url text not null,
  source_status text not null,
  official_current_year_on_page boolean not null default false,
  requires_manual_review boolean not null default true,
  captured_at timestamptz not null default now()
);
```

Do not run this migration until the operator approves Supabase mutation.
