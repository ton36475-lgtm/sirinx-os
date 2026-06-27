# Video Department — ตะวัน

**GHOSTCLAW Co-Worker #3:** Video
**Authority Stack:** Hermes → Opus → Codex → GLM/DeepSeek → KOB

---

## Department Scope

- Storyboarding & visual planning
- AI character generation & animation
- Video production workflow
- Platform optimization (YouTube, TikTok, IG)
- Audio design & voice-over coordination
- Render queue management

## Worker Routing

| Task Type | Primary Agent | Secondary |
|---|---|---|
| Video strategy design | Opus | — |
| Video pipeline code | Codex | GLM/DeepSeek |
| Storyboard generation | GLM-5.2 | DeepSeek |
| AI character prompts | GLM-5.2 | DeepSeek |
| Platform optimization | DeepSeek | GLM-5.2 |
| Render validation | KOB | — |

## File Map

```
server/departments/video/         ← Backend logic
client/src/components/ghostclaw/video/     ← Frontend components
docs/departments/VIDEO_AGENT.md            ← This file
```

## Quality Standards

- Storyboards must be complete before production
- AI character generation requires approval before render
- Platform specs must be current (resolution, aspect ratio, duration)
- Audio must sync with video timeline
- No render/export without human approval (per AGENTS.md)
