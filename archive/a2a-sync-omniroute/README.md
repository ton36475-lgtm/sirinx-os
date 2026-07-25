# A2A Sync System with OmniRoute

Agent-to-Agent synchronization system for computer-use sessions via Kimi/cmux.

## Architecture

```
Agent A (Maker) → Kimi CLI → Cmux Session → OmniRoute Broadcast
                                                     ↓
Agent B (Checker) ← OmniRoute Receive ← State Layer (PostgreSQL)
```

## Components

- **OmniRoute Client**: WebSocket + REST client for A2A messaging
- **State Layer**: PostgreSQL-backed event log for session tracking
- **Cmux Manager**: Session isolation and context switching
- **Kimi Wrapper**: Computer-use execution with handoff support

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Start OmniRoute (if not running)
# Location depends on your OmniRoute setup

# Run A2A sync orchestrator
python a2a_core.py
```

## Usage

```python
import asyncio
from a2a_core import A2ASyncOrchestrator

async def main():
    orchestrator = A2ASyncOrchestrator()
    await orchestrator.start(agent_id="maker_agent")
    
    # Create new session
    await orchestrator.create_session(
        session_id="session_001",
        payload={"task": "Computer use task"}
    )
    
    # Handoff to another agent
    await orchestrator.handoff_session(
        session_id="session_001",
        to_agent_id="checker_agent"
    )

asyncio.run(main())
```

## Safety

- All sessions logged to state layer
- Handoffs require mutual acknowledgment
- Rollback support for failed handoffs
- No automatic execution without approval

## Next Steps

1. Start OmniRoute server
2. Configure PostgreSQL for state layer
3. Test end-to-end handoffs
4. Integrate with GhostClaw governance
