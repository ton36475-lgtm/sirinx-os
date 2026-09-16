"""Security Sentinel: public waxwing exposure scan."""
import unittest
from pathlib import Path


class PublicSignerExposureTests(unittest.TestCase):
    """Ensure waxwing signer is not exposed in public-facing files."""

    def test_no_waxwing_in_public_docs(self):
        """waxwing must only appear in internal docs, never public-facing paths."""
        root = Path(__file__).resolve().parents[2]
        public_dirs = [root / "apps" / "pocket-hatchery" / "web", root / "docs"]
        for public_dir in public_dirs:
            if not public_dir.exists():
                continue
            for path in public_dir.rglob("*"):
                if path.is_file() and path.stat().st_size < 5_000_000:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                    self.assertNotIn("waxwing", text.lower(), f"waxwing exposed in {path}")


if __name__ == "__main__":
    unittest.main()
