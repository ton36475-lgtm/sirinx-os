# Reverse Engineering Handoff Protocol

## Handoff Fields

- Mission ID:
- Current packet:
- Confirmed sources:
- Inferences:
- Unknowns:
- Build lease candidate:
- Validation commands:
- Receipt path:
- Next owner:

## Routing

1. Researcher prepares the Build Packet.
2. Policy Guardian checks blocked actions.
3. Validator confirms the packet is actionable and safe.
4. Hermes opens the next scoped build packet.
5. Codex mutates only leased files.
6. OpenCode reviews the completed packet read-only.

## Handoff Message Template

```text
Mission: <mission_id>
Status: build_packet_ready
Source evidence: <paths>
Allowed files: <paths>
Forbidden files: <paths>
Validation: <commands>
Receipt: <path>
Next safe action: <single action>
Blocked until separate gate: push, deploy, provider call, cloud mutation, live send, secret read.
```
