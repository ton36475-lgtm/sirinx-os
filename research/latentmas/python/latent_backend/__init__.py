"""
Latent Backend — Python inference engine for LatentMAS.

This module implements:
- Latent thought generation (hidden state extraction → alignment → feedback)
- KV cache transfer between agents
- Alignment matrix computation (ridge / SVD / learned)
- Multi-agent chain execution
- Benchmark infrastructure

Protocol: Reads JSONL from stdin, writes JSONL events to stdout.
"""

__version__ = "0.1.0"