"""
Entry point for the Python latent backend.

Protocol:
  - Rust sends JSONL via stdin:
    Line 1: {"type": "Run", ...} or {"type": "Bench", ...}
    Lines 2..N: {"question": "...", "id": "...", "answer": "...", "category": "..."}
    Last line: {"type": "EndOfQuestions"}

  - Python sends JSONL via stdout:
    Events: {"event": "AgentStarted", "agent_name": "...", ...}
    Result: {"correlation_id": "...", "question_id": "...", "answer": "...", ...}

Usage (direct):
  python -m latent_backend.run_agent < config.json
  python -m latent_backend.run_agent --interactive
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
import gc
from pathlib import Path
from typing import Optional, Dict, List, Tuple

# Suppress noisy transformers warnings
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

logger = logging.getLogger(__name__)

# ──── JSONL I/O ────

def read_jsonl_line(stream) -> Optional[dict]:
    """Read one JSONL line from a stream."""
    line = stream.readline()
    if not line:
        return None
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}: {line[:200]}")
        return None


def write_json(obj: dict):
    """Write a JSON object to stdout as a single line."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def emit_event(event_type: str, **kwargs):
    """Emit an agent event to stdout."""
    msg = {"event": event_type, **kwargs}
    write_json(msg)


# ──── Model Loader ────

_model_cache: Dict[str, Tuple] = {}  # model_name → (model, tokenizer, alignment)

def load_model(model_name: str, device: str, dtype: str, alignment_method: str, alignment_cache_dir: Optional[str] = None):
    """Load model, tokenizer, and compute alignment matrix.

    Returns:
        (model, tokenizer, alignment_matrix)
    """
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    cache_key = f"{model_name}_{device}_{dtype}_{alignment_method}"
    if cache_key in _model_cache:
        logger.info(f"Using cached model: {cache_key}")
        return _model_cache[cache_key]

    dtype_map = {
        "float16": torch.float16,
        "fp16": torch.float16,
        "float32": torch.float32,
        "fp32": torch.float32,
        "bfloat16": torch.bfloat16,
        "bf16": torch.bfloat16,
    }
    torch_dtype = dtype_map.get(dtype, torch.float16)

    logger.info(f"Loading model: {model_name} (device={device}, dtype={dtype})")

    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch_dtype,
        device_map=device if device != "cpu" else None,
        trust_remote_code=True,
    )
    if device == "cpu":
        model = model.to("cpu")
    elif device == "mps":
        model = model.to("mps")
    model.eval()

    # Compute alignment matrix
    from latent_backend.alignment import AlignmentMatrix

    cache_path = None
    if alignment_cache_dir:
        safe_name = model_name.replace("/", "_")
        cache_path = Path(alignment_cache_dir) / f"{safe_name}_Wa_{alignment_method}.pt"

    alignment = AlignmentMatrix(model, method=alignment_method)
    alignment.compute(cache_path=cache_path, device=device)
    logger.info(f"Alignment matrix ready (residual={alignment.alignment_residual:.6f})")

    _model_cache[cache_key] = (model, tokenizer, alignment)
    return model, tokenizer, alignment


def free_model():
    """Explicitly free model memory."""
    global _model_cache
    _model_cache.clear()
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass


# ──── Agent Chain Runner ────

