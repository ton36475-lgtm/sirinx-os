---
name: youtube-live-extractor
version: 1.0.0
description: Monitor and extract knowledge from YouTube live streams
owner: Hermes
autonomy: A4
tools:
  - youtube-live-monitor
  - knowledge-extraction
  - obsidian-storage
---

# YouTube Live Knowledge Extractor

## Purpose
Watch live stream → extract knowledge → store in Obsidian brain

## Live Stream Target
URL: https://www.youtube.com/live/FeX7eMenpYI
Topic: LLM Deployment & Hardware Capacity Planning

## Extraction Workflow
1. Poll live status every 30s
2. Capture chat/messages
3. Extract key technical points
4. Summarize every 5 minutes
5. Store to knowledge base

## Knowledge Storage
Location: /Users/sirinx/Documents/Obsidian Vault/SIRINX/Live Knowledge/
Format: markdown with timestamp

## Safety
- No public upload
- Local only
- Redact PII