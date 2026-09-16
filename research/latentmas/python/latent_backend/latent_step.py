"""
Latent thought generation module.

Implements the core latent step:
1. Run forward pass with output_hidden_states=True and use_cache=True
2. Extract last-layer hidden state h_t
3. Align h_t → embedding space via W_a
4. Feed aligned embedding back via inputs_embeds
5. Repeat for m steps
6. Optionally emit debug text probe

Key innovation: NO token decoding between agents. Only the final agent decodes.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


@dataclass
class LatentStepResult:
    """Result of a single latent step."""
    hidden_norm: float
    convergence_metric: float  # ||h_t - h_{t-1}|| / ||h_{t-1}||
    past_key_values: Optional[Tuple] = None
    hidden_state: Optional[torch.Tensor] = None


@dataclass
class LatentAgentResult:
    """Result of running all latent steps for one agent."""
    agent_name: str
    agent_index: int
    latent_steps_completed: int
    total_latency_ms: float
    past_key_values: Optional[Tuple] = None
    final_hidden_state: Optional[torch.Tensor] = None
    debug_text: Optional[str] = None
    alignment_residual: float = 0.0
    convergence_history: List[float] = field(default_factory=list)
    hidden_norm_history: List[float] = field(default_factory=list)
    fell_back: bool = False
    fallback_reason: Optional[str] = None


class LatentStepper:
    """Executes latent steps for a single agent."""

    def __init__(
        self,
        model: nn.Module,
        tokenizer,
        alignment_matrix,  # AlignmentMatrix
        device: str = "cuda",
        dtype: torch.dtype = torch.float16,
        convergence_threshold: float = 1e-4,
        debug: bool = False,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.alignment = alignment_matrix
        self.device = device
        self.dtype = dtype
        self.convergence_threshold = convergence_threshold
        self.debug = debug

    @torch.no_grad()
    def run_latent_steps(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        past_key_values: Optional[Tuple] = None,
        position_ids: Optional[torch.Tensor] = None,
        num_steps: int = 40,
        agent_name: str = "agent",
    ) -> LatentAgentResult:
        """Run m latent steps for a single agent.

        Args:
            input_ids: Token IDs for the agent prompt + question. (1, seq_len)
            attention_mask: Attention mask. (1, seq_len)
            past_key_values: KV cache from upstream agents (optional).
            position_ids: Position IDs. If None, computed from past KV length.
            num_steps: Number of latent steps to run.
            agent_name: Name of the agent (for logging).

        Returns:
            LatentAgentResult with final KV cache and hidden states.
        """
        start_time = time.time()
        self.model.eval()

        # Step 0: Prefill — run forward pass on the prompt
        # Get hidden states and initial KV cache
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            past_key_values=past_key_values,
            position_ids=position_ids,
            use_cache=True,
            output_hidden_states=True,
            return_dict=True,
        )

        # Extract last-layer hidden state from the last token
        # hidden_states is a tuple: (n_layers+1,) of (batch, seq_len, d_hidden)
        # We take the last layer and last token
        all_hidden = outputs.hidden_states  # tuple of (batch, seq, d)
        last_hidden = all_hidden[-1]       # (1, seq_len, d_hidden)
        h_t = last_hidden[:, -1:, :]       # (1, 1, d_hidden) — last token only

        # Update KV cache from prefill
        current_kv = outputs.past_key_values
        current_kv_len = current_kv[0][0].shape[2] if current_kv else input_ids.shape[1]

        # Position for next step
        current_position = current_kv_len

        # Update attention mask to cover KV cache
        kv_len = current_kv_len
        full_attention_mask = torch.ones(
            1, kv_len + 1, device=self.device, dtype=attention_mask.dtype
        )

        convergence_history = []
        hidden_norm_history = []
        prev_h = h_t.clone()

        steps_completed = 0
        fell_back = False
        fallback_reason = None

        for step in range(num_steps):
            try:
                # Align: h_t → e_{t+1} = h_t @ W_a
                e_t = self.alignment.align(h_t)  # (1, 1, d_embed)

                # Forward pass with inputs_embeds (using aligned embedding)
                # We feed just one new token (the latent thought)
                step_outputs = self.model(
                    inputs_embeds=e_t,
                    attention_mask=full_attention_mask,
                    past_key_values=current_kv,
                    position_ids=torch.tensor([[current_position]], device=self.device),
                    use_cache=True,
                    output_hidden_states=True,
                    return_dict=True,
                )

                # Extract new hidden state
                new_hidden = step_outputs.hidden_states[-1]  # (1, 1, d_hidden)
                h_t = new_hidden

                # Update KV cache
                current_kv = step_outputs.past_key_values
                current_position += 1
                full_attention_mask = torch.cat([
                    full_attention_mask,
                    torch.ones(1, 1, device=self.device, dtype=full_attention_mask.dtype)
                ], dim=1)
                kv_len += 1

                # Metrics
                h_norm = h_t.norm().item()
                conv = (h_t - prev_h).norm().item() / (prev_h.norm().item() + 1e-10)

                hidden_norm_history.append(h_norm)
                convergence_history.append(conv)
                steps_completed += 1

                if conv < self.convergence_threshold and step > 0:
                    logger.debug(f"[{agent_name}] Converged at step {step} (conv={conv:.8f})")
                    break

                prev_h = h_t.clone()

            except Exception as e:
                logger.error(f"[{agent_name}] Latent step {step} failed: {e}")
                fell_back = True
                fallback_reason = str(e)
                break

        # Debug text probe (optional)
        debug_text = None
        if self.debug and num_steps > 0:
            try:
                debug_text = self._emit_debug_probe(h_t, current_kv, max_tokens=50)
                logger.info(f"[{agent_name}] Debug probe: {debug_text}")
            except Exception as e:
                logger.warning(f"[{agent_name}] Debug probe failed: {e}")
                debug_text = f"[probe failed: {e}]"

        latency_ms = (time.time() - start_time) * 1000

        return LatentAgentResult(
            agent_name=agent_name,
            agent_index=0,  # set by caller
            latent_steps_completed=steps_completed,
            total_latency_ms=latency_ms,
            past_key_values=current_kv,
            final_hidden_state=h_t,
            debug_text=debug_text,
            alignment_residual=self.alignment.alignment_residual,
            convergence_history=convergence_history,
            hidden_norm_history=hidden_norm_history,
            fell_back=fell_back,
            fallback_reason=fallback_reason,
        )

    @torch.no_grad()
    def _emit_debug_probe(
        self,
        hidden_state: torch.Tensor,
        past_key_values: Optional[Tuple],
        max_tokens: int = 50,
    ) -> str:
        """Decode a short text probe from the current hidden state.

        This does NOT affect the latent path — it's purely for debugging.
        """
        # Use the lm_head to get logits from the hidden state
        lm_head = self.model.get_output_embeddings()
        if lm_head is None:
            return "[no lm_head available]"

        logits = lm_head(hidden_state)  # (1, 1, vocab)
        next_token = logits[0, -1].argmax(dim=-1)

        # Greedy decode a few tokens
        tokens = [next_token.item()]
        current_token = next_token.unsqueeze(0)  # (1, 1)

        for _ in range(max_tokens - 1):
            outputs = self.model(
                input_ids=current_token,
                past_key_values=past_key_values,
                use_cache=True,
                return_dict=True,
            )
            logits = outputs.logits[0, -1]
            next_token = logits.argmax(dim=-1)
            tokens.append(next_token.item())
            current_token = next_token.unsqueeze(0)
            past_key_values = outputs.past_key_values

            # Stop at EOS
            if self.tokenizer.eos_token_id is not None and next_token.item() == self.tokenizer.eos_token_id:
                break

        return self.tokenizer.decode(tokens, skip_special_tokens=True).strip()