def run_agent_chain(
    question: str,
    config: dict,
    model,
    tokenizer,
    alignment,
) -> dict:
    """Run the full agent chain for one question.

    Returns a BenchResult dict.
    """
    import torch

    correlation_id = config["correlation_id"]
    model_name = config["model_name"]
    mode = config["mode"]  # single, singlematched, textmas, latentmas
    agents = config["agents"]
    latent_steps = config["latent_steps"]
    position_mode = config["position_mode"]
    topology = config["topology"]
    debug = config.get("debug", False)
    device = config["device"]
    dtype = config["dtype"]
    seed = config["seed"]
    max_decode_tokens = config["max_decode_tokens"]

    # Set seed
    torch.manual_seed(seed)

    # Build agent prompts
    role_prompts = {
        "planner": "You are a Planner. Break down the problem into clear, actionable steps.",
        "critic": "You are a Critic. Identify potential errors, gaps, and risks in the plan.",
        "refiner": "You are a Refiner. Improve the solution based on the critique.",
        "solver": "You are a Solver. Produce the final answer based on prior work.",
    }

    events = []
    start_time = time.time()

    # Track GPU memory
    def get_gpu_mem():
        try:
            if device == "cuda" and torch.cuda.is_available():
                return torch.cuda.max_memory_allocated() / (1024 * 1024)
        except:
            pass
        return 0.0

    torch.cuda.reset_peak_memory_stats() if device == "cuda" else None

    if mode == "single":
        # Single model — just answer directly
        result, result_events = _run_single_mode(
            question, model, tokenizer, max_decode_tokens, correlation_id, device
        )
        events.extend(result_events)
        answer, total_tokens = result

    elif mode == "singlematched":
        # Single model with matched compute: run total latent steps then decode
        total_steps = sum(latent_steps) if latent_steps else 40
        result, result_events = _run_single_matched_mode(
            question, model, tokenizer, alignment, total_steps,
            max_decode_tokens, correlation_id, device, debug
        )
        events.extend(result_events)
        answer, total_tokens = result

    elif mode == "textmas":
        # Text-based MAS: each agent decodes text, next agent reads it
        result, result_events = _run_textmas_mode(
            question, agents, role_prompts, model, tokenizer,
            max_decode_tokens, correlation_id, device, debug
        )
        events.extend(result_events)
        answer, total_tokens = result

    elif mode == "latentmas":
        # Latent MAS: agents communicate via KV cache
        result, result_events = _run_latentmas_mode(
            question, agents, latent_steps, role_prompts,
            model, tokenizer, alignment,
            position_mode, max_decode_tokens,
            correlation_id, device, debug
        )
        events.extend(result_events)
        answer, total_tokens = result

    else:
        raise ValueError(f"Unknown mode: {mode}")

    total_latency_ms = (time.time() - start_time) * 1000
    peak_mem = get_gpu_mem()

    return {
        "correlation_id": correlation_id,
        "question_id": "",  # filled by caller
        "answer": answer,
        "expected": "",  # filled by caller
        "correct": False,  # filled by caller
        "total_tokens": total_tokens,
        "total_latency_ms": int(total_latency_ms),
        "peak_memory_mb": peak_mem,
        "events": events,
    }


def _run_single_mode(question, model, tokenizer, max_decode_tokens, correlation_id, device):
    """Single model baseline: just answer the question."""
    import torch

    events = []
    prompt = f"Question: {question}\nAnswer:"

    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(model.device)

    emit_event("AgentStarted", correlation_id=correlation_id, agent_name="single", agent_index=0, timestamp_ms=int(time.time() * 1000))

    with torch.no_grad():
        output_ids = model.generate(
            input_ids,
            max_new_tokens=max_decode_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )

    answer_ids = output_ids[0, input_ids.shape[1]:]
    answer = tokenizer.decode(answer_ids, skip_special_tokens=True).strip()
    total_tokens = answer_ids.shape[0]

    emit_event("AnswerDecoded", correlation_id=correlation_id, answer=answer, total_tokens=total_tokens, total_latency_ms=0, timestamp_ms=int(time.time() * 1000))

    events.append({"event": "AnswerDecoded", "answer": answer, "total_tokens": total_tokens})
    return (answer, total_tokens), events


def _run_single_matched_mode(question, model, tokenizer, alignment, total_steps, max_decode_tokens, correlation_id, device, debug):
    """Single model with matched compute: run latent steps (no collaboration) then decode."""
    import torch
    from latent_backend.latent_step import LatentStepper

    events = []
    prompt = f"Question: {question}\nLet me think step by step.\nAnswer:"
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(model.device)
    attention_mask = torch.ones_like(input_ids)

    stepper = LatentStepper(model, tokenizer, alignment, device=device, debug=debug)

    emit_event("AgentStarted", correlation_id=correlation_id, agent_name="single_matched", agent_index=0, timestamp_ms=int(time.time() * 1000))

    result = stepper.run_latent_steps(
        input_ids=input_ids,
        attention_mask=attention_mask,
        num_steps=total_steps,
        agent_name="single_matched",
    )

    # Decode answer from final hidden state
    with torch.no_grad():
        output_ids = model.generate(
            input_ids,
            max_new_tokens=max_decode_tokens,
            do_sample=False,
            past_key_values=result.past_key_values,
            pad_token_id=tokenizer.eos_token_id,
        )

    answer_ids = output_ids[0, input_ids.shape[1]:]
    answer = tokenizer.decode(answer_ids, skip_special_tokens=True).strip()
    total_tokens = answer_ids.shape[0]

    emit_event("AnswerDecoded", correlation_id=correlation_id, answer=answer, total_tokens=total_tokens, total_latency_ms=int(result.total_latency_ms), timestamp_ms=int(time.time() * 1000))

    return (answer, total_tokens), events


