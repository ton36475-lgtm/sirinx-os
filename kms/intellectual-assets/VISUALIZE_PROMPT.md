# VISUALIZE_PROMPT — For Claude Design

> ใช้ prompt นี้กับ Claude Design / image-generate เพื่อได้ infographic ของ assets เหล่า

---

## Prompt

```text
Visualize my MD file as a clean, professional infographic. 

Source files to include: 
- MASTER_INDEX.md (table view)
- Each module's PERSONA.md (key values + rules)
- Decision matrix (Pipeline vs Agent vs Hybrid + A0–A7 + T0–T8)

Style:
- Dark theme (#0f172a background, #e2e8f0 text)
- Minimalist, technical aesthetic
- Icons for each module: 🧠 (Founder), ⚙️ (Operator), ☀️ (Solar)
- Tables should be readable as collapsed groups on mobile
- Include a small "claim guard" badge for Solar section

Output: HTML file that can be dropped into SIRINX web assets
```

## Suggested alt text for image

"SIRINX Intellectual Assets — Full Bundle D showing Operator OS (engineer mindset), Solar GOD AI (claim-safe Thai persona), and Founder Thinking OS (Brainstorm 4-round loop) modules in dark technical theme"

---

## Metadata (for Claude Design auto-detect)

```
aspect: landscape
category: sirinx-intellectual-assets
use_case: internal-dashboard hero
```