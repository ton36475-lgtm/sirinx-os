"""
Alignment matrix computation.

Three methods:
1. Ridge regression (analytic, pseudo-inverse)
2. Truncated SVD (numerically stable, recommended)
3. Learned (fine-tuned, future)

The alignment matrix W_a maps from hidden-state space to input-embedding space,
enabling latent thoughts to be fed back into the model via inputs_embeds.

    e_{t+1} = h_t @ W_a

where:
    h_t ∈ R^{d_hidden}  (last-layer hidden state)
    e_{t+1} ∈ R^{d_embed}  (aligned embedding for next forward pass)
    W_a ∈ R^{d_hidden × d_embed}
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class AlignmentMatrix:
    """Computes and caches the alignment matrix W_a."""

    def __init__(self, model: nn.Module, method: str = "svd", ridge_lambda: float = 1.0, svd_rank: int = 512):
        """
        Args:
            model: HuggingFace causal LM model.
            method: 'ridge', 'svd', or 'learned'.
            ridge_lambda: Ridge regression regularization (for 'ridge' method).
            svd_rank: Truncation rank for SVD (for 'svd' method).
        """
        self.model = model
        self.method = method
        self.ridge_lambda = ridge_lambda
        self.svd_rank = svd_rank
        self.W_a: Optional[torch.Tensor] = None
        self._alignment_residual: float = 0.0

        # Extract embedding matrices
        self._extract_matrices()

    def _extract_matrices(self):
        """Extract W_in (input embeddings) and W_out (output/lm_head) from model."""
        config = self.model.config

        # Input embeddings: get_input_embeddings()
        W_in = self.model.get_input_embeddings().weight.data  # (vocab, d_embed)
        self.W_in = W_in

        # Output embeddings: get_output_embeddings()
        W_out_module = self.model.get_output_embeddings()
        if W_out_module is None:
            # Tied embeddings — use input embeddings as output
            logger.info("Model has tied embeddings — using W_in as W_out")
            self.W_out = W_in
            self._tied = True
        else:
            self.W_out = W_out_module.weight.data  # (vocab, d_hidden) or (vocab, d_embed)
            self._tied = False

        self.d_vocab, self.d_embed = W_in.shape
        self.d_hidden = W_out_module.out_features if W_out_module else self.d_embed

        logger.info(
            f"Alignment matrices extracted: "
            f"W_in=({self.d_vocab}, {self.d_embed}), "
            f"W_out=({self.d_vocab}, {self.d_hidden if not self._tied else self.d_embed}), "
            f"tied={self._tied}"
        )

    def compute(self, cache_path: Optional[Path] = None, device: str = "cuda") -> torch.Tensor:
        """Compute alignment matrix W_a.

        Args:
            cache_path: If provided, load/save W_a from/to this path.
            device: Device to compute on.

        Returns:
            W_a tensor of shape (d_hidden, d_embed).
        """
        # Check cache
        if cache_path and cache_path.exists():
            logger.info(f"Loading cached alignment matrix from {cache_path}")
            self.W_a = torch.load(cache_path, map_location=device, weights_only=True)
            self._compute_residual()
            logger.info(f"Alignment residual (cached): {self._alignment_residual:.6f}")
            return self.W_a

        logger.info(f"Computing alignment matrix using method='{self.method}'...")

        if self.method == "ridge":
            self.W_a = self._compute_ridge(device)
        elif self.method == "svd":
            self.W_a = self._compute_svd(device)
        elif self.method == "learned":
            raise NotImplementedError("Learned alignment not yet implemented")
        else:
            raise ValueError(f"Unknown alignment method: {self.method}")

        self._compute_residual()
        logger.info(f"Alignment residual: {self._alignment_residual:.6f}")

        # Save cache
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(self.W_a.cpu(), cache_path)
            logger.info(f"Alignment matrix cached to {cache_path}")

        return self.W_a

    def _compute_ridge(self, device: str) -> torch.Tensor:
        """Ridge regression: W_a = (W_out^T W_out + λI)^{-1} W_out^T W_in.

        For large vocab, this is computed in chunks to avoid OOM.
        """
        W_out = self.W_out.to(device).float()  # (vocab, d_hidden) or (vocab, d_embed)
        W_in = self.W_in.to(device).float()    # (vocab, d_embed)

        # If tied (W_out = W_in), alignment is identity-ish
        if self._tied:
            d = W_in.shape[1]
            W_a = torch.eye(d, device=device, dtype=torch.float32)
            return W_a

        # W_out^T W_out ∈ R^{d_hidden × d_hidden}
        # For Qwen3-4B: d_hidden=2048, so this is manageable (2048×2048)
        # But for larger models (d_hidden=4096+), chunk the vocab dimension
        chunk_size = min(8192, W_out.shape[0])
        num_chunks = (W_out.shape[0] + chunk_size - 1) // chunk_size

        logger.info(f"Ridge regression: {num_chunks} chunks of {chunk_size}")

        # Accumulate: Wout^T @ Wout = Σ chunk^T @ chunk
        d_h = W_out.shape[1]
        WtW = torch.zeros(d_h, d_h, device=device, dtype=torch.float32)
        Wt_Win = torch.zeros(d_h, W_in.shape[1], device=device, dtype=torch.float32)

        for i in range(num_chunks):
            start = i * chunk_size
            end = min(start + chunk_size, W_out.shape[0])
            chunk = W_out[start:end, :]       # (chunk, d_hidden)
            chunk_in = W_in[start:end, :]     # (chunk, d_embed)

            WtW += chunk.t() @ chunk
            Wt_Win += chunk.t() @ chunk_in

        # Regularize and solve
        # W_a = (WtW + λI)^{-1} Wt_Win
        reg = self.ridge_lambda * torch.eye(d_h, device=device, dtype=torch.float32)
        WtW_reg = WtW + reg

        # Use Cholesky decomposition for stable solving
        # (WtW + λI) is positive definite since λ > 0
        try:
            L = torch.linalg.cholesky(WtW_reg)
            W_a = torch.cholesky_solve(Wt_Win, L)
        except Exception as e:
            logger.warning(f"Cholesky failed ({e}), falling back to LU")
            W_a = torch.linalg.solve(WtW_reg, Wt_Win)

        return W_a.to(self.W_in.dtype)

    def _compute_svd(self, device: str) -> torch.Tensor:
        """Truncated SVD-based alignment.

        Factorize W_out = U Σ V^T, then approximate the pseudo-inverse:
            W_out^+ = V Σ^{-1} U^T
            W_a = W_out^+ W_in = V Σ^{-1} U^T W_in

        Truncate to top-r singular values for stability and compression.
        """
        W_out = self.W_out.to(device).float()  # (vocab, d_hidden)
        W_in = self.W_in.to(device).float()    # (vocab, d_embed)

        if self._tied:
            d = W_in.shape[1]
            return torch.eye(d, device=device, dtype=torch.float32).to(self.W_in.dtype)

        # SVD of W_out: (vocab, d_hidden) → U (vocab, d_hidden), S (d_hidden,), Vt (d_hidden, d_hidden)
        rank = min(self.svd_rank, W_out.shape[1])
        logger.info(f"Computing truncated SVD (rank={rank}) of W_out ({W_out.shape})...")

        # Use lowrank=True for memory efficiency on large vocab
        U, S, Vt = torch.linalg.svd(W_out, full_matrices=False)
        # Truncate
        U_r = U[:, :rank]       # (vocab, rank)
        S_r = S[:rank]           # (rank,)
        Vt_r = Vt[:rank, :]     # (rank, d_hidden)

        # Pseudo-inverse: V Σ^{-1} U^T
        # W_a = (V_r) Σ_r^{-1} U_r^T W_in
        # = Vt_r^T @ diag(1/S_r) @ U_r^T @ W_in
        S_inv = torch.diag(1.0 / (S_r + 1e-8))  # (rank, rank)
        # Compute step by step for memory
        # U_r^T @ W_in = (rank, vocab) @ (vocab, d_embed) = (rank, d_embed)
        Ut_Win = U_r.t() @ W_in  # (rank, d_embed)
        # S_inv @ Ut_Win = (rank, rank) @ (rank, d_embed) = (rank, d_embed)
        S_Ut_Win = S_inv @ Ut_Win
        # Vt_r^T @ S_Ut_Win = (d_hidden, rank) @ (rank, d_embed) = (d_hidden, d_embed)
        W_a = Vt_r.t() @ S_Ut_Win

        return W_a.to(self.W_in.dtype)

    def _compute_residual(self):
        """Compute alignment quality: ||W_a W_out - W_in||_F / ||W_in||_F."""
        if self.W_a is None:
            return
        with torch.no_grad():
            self.W_a_f = self.W_a.float().to(self.W_out.device)
            W_out_f = self.W_out.float()
            W_in_f = self.W_in.float()

            if self._tied:
                self._alignment_residual = 0.0
                return

            reconstructed = self.W_a_f @ W_out_f.t()  # (d_hidden, vocab) → should match W_in^T
            # W_in is (vocab, d_embed), so W_in^T is (d_embed, vocab)
            # W_a W_out^T should be (d_hidden, vocab)? No.
            # Actually W_a ∈ (d_hidden, d_embed), W_out ∈ (vocab, d_hidden)
            # W_a @ W_out.t() = (d_hidden, d_hidden) — this measures how well W_a reconstructs
            # But we want: for a given hidden h, e = h W_a should map to embedding space.
            # And h = x W_out for input token embedding x.
            # So e = x W_out W_a should ≈ x W_in.
            # Hence W_out W_a ≈ W_in, and residual = ||W_out W_a - W_in||_F / ||W_in||_F
            residual = (W_out_f @ self.W_a_f) - W_in_f  # (vocab, d_embed)
            numerator = torch.norm(residual, p='fro')
            denominator = torch.norm(W_in_f, p='fro')
            if denominator > 0:
                self._alignment_residual = (numerator / denominator).item()
            else:
                self._alignment_residual = float('inf')

    @property
    def alignment_residual(self) -> float:
        """Quality metric: ||W_out W_a - W_in||_F / ||W_in||_F. Lower is better."""
        return self._alignment_residual

    def align(self, hidden_state: torch.Tensor) -> torch.Tensor:
        """Map hidden state to input embedding space.

        Args:
            hidden_state: (batch, seq, d_hidden)

        Returns:
            aligned embedding: (batch, seq, d_embed)
        """
        if self.W_a is None:
            raise RuntimeError("Alignment matrix not computed. Call compute() first.")

        # Move W_a to same device/dtype as hidden_state
        W_a = self.W_a.to(hidden_state.device, dtype=hidden_state.dtype)
        return hidden_state @ W_a