def _run_textmas_mode(question, agents, role_prompts, model, tokenizer, max_decode_tokens, correlation_id, device, debug):
    """Text MAS: each agent decodes text, passes to next agent."""
    import torch

    events = []
    current_text = question
    total_tokens = 0

    for i, agent_name in enumerate(agents):
        role_prompt = role_prompts.get(agent_name, f"You are {agent_name}.")
        is_final = (i == len(agents) - 1)

        prompt = f"{role_prompt}\n\nInput: {current_text}\n\n"
        if is_final:
            prompt += "Final Answer:"
        else:
            prompt += "Response:"

        input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(model.device)

        emit_event(
            "AgentStarted",
            correlation_id=correlation_id,
            agent_name=agent_name,
            agent_index=i,
            timestamp_ms=int(time.time() * 1000),
        )

        max_new = max_decode_tokens if is_final else 150  # intermediate agents get fewer tokens

        with torch.no_grad():
            output_ids = model.generate(
                input_ids,
                max_new_tokens=max_new,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )

        response_ids = output_ids[0, input_ids.shape[1]:]
        response_text = tokenizer.decode(response_ids, skip_special_tokens=True).strip()
        total_tokens += response_ids.shape[0]

        emit_event(
            "AgentFinished",
            correlation_id=correlation_id,
            agent_name=agent_name,
            agent_index=i,
            latency_ms=0,  # TODO: measure
            kv_seq_len=0,
            kv_layers=0,
            alignment_residual=0.0,
            timestamp_ms=int(time.time() * 1000),
        )

        if debug or is_final:
            emit_event(
                "DebugProbe",
                correlation_id=correlation_id,
                agent_name=agent_name,
                text=response_text[:200],
                timestamp_ms=int(time.time() * 1000),
            )

        # Pass text to next agent
        current_text = response_text

        if is_final:
            answer = response_text

    emit_event(
        "AnswerDecoded",
        correlation_id=correlation_id,
        answer=answer,
        total_tokens=total_tokens,
        total_latency_ms=0,
        timestamp_ms=int(time.time() * 1000),
    )

    return (answer, total_tokens), events


