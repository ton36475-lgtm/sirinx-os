# Local Model Policy

**Date:** 2026-06-30
**Host:** Mac mini M2

---

## Policy

- Small local models only when needed
- No heavy GPU/CPU jobs that disturb Mac mini M2
- No large model downloads automatically
- No long-running inference loops
- No production model serving

## Allowed

- Summarize documents (local)
- Classify tasks (local)
- Draft local plans (local)
- Assist low-cost review (local)

## Not Allowed

- Download model weights without explicit gate
- Train/fine-tune models without explicit gate
- Run GPU inference without explicit gate
- Call paid provider APIs without explicit gate
