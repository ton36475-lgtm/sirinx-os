#!/usr/bin/env python3
import json
import sys
import urllib.request
import time

model = sys.argv[1] if len(sys.argv) > 1 else "gemma4:12b-mlx"

prompt = """You are a coding agent. Review this TypeScript API route pattern and propose a safe refactor plan with validation gates, no file mutation, no secret read, and no deploy. Return concise steps and a receipt schema."""

payload = {
    "model": model,
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": 0.2,
        "num_predict": 512
    }
}

start_time = time.time()
req = urllib.request.Request(
    "http://localhost:11434/api/generate",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=300) as res:
        data = json.loads(res.read().decode("utf-8"))
    total_time = time.time() - start_time
    eval_count = data.get("eval_count", 0)
    eval_duration_ns = data.get("eval_duration", 0)
    
    tok_per_sec = eval_count / (eval_duration_ns / 1_000_000_000) if eval_duration_ns else 0
    
    result = {
        "model": model,
        "eval_count": eval_count,
        "eval_duration_sec": round(eval_duration_ns / 1_000_000_000, 3),
        "tokens_per_second": round(tok_per_sec, 2),
        "wall_time_sec": round(total_time, 3),
        "status": "success"
    }
except Exception as e:
    result = {
        "model": model,
        "error": str(e),
        "status": "failed"
    }

print(json.dumps(result, indent=2))