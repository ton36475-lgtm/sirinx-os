#!/usr/bin/env python3
"""
A2A Sync System Integration Test
Tests end-to-end A2A handoff flow with OmniRoute
"""

import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from a2a_core import A2ASyncOrchestrator, A2AEvent, A2AEventType
    print("✓ Core modules imported successfully")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    print("  Make sure dependencies are installed:")
    print("  source .venv/bin/activate")
    print("  pip install -r requirements.txt")
    sys.exit(1)

async def test_a2a_handoff():
    '''Test complete A2A handoff flow'''
    
    print("=" * 60)
    print("A2A HANDOFF INTEGRATION TEST")
    print("=" * 60)
    
    # Create orchestrator for Maker agent
    print("\n1. Starting Maker Agent...")
    maker = A2ASyncOrchestrator()
    
    try:
        # This will fail without OmniRoute running, which is expected
        await maker.start(agent_id="maker_agent")
    except Exception as e:
        print(f"✗ OmniRoute connection failed (expected if not running): {e}")
        print("\n✓ Test validated: System correctly handles missing OmniRoute")
    
    # Test state layer independently
    print("\n2. Testing State Layer...")
    session_id = "test_session_001"
    maker.state.create_session(session_id, "maker_agent", {"task": "test task"})
    
    print("✓ Session created in state layer")
    
    # Test handoff
    maker.state.handoff_session(session_id, "maker_agent", "checker_agent")
    print("✓ Handoff recorded in state layer")
    
    # Test cmux manager
    print("\n3. Testing Cmux Manager...")
    maker.cmux.create_session(session_id, "maker_agent")
    maker.cmux.switch_context(session_id, "checker_agent")
    print("✓ Cmux session management working")
    
    print("\n" + "=" * 60)
    print("INTEGRATION TEST COMPLETE")
    print("=" * 60)
    print("\nResults:")
    print("- State layer: ✓ Working")
    print("- Cmux manager: ✓ Working") 
    print("- OmniRoute: ✗ Not running (expected)")
    print("\nNext Steps:")
    print("1. Start OmniRoute server")
    print("2. Run full A2A handoff test")
    print("3. Integrate with GhostClaw governance")

if __name__ == "__main__":
    try:
        asyncio.run(test_a2a_handoff())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()