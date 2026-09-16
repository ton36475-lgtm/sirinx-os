"""
KV cache transfer and memory management between agents.

In Phase 1 (single-process), KV transfer is a no-op — the cache stays in GPU
memory and is passed directly to the next forward pass.

This module provides:
- Direct KV passthrough (Phase 1)
- KV compression (Phase 2+)
- KV fidelity measurement
- Position ID management
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict

import torch

logger = logging.getLogger(__name__)


@dataclass
class KVTransferStats:
    """Statistics for a KV cache transfer."""
    from_agent: str
    to_agent: str
    transfer_fidelity: float
    transfer_time_ms: float
    in_process: bool
    fell_back: bool
    fallback_reason: Optional[str] = None


class KVTransferManager:
    """Manages KV cache transfer between agents."""

    def __init__(
        self,
        position_mode: str = "chain",
        max_position_embeddings: int = 32768,
        position_offset: int = 0,
    ):
        """
        Args:
            position_mode: 'chain' (continue position_ids),
                           'reset' (reset to 0),
                           'offset' (start at fixed offset).
            max_position_embeddings: Model's max position embedding size.
            position_offset: Offset for 'offset' mode.
        """
        self.position_mode = position_mode
        self.max_position_embeddings = max_position_embeddings
        self.position_offset = position_offset
        self._current_position: int = 0

    def transfer(
        self,
        kv_cache: Optional[Tuple],
        from_name: str,
        to_name: str,
    ) -> Tuple[Optional[Tuple], KVTransferStats]:
        """Transfer KV cache from one agent to the next.

        In Phase 1, this is a direct passthrough (same process, same GPU memory).
        No serialization, no copy.

        Args:
            kv_cache: Past key values from upstream agent.
            from_name: Name of upstream agent.
            to_name: Name of downstream agent.

        Returns:
            (transferred_kv, transfer_stats)
        """
        import time
        start = time.time()

        if kv_cache is None:
            stats = KVTransferStats(
                from_agent=from_name,
                to_agent=to_name,
                transfer_fidelity=1.0,
                transfer_time_ms=0.0,
                in_process=True,
                fell_back=False,
            )
            return None, stats

        # Phase 1: Direct passthrough — KV stays in GPU memory
        transferred_kv = kv_cache  # No copy needed!

        # Calculate fidelity (trivially 1.0 for passthrough)
        fidelity = 1.0

        # Update current position based on KV length
        kv_len = self._get_kv_length(kv_cache)

        if self.position_mode == "chain":
            self._current_position = kv_len
        elif self.position_mode == "reset":
            self._current_position = 0
        elif self.position_mode == "offset":
            self._current_position = self.position_offset

        # Check for position overflow
        fell_back = False
        fallback_reason = None
        if self._current_position + kv_len > self.max_position_embeddings:
            logger.warning(
                f"Position overflow: {self._current_position + kv_len} > "
                f"{self.max_position_embeddings}. Falling back to reset mode."
            )
            self._current_position = 0
            fell_back = True
            fallback_reason = "position_overflow"

        latency_ms = (time.time() - start) * 1000

        stats = KVTransferStats(
            from_agent=from_name,
            to_agent=to_name,
            transfer_fidelity=fidelity,
            transfer_time_ms=latency_ms,
            in_process=True,
            fell_back=fell_back,
            fallback_reason=fallback_reason,
        )

        logger.info(
            f"KV transfer [{from_name}→{to_name}]: "
            f"len={kv_len}, fidelity={fidelity:.6f}, "
            f"position={self._current_position}, "
            f"fallback={fell_back}"
        )

        return transferred_kv, stats

    def get_position_ids(self, seq_len: int) -> torch.Tensor:
        """Get position_ids for the next forward pass.

        Args:
            seq_len: Length of the new input tokens.

        Returns:
            position_ids tensor of shape (1, seq_len).
        """
        # On first call, if reset mode, use offset
        start = self._current_position

        # If we have a KV cache and we're in chain mode, positions should continue
        # from where the KV cache left off
        # In chain mode, _current_position was set by transfer() to kv_len
        # New tokens start at _current_position, so:
        position_ids = torch.arange(
            start, start + seq_len,
            dtype=torch.long,
            device="cpu",
        ).unsqueeze(0)  # (1, seq_len)

        return position_ids

    def update_position(self, new_tokens: int):
        """Update current position after generating new tokens."""
        self._current_position += new_tokens

    def _get_kv_length(self, kv_cache: Tuple) -> int:
        """Get sequence length from KV cache.

        KV cache shape: tuple of (key, value) per layer.
        key shape: (batch, num_heads, seq_len, head_dim)
        """
        if kv_cache is None:
            return 0
        try:
            # Different models have different KV cache formats
            # Transformers format: tuple of (key, value) per layer
            first_layer = kv_cache[0]
            if isinstance(first_layer, tuple):
                # (key, value) format
                return first_layer[0].shape[2]
            elif hasattr(first_layer, 'keys'):
                # DynamicCache format
                return first_layer.keys[0].shape[2]
            else:
                return 0
        except (IndexError, AttributeError):
            return 0

    def concatenate_kv(
        self,
        upstream_kv: Optional[Tuple],
        current_kv: Optional[Tuple],
    ) -> Optional[Tuple]:
        """Concatenate KV from upstream agent with current agent's KV.

        This enables the current agent to attend to all upstream agents' KV.

        Args:
            upstream_kv: KV from upstream agents.
            current_kv: KV from current agent.

        Returns:
            Concatenated KV cache.
        """
        if upstream_kv is None:
            return current_kv
        if current_kv is None:
            return upstream_kv

        # Concatenate each layer's K and V along sequence dimension
        # Phase 1: Direct concat (may need to handle different formats)
        try:
            if isinstance(upstream_kv[0], tuple):
                # (key, value) format
                return tuple(
                    (
                        torch.cat([up_k[0], cur_k[0]], dim=2),
                        torch.cat([up_k[1], cur_k[1]], dim=2),
                    )
                    for up_k, cur_k in zip(upstream_kv, current_kv)
                )
            else:
                # DynamicCache or other format — need more handling
                # For Phase 1, just return upstream and let the model handle it
                logger.warning("KV concatenation for DynamicCache not yet implemented")
                return upstream_kv
        except Exception as e:
            logger.error(f"KV concatenation failed: {e}")
            return upstream_kv  # Fallback: just use upstream


def compress_kv_topk(kv_cache: Tuple, k: int) -> Tuple:
    """Compress KV cache by keeping only top-k key-value pairs.

    This is a Phase 2+ feature. For now, it's a stub.

    Args:
        kv_cache: Full KV cache.
        k: Number of KV pairs to keep.

    Returns:
        Compressed KV cache.
    """
    # TODO: Implement attention-score-based KV pruning
    # For now, just truncate to the last k entries
    logger.warning(f"KV compression (top-k) not fully implemented — truncating to last {k}")
    return tuple(
        (
            layer_kv[0][:, :, -k:, :],  # keys
            layer_kv[1][:, :, -k:, :],  # values
        )
        for layer_kv in kv_cache
    )


def measure_kv_fidelity(original_kv: Tuple, compressed_kv: Tuple) -> float:
    """Measure fidelity: ||original - compressed||_F / ||original||_F.

    Lower is better. 0.0 = perfect fidelity (no loss).

    Args:
        original_kv: Original KV cache.
        compressed_kv: Compressed KV cache.

    Returns:
        Fidelity metric in [0, ∞).
    """
    try:
        total_diff = 0.0
        total_norm = 0.0

        for (orig_k, orig_v), (comp_k, comp_v) in zip(
            [(l[0].float(), l[1].float()) for l in original_kv],
            [(l[0].float(), l[1].float()) for l in compressed_kv],
        ):
            # Compare overlapping segments
            min_len = min(orig_k.shape[2], comp_k.shape[2])
            total_diff += (orig_k[:, :, :min_len] - comp_k[:, :, :min_len]).norm().item()
            total_diff += (orig_v[:, :, :min_len] - comp_v[:, :, :min_len]).norm().item()
            total_norm += orig_k[:, :, :min_len].norm().item()
            total_norm += orig_v[:, :, :min_len].norm().item()

        if total_norm == 0:
            return 0.0
        return total_diff / total_norm
    except Exception as e:
        logger.warning(f"KV fidelity measurement failed: {e}")
        return float('inf')