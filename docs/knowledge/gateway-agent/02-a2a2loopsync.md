# A2A2LoopSync Contract

Status: local evidence loop

## Work Loop

```text
Goal -> Plan -> PRD -> Issues -> Tasks -> Diff -> Verify -> Approval Packet -> Stop
```

## Knowledge Loop

```text
Event -> Evidence -> Provenance -> Knowledge Split -> Retrieval -> Next Plan
```

## Sync Barrier

Every packet produced by the loop must include:

```text
partId
owner
runtime
sourceRefs
evidence
blockedActions
nextExactStep
```

## Behavior

A2A2LoopSync writes no external state. It is the local handoff shape that lets Codex, Hermes TUI, Gemini CLI, and the 47 Ronin lanes share a plan without losing provenance or skipping approval gates.