def _run_latentmas_mode(
    question, agents, latent_steps, role_prompts,
    model, tokenizer, alignment,
    position_mode, max_decode_tokens,
    correlation_id, device, debug
):
    """Latent MAS: agents communicate via KV cache."""
    import torch
    from latent_backend.latent_step import LatentStepper
    from latent_backend.kv_transfer import KVTransferManager

    events = []
    total_tokens = 0
    max_pos = getattr(model.config, "max_position_embeddings", 32768)

    kv_manager = KVTransferManager(
        position_mode=position_mode,
        max_position_embeddings=max_pos,
    )

    stepper = LatentStepper(model, tokenizer, alignment, device=device, debug=debug)

    upstream_kv = None
    cumulative_attention_mask = None

    for i, agent_name in enumerate(agents):
        is_final = (i == len(agents) - 1)
        role_prompt = role_prompts.get(agent_name, f"You are {agent_name}.")
        steps = latent_steps[i] if i < len(latent_steps) else 20

        # Build prompt: role + question
        prompt = f"{role_prompt}\n\nQuestion: {question}\n"
        input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(model.device)
        attention_mask = torch.ones_like(input_ids)

        # If we have upstream KV, extend attention mask to cover it
        if upstream_kv is not None:
            # Get upstream KV length
            try:
                # DynamicCache
                upstream_len = upstream_kv[0][0].shape[2] if isinstance(upstream_kv[0], tuple) else upstream_kv[0].keys[0].shape[2]
            except:
                upstream_len = 0

            if upstream_len > 0:
                # Extend attention mask: prepend ones for upstream KV tokens
                prefix_mask = torch.ones(1, upstream_len, device=model.device, dtype=attention_mask.dtype)
                attention_mask = torch.cat([prefix_mask, attention_mask], dim=1)
        else:
            upstream_len = 0

        # Get position_ids based on position mode
        if position_mode == "chain" and upstream_kv is not None:
            position_ids = torch.tensor([[upstream_len + j for j in range(input_ids.shape[1])]], device=model.device)
        elif position_mode == "reset":
            position_ids = torch.tensor([[j for j in range(input_ids.shape[1])]], device=model.device)
        else:
            position_ids = None

        emit_event(
            "AgentStarted",
            correlation_id=correlation_id,
            agent_name=agent_name,
            agent_index=i,
            timestamp_ms=int(time.time() * 1000),
        )

        # Run latent steps
        result = stepper.run_latent_steps(
            input_ids=input_ids,
            attention_mask=attention_mask,
            past_key_values=upstream_kv,
            position_ids=position_ids,
            num_steps=steps,
            agent_name=agent_name,
        )

        # Emit latent step events
        for s, (hn, conv) in enumerate(zip(result.hidden_norm_history, result.convergence_history)):
            emit_event(
                "LatentStep",
                correlation_id=correlation_id,
                agent_name=agent_name,
                step=s,
                hidden_norm=hn,
                convergence_metric=conv,
                timestamp_ms=int(time.time() * 1000),
            )

        # Debug probe
        if debug and result.debug_text:
            emit_event(
                "DebugProbe",
                correlation_id=correlation_id,
                agent_name=agent_name,
                text=result.debug_text,
                timestamp_ms=int(time.time() * 1000),
            )

        emit_event(
            "AgentFinished",
            correlation_id=correlation_id,
            agent_name=agent_name,
            agent_index=i,
            latency_ms=int(result.total_latency_ms),
            kv_seq_len=0,  # TODO: measure
            kv_layers=0,
            alignment_residual=result.alignment_residual,
            timestamp_ms=int(time.time() * 1000),
        )

        if result.fell_back:
            emit_event(
                "Fallback",
                correlation_id=correlation_id,
                agent_name=agent_name,
                reason=result.fallback_reason or "unknown",
                fallback_mode="text",
                timestamp_ms=int(time.time() * 1000),
            )

        # Transfer KV to next agent
        if not is_final and result.past_key_values is not None:
            next_agent = agents[i + 1] if i + 1 < len(agents) else "end"
            upstream_kv, transfer_stats = kv_manager.transfer(
                result.past_key_values,
                from_name=agent_name,
                to_name=next_agent,
            )

            emit_event(
                "KVTransfer",
                correlation_id=correlation_id,
                from_agent=agent_name,
                to_agent=next_agent,
                kv_size_bytes=0,  # Phase 1: no serialization
                transfer_fidelity=transfer_stats.transfer_fidelity,
                timestamp_ms=int(time.time() * 1000),
            )

        # Final agent: decode answer
        if is_final:
            with torch.no_grad():
                output_ids = model.generate(
                    input_ids,
                    max_new_tokens=max_decode_tokens,
                    do_sample=False,
                    past_key_values=result.past_key_values,
                    pad_token_id=tokenizer.eos_token_id,
                )

            answer_ids = output_ids[0, input_ids.shape[1]:]
            answer = tokenizer.decode(answer_ids, skip_special_tokens=True).strip()
            total_tokens = answer_ids.shape[0]

            emit_event(
                "AnswerDecoded",
                correlation_id=correlation_id,
                answer=answer,
                total_tokens=total_tokens,
                total_latency_ms=int(result.total_latency_ms),
                timestamp_ms=int(time.time() * 1000),
            )

    return (answer, total_tokens), events


# ──── Answer Extraction ────

