---
version: alpha
name: SIRINX Controlled Operations
description: Premium technical design system for controlled AI operations brand. Clean energy intelligence with glassmorphic panels, emerald/cyan accents, and authoritative typography.
colors:
  primary: "#12241D"
  primary-strong: "#0a1512"
  paper: "#F3F6F1"
  paper-strong: "#FBFCF7"
  muted: "#52635C"
  line: "#CDD8CF"
  green: "#1B6B55"
  green-dark: "#103C31"
  cyan: "#10D8D2"
  solar: "#F0BD63"
  amber: "#D3902F"
  red: "#B34B42"
  blue: "#263F88"
  blue-soft: "#E5EBFB"
  white: "#FFFFFF"
  ink: "#12241D"
typography:
  h1:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: 5.7rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  h2:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: 2.7rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  h3:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: 1.18rem
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Avenir Next, 'Segoe UI', Verdana, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "Avenir Next, 'Segoe UI', Verdana, sans-serif"
    fontSize: 0.76rem
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: "Avenir Next, 'Segoe UI', Verdana, sans-serif"
    fontSize: 0.78rem
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0"
    textTransform: uppercase
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
spacing:
  micro: "8px"
  compact: "16px"
  grid: "24px"
  margin: "32px"
  section: "48px"
  panel: "64px"
  hero: "96px"
  limit: "128px"
components:
  button-primary:
    backgroundColor: "#103C31"
    textColor: "#FBFCF7"
    rounded: "7px"
    padding: "12px 16px"
    min-height: "44px"
    font-weight: 750
  button-primary-hover:
    backgroundColor: "#1B6B55"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#52635C"
    border: "1px solid #CDD8CF"
    rounded: "7px"
    padding: "12px 16px"
    min-height: "44px"
    font-weight: 700
  card:
    backgroundColor: "rgba(251, 253, 247, 0.84)"
    border: "1px solid #CDD8CF"
    rounded: "8px"
    padding: "20px"
  principles-panel:
    backgroundColor: "#15251F"
    border: "1px solid rgba(255, 255, 255, 0.1)"
    rounded: "8px"
    padding: "16px"
    color: "#F7FAF4"
  line-main-card:
    backgroundColor: "#10211B"
    border: "1px solid rgba(255, 255, 255, 0.1)"
    rounded: "16px"
    padding: "32px"
    color: "#F7FAF4"
  contact-panel:
    backgroundColor: "#15251F"
    border: "1px solid rgba(255, 255, 255, 0.1)"
    rounded: "16px"
    padding: "20px"
    color: "#F7FAF4"
  floating-trigger-desktop:
    backgroundColor: "#12241D"
    textColor: "#FBFCF7"
    rounded: "7px"
    width: "44px"
    height: "44px"
  qr-container:
    backgroundColor: "#FFFFFF"
    rounded: "16px"
    padding: "16px"
    max-width: "280px"
  mobile-bottom-sheet:
    backgroundColor: "#15251F"
    rounded: "16px 16px 0 0"
    padding: "20px"
    color: "#F7FAF4"
---

## Overview

SIRINX website design system centers on controlled AI operations for serious work. Premium technical aesthetic with glassmorphic panels, 8px spacing scale, and clean energy visual language. Brand tone: trustworthy, technical, clean energy + AI.

## Colors

- **Primary (#12241D):** Deep ink for headlines, core text, and authority
- **Emerald (#1B6B55):** Brand accent for primary actions and links
- **Cyan (#10D8D2):** Solar energy highlight, used sparingly
- **Amber (#D3902F):** Warning and emphasis for key metrics
- **Paper (#F3F6F1):** Off-white background with subtle grid pattern

## Typography

Authority through serif headlines (Georgia), clarity through sans-serif body (Avenir Next). Large hero typography creates premium presence.

## Layout

8px spacing system throughout. Section padding at 48px, hero at 96px minimum.

## Elevation & Depth

Glassmorphic cards use subtle translucent backgrounds (84% opacity) with backdrop blur. Shadows are soft: `0 24px 80px rgba(30, 38, 31, 0.15)`.

## Shapes

Rounded corners at 8px for cards, 16px for panels. Sharp corners intentionally avoided to reduce visual aggression.

## Components

- `button-primary`: Emerald background for main CTAs
- `button-secondary`: Transparent with border for secondary actions
- `line-cta`: Dedicated LINE button with icon, fits beside primary CTA
- `floating-contact-cluster`: Desktop dock (LINE + Inquiry side-by-side), mobile sheet (compact overlay)
- `line-main-card`: Dark glassmorphic panel with cyan/solar accent bar

## Do's and Don'ts

**Do:**
- Use 8px spacing scale consistently
- Keep LINE green (#00C300) for LINE-specific UI only
- Use glassmorphic panels for contact overlays
- Maintain mobile-first responsive breakpoints

**Don't:**
- Don't use arbitrary pixel values (no p-[37px])
- Don't hide primary CTA on mobile
- Don't overlap floating widgets with content
- Don't add fake reviews or unverified claims