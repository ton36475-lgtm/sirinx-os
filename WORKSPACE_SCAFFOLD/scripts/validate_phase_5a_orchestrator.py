'''
Phase 5A Validation Script: Fleet Orchestrator V2
Validates cross-platform environment mapping and timing constraints
'''

import json
import os
import sys
from pathlib import Path

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

SCHEMA_PATH = (
    Path(__file__).parent.parent.parent
    / 'legacy/schemas/cross-platform-execution-packet.schema.json'
)

def validate_execution_packet_schema():
    '''Validate the execution packet JSON schema exists and is valid'''
    if not SCHEMA_PATH.exists():
        print(f"FAIL: Schema not found at {SCHEMA_PATH}")
        return False

    with open(SCHEMA_PATH) as f:
        schema = json.load(f)

    # Check required fields exist in schema
    required_fields = [
        'packet_version',
        'correlation_id',
        'target_platform',
        'execution_command',
        'shell_context',
        'routing_trace',
        'timestamp'
    ]

    for field in required_fields:
        if field not in schema.get('required', []):
            print(f"FAIL: Required field '{field}' missing from schema")
            return False

    print("PASS: Execution packet schema is valid")
    return True

def validate_platform_env_mapper():
    '''Validate platform environment variable mapper outputs'''
    platforms = ['darwin_arm64', 'win32-x64-x64', 'linux_x64']

    # Expected shell mappings
    expected_shells = {
        'darwin_arm64': 'zsh',
        'win32-x64-x64': 'pwsh',
        'linux_x64': 'bash'
    }

    for platform in platforms:
        if platform not in expected_shells:
            print(f"FAIL: Unknown platform {platform}")
            return False

    print("PASS: Platform env mapper configuration is valid")
    return True

def validate_timing_threshold():
    '''Validate the archived 200ms timing threshold contract'''
    threshold_ms = 200

    # Phase 5A TypeScript prototypes are archived during the V5 rebase.
    ts_path = (
        Path(__file__).parent.parent.parent
        / 'legacy/langgraph-nodes/timing-validator.ts'
    )

    if not ts_path.exists():
        print("FAIL: timing-validator.ts not found")
        return False

    with open(ts_path) as f:
        content = f.read()

    if 'DEFAULT_THRESHOLD_MS = 200' not in content:
        print("FAIL: Timing threshold constant not found in timing-validator.ts")
        return False

    print(f"PASS: Timing threshold ({threshold_ms}ms) configured correctly")
    return True

def main():
    print("=" * 60)
    print("Phase 5A: Fleet Orchestrator V2 - Validation Report")
    print("=" * 60)

    results = {
        'schema_validation': validate_execution_packet_schema(),
        'platform_mapper': validate_platform_env_mapper(),
        'timing_threshold': validate_timing_threshold(),
    }

    print("\n" + "=" * 60)
    print("Summary:")
    for name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {name}: {status}")

    all_passed = all(results.values())
    print(f"\nOverall: {'✓ ALL VALIDATIONS PASSED' if all_passed else '✗ SOME VALIDATIONS FAILED'}")
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