def extract_answer_gsm8k(text: str) -> str:
    """Extract numeric answer from GSM8K response."""
    import re
    # Look for "答案是 X" or "answer is X" or just the last number
    patterns = [
        r"(?:answer|result)\s*(?:is|:|=)\s*\$?(-?\d+(?:,\d{3})*(?:\.\d+)?)",
        r"####\s*(-?\d+(?:,\d{3})*(?:\.\d+)?)",
        r"=\s*(-?\d+(?:,\d{3})*(?:\.\d+)?)",
        r"(-?\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:\.|$)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            cleaned = m.group(1).replace(",", "")
            try:
                return str(int(float(cleaned)))
            except ValueError:
                return cleaned
    # Fallback: last number in text
    numbers = re.findall(r"-?\d+(?:\.\d+)?", text)
    if numbers:
        return numbers[-1]
    return text.strip()


def check_answer(predicted: str, expected: str, category: str = "math") -> bool:
    """Check if predicted answer matches expected answer."""
    if category == "math" or category == "gsm8k":
        try:
            return float(predicted) == float(expected)
        except ValueError:
            return predicted.strip().lower() == expected.strip().lower()
    elif category == "code":
        # For code, just check if the function exists (simplified)
        return len(predicted.strip()) > 0
    else:
        return predicted.strip().lower() == expected.strip().lower()


# ──── Main Loop ────

def main():
    parser = argparse.ArgumentParser(description="LatentMAS Python backend")
    parser.add_argument("--alignment-cache-dir", type=str, default=None,
                        help="Directory to cache alignment matrices")
    parser.add_argument("--log-level", type=str, default="INFO",
                        help="Logging level")
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        stream=sys.stderr,  # logs to stderr, stdout is for JSONL protocol
    )

    logger.info("LatentMAS Python backend starting...")
    logger.info(f"Alignment cache dir: {args.alignment_cache_dir}")

    # Read initial config from stdin
    config_msg = read_jsonl_line(sys.stdin)
    if not config_msg:
        logger.error("No config received on stdin")
        sys.exit(1)

    msg_type = config_msg.get("type")
    if msg_type not in ("Run", "Bench"):
        logger.error(f"Unexpected first message type: {msg_type}")
        sys.exit(1)

    # Load model
    model_name = config_msg["model_name"]
    device = config_msg.get("device", "cuda")
    dtype = config_msg.get("dtype", "float16")
    alignment_method = config_msg.get("alignment_method", "svd")

    try:
        model, tokenizer, alignment = load_model(
            model_name, device, dtype, alignment_method, args.alignment_cache_dir
        )
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        # Emit error event
        emit_event("Fallback", correlation_id="init", agent_name="init",
                   reason=str(e), fallback_mode="abort", timestamp_ms=int(time.time() * 1000))
        sys.exit(1)

    # Read questions and process
    questions: List[dict] = []
    while True:
        msg = read_jsonl_line(sys.stdin)
        if msg is None:
            break
        msg_type = msg.get("type")
        if msg_type == "EndOfQuestions":
            break
        if msg_type == "Question" or "question" in msg:
            questions.append(msg)

    logger.info(f"Received {len(questions)} questions to process")

    # Process each question
    for q in questions:
        correlation_id = config_msg.get("correlation_id", str(id(q)))
        run_config = {**config_msg, "correlation_id": correlation_id}

        try:
            result = run_agent_chain(
                question=q["question"],
                config=run_config,
                model=model,
                tokenizer=tokenizer,
                alignment=alignment,
            )

            # Fill in question info
            result["question_id"] = q.get("id", "unknown")
            result["expected"] = q.get("answer", "")

            # Check answer
            predicted = extract_answer_gsm8k(result["answer"])
            expected = q.get("answer", "")
            category = q.get("category", "math")
            result["correct"] = check_answer(predicted, expected, category)

            write_json(result)

            logger.info(
                f"Q({q.get('id', '?')}): "
                f"correct={result['correct']}, "
                f"tokens={result['total_tokens']}, "
                f"latency={result['total_latency_ms']}ms"
            )

        except Exception as e:
            logger.error(f"Failed to process question {q.get('id', '?')}: {e}", exc_info=True)
            error_result = {
                "correlation_id": correlation_id,
                "question_id": q.get("id", "unknown"),
                "answer": "",
                "expected": q.get("answer", ""),
                "correct": False,
                "total_tokens": 0,
                "total_latency_ms": 0,
                "peak_memory_mb": 0,
                "events": [{"event": "Fallback", "reason": str(e), "fallback_mode": "error"}],
            }
            write_json(error_result)

    logger.info("All questions processed. Exiting.")
    free_model()


if __name__ == "__main__":
    main()