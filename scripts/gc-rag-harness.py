#!/usr/bin/env python3
"""
GC-RAG-HARNESS — RAG + Harness Engineering Integration Loop

Connects:
  gc-runtime-core (Rust) ←→ gc-orch (Go) ←→ Agent Fleet

Pipeline:
  Agent → Evaluate → Store → Retrieve → Improve → Evolve

Architecture (Rust & Go only — zero Python in production):
  ┌─────────────────────────────────────────────┐
  │  Rust Core (gc-runtime-core)                │
  │  ├── Vector Store (memory-mapped f32)       │
  │  ├── RAG Engine (cosine-sim search)         │
  │  └── Harness Trainer (eval + improve)       │
  ├─────────────────────────────────────────────┤
  │  Go Orchestration (gc-orch)                 │
  │  ├── Bridge (A2A2A agent sync)              │
  │  ├── Queue (Priority P0-P3)                 │
  │  └── Monitor (agent health)                 │
  └─────────────────────────────────────────────┘
"""

import json, subprocess, sys, os, time
from pathlib import Path

SIRINX_ROOT = Path(os.environ.get("SIRINX_PROJECT_ROOT", "/Users/sirinx/sirinx-os"))
RUNTIME = SIRINX_ROOT / ".ghostclaw_runtime"
GC_NEURAL = os.environ.get("GC_NEURAL", f"{SIRINX_ROOT}/target/debug/gc-neural")
GC_NEURAL_FALLBACK = str(SIRINX_ROOT / "crates/gc-runtime-core/target/debug/gc-neural")

def neural(*args: str) -> dict:
    """Call gc-neural CLI (Rust binary)."""
    binary = GC_NEURAL if os.path.exists(GC_NEURAL) else GC_NEURAL_FALLBACK
    if not os.path.exists(binary):
        return {"error": f"gc-neural not found at {binary}"}
    try:
        result = subprocess.run(
            [binary, *args],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip()}
        return json.loads(result.stdout)
    except Exception as e:
        return {"error": str(e)}

def gc_orch(path: str = "/status", method: str = "GET") -> dict:
    """Call gc-orch HTTP API (Go)."""
    import urllib.request
    try:
        req = urllib.request.Request(f"http://localhost:8721{path}", method=method)
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def collect_agent_data() -> list:
    """Collect training data from gc-orch agent queue state."""
    queue_data = gc_orch("/queue")
    if isinstance(queue_data, dict):
        queue = queue_data.get("items", queue_data.get("queue", []))
    elif isinstance(queue_data, list):
        queue = queue_data
    else:
        queue = []
    
    if isinstance(queue, dict):
        # Flatten P0/P1/P2/P3 structure
        samples = []
        for tier, items in queue.items():
            if isinstance(items, list):
                for item in items:
                    samples.append(_item_to_sample(item, tier))
        return samples
    
    samples = []
    for item in queue:
        samples.append(_item_to_sample(item, "P2"))
    return samples

def _item_to_sample(item: dict, default_tier: str = "P2") -> dict:
    """Convert a queue item to a training sample."""
    if isinstance(item, str):
        return {"agent": "unknown", "task": item, "tier": default_tier,
                "status": "pending", "passed": False, "timestamp": time.time()}
    return {
        "agent": item.get("agent", item.get("assigned_to", "unknown")),
        "task": item.get("task", item.get("id", item.get("title", "unknown"))),
        "tier": item.get("tier", item.get("priority", default_tier)),
        "status": item.get("status", "pending"),
        "passed": item.get("status") == "completed",
        "timestamp": time.time(),
    }

def run_harness_eval(training_samples: list) -> dict:
    """Evaluate agent performance using gc-neural harness."""
    for sample in training_samples:
        result = neural("harness", "eval",
            sample.get("agent", "?"),
            sample.get("task", "?"),
            str(sample.get("passed", False)).lower()
        )
        sample["eval"] = result
    return {"samples_evaluated": len(training_samples), "samples": training_samples}

def run_rag_sync(docs_path: str = None) -> dict:
    """Store evaluation results as RAG embeddings via Rust engine."""
    if docs_path is None:
        docs_path = str(RUNTIME / "neural")
    
    result = neural("rag", "store", docs_path)
    return result

def run_improvement_loop() -> dict:
    """Self-Evolution Loop: collect → eval → store → improve."""
    print("🧠 GC RAG-HARNESS: Self-Evolution Loop Start")
    print("=" * 60)
    
    # Step 1: Collect agent data
    print("📥 Step 1: Collecting agent training data...")
    samples = collect_agent_data()
    print(f"   → {len(samples)} samples collected")
    
    # Step 2: Evaluate with Harness
    print("📊 Step 2: Running Harness evaluation...")
    eval_result = run_harness_eval(samples)
    passed = sum(1 for s in eval_result.get("samples", []) if s.get("eval", {}).get("passed"))
    print(f"   → {passed}/{len(samples)} passed evaluation")
    
    # Step 3: Store in Vector DB
    print("💾 Step 3: Storing to Vector DB (Rust RAG)...")
    store_result = run_rag_sync()
    print(f"   → {store_result.get('stored', '?')} vectors stored")
    
    # Step 4: Generate improvements
    print("🔄 Step 4: Generating improvement recommendations...")
    improvements: list[dict] = []
    if eval_result.get("samples"):
        for s in eval_result["samples"]:
            eval_data = s.get("eval", {})
            if not eval_data.get("passed", True):
                improvements.append({
                    "agent": s["agent"],
                    "task": s["task"],
                    "gap": eval_data.get("gap", "performance"),
                    "action": eval_data.get("recommendation", "retrain"),
                })
        if improvements:
            print(f"   → {len(improvements)} improvement gaps identified")
            for imp in improvements:
                print(f"     ⚠️  {imp['agent']}: {imp['gap']} → {imp['action']}")
        else:
            print("   → No improvement gaps found (all passing)")
    
    print("=" * 60)
    print("✅ Self-Evolution Loop Complete")
    
    return {
        "samples": len(samples),
        "passed": passed,
        "improvements": improvements if 'improvements' in dir() else [],
        "store_result": store_result,
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "loop":
        result = run_improvement_loop()
        print(json.dumps(result, indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "check":
        # Health check
        status = {
            "rust": neural("status"),
            "go": gc_orch("/status"),
        }
        print(json.dumps(status, indent=2))
    else:
        print("Usage: python3 gc-rag-harness.py {loop|check}")
        print("  loop  — Run full self-evolution loop")
        print("  check — Check Rust and Go service health")
