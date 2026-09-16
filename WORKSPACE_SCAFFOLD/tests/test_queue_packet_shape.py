"""A2A queue packet shape tests."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE_DIR = ROOT / "_A2A_QUEUE" / "inbox"


class QueuePacketShapeTests(unittest.TestCase):
    """Validate all queue packets have required fields."""

    def test_example_packets_have_required_fields(self):
        """Each packet must include id, project, priority, title, agent, status, risk, input, output, approval_required."""
        all_packets = []
        for subdir in ("inbox", "working", "outbox", "done", "blocked"):
            all_packets.extend(QUEUE_DIR.parent.joinpath(subdir).glob("packet_*.json"))
        self.assertGreater(len(all_packets), 0, "No queue packets found")
        required = {"id", "project", "priority", "title", "agent", "status", "risk", "input", "output", "approval_required"}
        for path in all_packets:
            with self.subTest(path=path.name):
                data = json.loads(path.read_text(encoding="utf-8"))
                missing = required - set(data.keys())
                self.assertEqual(missing, set(), f"Missing fields: {missing}")


if __name__ == "__main__":
    unittest.main()
