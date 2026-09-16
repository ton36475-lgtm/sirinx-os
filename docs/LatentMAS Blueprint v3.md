# LatentMAS: Research Blueprint v3
## A Latent Collaboration Framework for Multi-Agent LLM Systems

> **Text is the interface for humans. Latent/KV should be the transport layer between agents.**

**Status:** SRL-2 (local working baseline)
**Repository:** `research/latentmas/` within SIRINX OS monorepo
**Parent Governance:** `AGENTS.md` (root), `research/latentmas/AGENTS.md` (scoped)

---

## 1. Abstract / Executive Summary

LatentMAS implements a multi-agent LLM collaboration framework where agents
communicate via latent representations (hidden states / KV cache) instead of
text. Based on the paper "Latent Collaboration in Multi-Agent Systems" which
demonstrated 70.8%–83.7% token reduction and 4×–4.3× inference speedup vs
text-based multi-agent systems (TextMAS), this project builds a local research
prototype with rigorous experimental validation.

The system uses a Rust orchestrator managing a Python HuggingFace backend,
running sequential 4-agent chains (Planner → Critic → Refiner → Solver) on
Qwen3 and Llama3 family models. The Rust orchestrator handles agent graph
definition, scheduling, metrics collection, and benchmarking while the Python
backend manages model loading, alignment matrix computation, latent step
generation, and KV cache transfer.

The gateway service (`services/latentmas-gateway/`) integrates LatentMAS into
the SIRINX OS monorepo with dry-run-by-default safety, audit logging, and
correlation IDs — following the same governance pattern as all SIRINX OS
subsystems.

This blueprint defines 10 experiments with full factorial design, statistical
rigor (bootstrap CI, Cohen's d, Bonferroni correction), 5 ablation studies,
probing methodology, scaling law analysis, and a 6-phase roadmap from MVP
to research publication.

---

## 2. Theoretical Framework

### 2.1 Information-Theoretic Foundation

Agent communication can be formalized as an information channel. Let
$h_i \in \mathbb{R}^d$ be the hidden state of agent $i$, and $h_j$ be the
hidden state of the next agent $j$.

**Mutual information between agent latent states:**

$$I(h_i; h_j) = \sum_{h_i, h_j} p(h_i, h_j) \log \frac{p(h_i, h_j)}{p(h_i) p(h_j)}$$

**Information bottleneck formulation:**

The optimal latent representation minimizes:

$$\mathcal{L}_{IB} = I(h_i; X) - \beta \cdot I(h_i; h_j)$$

where $X$ is the input, $\beta$ controls the trade-off between compression
(minimize $I(h_i; X)$) and relevance (maximize $I(h_i; h_j)$).

**Why latent communication is tighter than text:**

Text has an entropy floor of $\sim \log(|\text{vocab}|)$ bits per token. For
a vocabulary of 151,646 tokens (Qwen3), this is $\sim 17.2$ bits per token.
A hidden state $h \in \mathbb{R}^d$ with $d = 2560$ (4B model) in float16
carries $2560 \times 16 = 40,960$ bits of information — though not all is
useful signal.

The **text tax** of text-based agent communication is:

$$\text{TextTax} = L_{\text{text}} \times \log(|\text{vocab}|) + 2 \times C_{\text{codec}}$$

where $L_{text}$ is the text length, and $C_{\text{codec}}$ is the
encode/decode cost (one round-trip per agent hop). Latent communication
eliminates this tax by directly passing representations.

### 2.2 Error Propagation in Agent Chains

Error propagation across $n$ agents in a chain:

$$E_n = \sum_{i=1}^{n} E_i \cdot \prod_{j=i+1}^{n} (1 + \delta_j)$$

where $E_i$ is agent-local error and $\delta_j$ is the amplification factor
of agent $j$.

**Text communication amplifies error** because each hop requires:
1. Encode: hidden state → logits → token (lossy quantization to vocab)
2. Decode: token → embedding → hidden state (information loss)

This round-trip introduces **irreversible information loss** per hop.

**Latent communication reduces error** because the alignment matrix $W_a$
performs a direct linear map:
$$e_{t+1} = h_t \cdot W_a$$

No quantization to vocab space occurs. The error propagation becomes:

$$E_n^{\text{latent}} = \sum_{i=1}^{n} E_i \cdot \prod_{j=i+1}^{n} (1 + \delta_j^{\text{latent}})$$

where $\delta_j^{\text{latent}} < \delta_j^{\text{text}}$ when the alignment
matrix is well-conditioned (see §2.4).

**Condition for latent MAS to outperform text MAS:**

$$\|W_a W_{\text{out}} - W_{\text{in}}\|_F < \epsilon_{\text{text}}$$

where $\epsilon_{\text{text}}$ is the information loss from text
round-tripping.

### 2.3 KV Cache as Working Memory: A Memory Perspective

The KV cache is an **associative memory store** where queries (new hidden
states) match against keys (stored from prior positions) to retrieve values
(prior hidden states).

**Relationship to key-value memory networks (Miller et al. 2016):**
- Keys $K = [k_1, \ldots, k_n] \in \mathbb{R}^{n \times d_k}$
- Values $V = [v_1, \ldots, v_n] \in \mathbb{R}^{n \times d_v}$
- Query: $q \in \mathbb{R}^{d_q}$
- Attention: $\text{softmax}(q K^T / \sqrt{d_k}) V$

**Capacity analysis:**
A model with $n_{\text{layers}}$ layers, $n_{\text{heads}}$ heads, and
$d_{\text{head}}$ dimensions has:

$$\text{KV slots} = n_{\text{layers}} \times n_{\text{heads}} \times \text{seq\_len}$$

For Qwen3-4B: 36 layers × 32 heads × 256 dimensions per head = 294,912
float16 values per KV slot. With a context window of 32,768 tokens, the
total KV capacity is:

$$36 \times 32 \times 32768 \times 256 \times 2 \text{ bytes} = 19.0 \text{ GB}$$

**When does KV memory saturate?**

KV saturates when attention entropy approaches uniform:
$$H(\text{attn}) = -\sum_i p_i \log p_i \to \log(n)$$

This means the model cannot distinguish which KV entries are relevant —
attention is spread uniformly across all positions.

### 2.4 Alignment Theory

The alignment matrix $W_a$ maps from hidden space to input embedding space:

$$e_{t+1} = h_t \cdot W_a$$

**Why $W_a$ works:** In models with **tied embeddings**, $W_{\text{out}} = W_{\text{in}}^T$,
so $W_a \approx W_{\text{out}}^{\dagger}$ (pseudo-inverse) directly recovers
the embedding space. In models with **untied embeddings**, $W_a$ approximates
the mapping but has higher residual error.

**When alignment fails:**
- $W_{\text{out}}$ is low-rank: $W_a$ cannot recover full hidden → embed mapping
- Model uses RMSNorm or LayerNorm between hidden state and output projection:
  $W_a$ must account for the normalization

**Frobenius norm alignment quality:**
$$\text{AlignmentResidual} = \frac{\|W_a W_{\text{out}} - W_{\text{in}}\|_F}{\|W_{\text{in}}\|_F}$$

Lower is better. Typical values:
- Tied embeddings: 0.01–0.05
- Untied embeddings: 0.05–0.20
- Failed alignment: > 0.30

**Generalization:** Learned alignment (fine-tuned $W_a$ on task data) can
outperform analytic alignment when the task distribution differs from the
pre-training distribution.

---

## 3. Core Algorithm (Formal)

### 3.1 Notation Table

| Symbol | Definition |
|--------|-----------|
| $h_t$ | Hidden state at step $t$, $h_t \in \mathbb{R}^d$ |
| $W_{\text{in}}$ | Input embedding matrix, $W_{\text{in}} \in \mathbb{R}^{d \times |V|}$ |
| $W_{\text{out}}$ | Output projection (lm_head), $W_{\text{out}} \in \mathbb{R}^{|V| \times d}$ |
| $W_a$ | Alignment matrix, $W_a \in \mathbb{R}^{d \times d}$ |
| $e_t$ | Aligned embedding, $e_t = h_t \cdot W_a$ |
| $K_i, V_i$ | KV cache from agent $i$ |
| $m$ | Number of latent steps per agent |
| $n$ | Number of agents in chain |
| $\lambda$ | Ridge regression regularization |
| $\beta$ | SVD truncation parameter (number of singular values kept) |
| $\varepsilon$ | Convergence threshold for adaptive steps |

### 3.2 Algorithm: Latent Thought Generation

```
ALGORITHM LatentThoughtGeneration(model, prompt_tokens, m_steps, W_a):

INPUT: model with forward(input_ids | inputs_embeds, past_key_values, output_hidden_states)
       prompt_tokens: tokenized input
       m_steps: number of latent steps
       W_a: alignment matrix [d × d]

1.  h_0 = model.forward(input_ids=prompt_tokens, output_hidden_states=True).hidden_states[-1]
2.  KV = model.forward(input_ids=prompt_tokens, use_cache=True).past_key_values
3.  pos = len(prompt_tokens)  // current position offset

4.  FOR t = 1 TO m_steps:
5.      e_t = h_{t-1}[-1] · W_a           // align last hidden state to embed space
6.      out = model.forward(inputs_embeds=e_t.unsqueeze(0),
                              past_key_values=KV,
                              position_ids=[pos],
                              output_hidden_states=True,
                              use_cache=True)
7.      h_t = out.hidden_states[-1]
8.      KV = out.past_key_values
9.      pos += 1

10. RETURN KV, h_t, pos
```

### 3.3 Algorithm: KV Cache Transfer

```
ALGORITHM KVTransfer(prev_agents_kv, position_mode):

INPUT: prev_agents_kv: list of KV caches from upstream agents
       position_mode: "chain" | "reset" | "offset"

1.  combined_kv = prev_agents_kv[0]
2.  last_pos = len(prev_agents_kv[0].keys[0][0])  // last position used

3.  FOR i = 1 TO len(prev_agents_kv) - 1:
4.      kv_i = prev_agents_kv[i]
5.      IF position_mode == "chain":
6.          // Continue position_ids from previous agent's last position
7.          // KV entries keep their original positions
8.          combined_kv = concat_kv(combined_kv, kv_i)
9.          last_pos += len(kv_i.keys[0][0])
10.     ELIF position_mode == "reset":
11.         // Reset position_ids to 0 for each agent's KV
12.         // This may cause position mismatch — use with caution
13.         combined_kv = concat_kv(combined_kv, kv_i)
14.     ELIF position_mode == "offset":
15.         // Shift each agent's KV by a fixed offset
16.         combined_kv = concat_kv(combined_kv, shift_kv(kv_i, offset))

17. RETURN combined_kv, last_pos
```

### 3.4 Algorithm: Alignment Matrix Computation

**Method 1: Ridge Regression**
```
ALGORITHM ComputeWa_Ridge(W_in, W_out, lambda):

1.  // W_in: [d × |V|], W_out: [|V| × d]
2.  // Solve: W_a = argmin ||W_a · W_out - W_in||_F^2 + lambda ||W_a||_F^2
3.  W_a = (1 / lambda) · inverse(W_out^T · W_out + lambda · I) · W_out^T · W_in
4.  RETURN W_a
```

**Method 2: Truncated SVD**
```
ALGORITHM ComputeWa_SVD(W_in, W_out, beta):

1.  U, S, V^T = SVD(W_out)    // W_out = U · S · V^T
2.  // Truncate to top-beta singular values
3.  S_trunc = S[:beta]
4.  U_trunc = U[:, :beta]
5.  V_trunc = V^T[:beta, :]
6.  // Pseudo-inverse using truncated SVD
7.  W_out_pinv = V_trunc^T · diag(1/S_trunc) · U_trunc^T
8.  W_a = W_out_pinv · W_in
9.  RETURN W_a
```

**Method 3: Learned Alignment**
```
ALGORITHM ComputeWa_Learned(model, task_data, epochs, lr):

1.  W_a = initialize_identity(d)
2.  W_a.requires_grad = True
3.  optimizer = Adam([W_a], lr=lr)

4.  FOR epoch = 1 TO epochs:
5.      FOR (x, y) in task_data:
6.          h = model.forward(input_ids=x).hidden_states[-1]
7.          e = h · W_a
8.          logits = model.forward(inputs_embeds=e).logits
9.          loss = CrossEntropy(logits, y) + beta · ||W_a||_F^2
10.         loss.backward()
11.         optimizer.step()

12. RETURN W_a
```

### 3.5 Algorithm: Multi-Agent Chain Execution

```
ALGORITHM LatentMAS_ChainExecution(model, question, agents, m_steps_list, W_a):

INPUT: model: HuggingFace causal LM with output_hidden_states and use_cache
       question: input question string
       agents: list of (role, prompt) tuples
       m_steps_list: [m_planner, m_critic, m_refiner, m_solver]
       W_a: alignment matrix

1.  cumulative_kv = None
2.  last_pos = 0

3.  FOR i = 0 TO len(agents) - 1:
4.      role, prompt = agents[i]
5.      m = m_steps_list[i]
6.      full_prompt = prompt + "\n\nQuestion: " + question

7.      // Tokenize and prepare input
8.      tokens = tokenize(full_prompt)

9.      IF cumulative_kv is not None:
10.         // Prepend prior agents' KV as context
11.         past_kv = cumulative_kv
12.         position_ids = [last_pos, ..., last_pos + len(tokens) - 1]
13.         // Shift position_ids to continue from prior agent
14.     ELSE:
15.         past_kv = None
16.         position_ids = None

17.     // Pre-fill: run the prompt through the model
18.     out = model.forward(input_ids=tokens,
                            past_key_values=past_kv,
                            position_ids=position_ids,
                            output_hidden_states=True,
                            use_cache=True)
19.     h = out.hidden_states[-1]
20.     KV_i = out.past_key_values
21.     agent_last_pos = last_pos + len(tokens)

22.     // Latent thought generation: m steps of hidden → align → forward
23.     FOR step = 1 TO m:
24.         e = h[-1] · W_a                    // align to embed space
25.         step_out = model.forward(
             inputs_embeds=e.unsqueeze(0),
             past_key_values=KV_i,
             position_ids=[agent_last_pos],
             output_hidden_states=True,
             use_cache=True
         )
26.         h = step_out.hidden_states[-1]
27.         KV_i = step_out.past_key_values
28.         agent_last_pos += 1

29.     // DEBUG: optionally decode short text probe
30.     IF debug_mode:
31.         probe = model.generate(past_key_values=KV_i, max_new_tokens=50)
32.         log_debug(role, probe)
33.         // NOTE: probe is for inspection only, latent path continues

34.     // Transfer KV to next agent
35.     cumulative_kv = KV_i
36.     last_pos = agent_last_pos

37. // Final agent: decode text answer
38. answer_tokens = model.generate(
     past_key_values=cumulative_kv,
     max_new_tokens=max_decode_tokens,
     do_sample=False
 )
39. answer = detokenize(answer_tokens)

40. RETURN answer, cumulative_kv, metrics
```

### 3.6 Complexity Analysis

**Time complexity per forward pass:**

$$T_{\text{forward}} = O(n_{\text{layers}} \times n_{\text{heads}} \times d_{\text{head}}^2 \times \text{seq\_len})$$

For a chain of $n_{\text{agents}}$ with $m$ latent steps each:

$$T_{\text{total}} = O(n_{\text{agents}} \times m \times n_{\text{layers}} \times n_{\text{heads}} \times d_{\text{head}}^2 \times \text{seq\_len})$$

**Space complexity (KV cache):**

$$S_{\text{KV}} = O(n_{\text{agents}} \times \text{seq\_len} \times n_{\text{layers}} \times 2 \times d)$$

where the factor of 2 is for K and V.

**Communication cost:**
- Latent (KV pointer): $O(1)$ — pass GPU pointer or small metadata
- Text: $O(L_{\text{text}} \times \log(|\text{vocab}|))$ — tokens passed as text

| Mode | Time | Space | Communication |
|------|------|-------|---------------|
| Single | $O(m \cdot L \cdot d^2)$ | $O(L \cdot n_l \cdot 2d)$ | N/A |
| TextMAS | $O(n \cdot L_{\text{text}} \cdot d^2)$ | $O(n \cdot L \cdot n_l \cdot 2d)$ | $O(n \cdot L_{\text{text}} \cdot \log|V|)$ |
| LatentMAS | $O(n \cdot m \cdot d^2)$ | $O(n \cdot (L+m) \cdot n_l \cdot 2d)$ | $O(1)$ pointer / $O(n \cdot d)$ if copied |

---

## 4. Algorithmic Extensions

### 4.1 KV Compression & Memory Management

| Method | Description | Expected Compression | Accuracy Impact |
|--------|-------------|---------------------|-----------------|
| Full KV | No compression | 1× | baseline |
| Head pruning | Drop heads with low attention entropy | 2-4× | -0% to -2% |
| Layer pruning | Drop early layers from KV transfer | 2-3× | -0% to -5% |
| Int8 quantization | Store KV in int8 | 2× | -0% to -1% |
| FP8 quantization | Store KV in FP8 | 2× | -0% |
| Top-k KV | Keep top-k KV pairs by attention score | 3-10× | -1% to -5% |
| Windowed KV | Sliding window of last w tokens | w/L× | -2% to -10% |

### 4.2 Adaptive Latent Step Count

**Convergence metric:**
$$\text{convergence}_t = \frac{\|h_t - h_{t-1}\|_2}{\|h_{t-1}\|_2}$$

Stop when $\text{convergence}_t < \varepsilon$ (e.g. $\varepsilon = 0.01$).

**Step allocation strategies:**

| Strategy | Planner | Critic | Refiner | Solver |
|----------|---------|--------|---------|--------|
| Uniform | m | m | m | m |
| Linear | 2m | m | 2m | m |
| Exponential | 4m | 2m | 4m | 2m |
| Learned | adaptive | adaptive | adaptive | adaptive |

### 4.3 Heterogeneous Model Collaboration

Agents can use different model sizes:
- Small model (1.5B) for Planner (fast exploration)
- Large model (7B) for Solver (accurate final answer)

**Cross-model KV transfer** requires dimension bridging:
$$K_{\text{target}} = K_{\text{source}} \cdot P, \quad V_{\text{target}} = V_{\text{source}} \cdot Q$$

where $P \in \mathbb{R}^{d_{\text{source}} \times d_{\text{target}}}$ and
$Q \in \mathbb{R}^{d_{\text{source}} \times d_{\text{target}}}$ are learned
projection adapters (LoRA-like, trained on a small alignment dataset).

### 4.4 Topology Generalization

| Topology | KV Flow | position_ids | Attention Mask | Parallelism | Complexity |
|----------|---------|-------------|----------------|-------------|------------|
| Chain | Sequential, each sees all prior | Chain (cumulative) | Causal | None | O(n) |
| DAG | Defined by edges, topological sort | Offset per node | Causal within, full across | Partial | O(n) |
| Ring | Each sees prior + next (circular) | Fixed per node | Causal + ring | None | O(n) |
| Star | All agents see hub, hub sees all | Reset per agent | Full | All parallel | O(1) parallel |
| Hierarchical | Tree structure, parent/child | Offset per level | Causal within level | Per level | O(depth) |

### 4.5 Hybrid Latent-Text Communication

Some edges use latent (KV transfer), others use text (decode → re-encode).

**Use cases:**
- Internal agents: latent (no text overhead)
- External interface agents: text (auditability, logging)
- Checkpoint points: decode at key decision boundaries for human inspection

**Per-edge configuration:**
```yaml
edges:
  - from: planner
    to: critic
    mode: latent
  - from: refiner
    to: solver
    mode: latent
  - from: solver
    to: output
    mode: text
```

### 4.6 Implicit Agent Specialization via KV Conditioning

**Hypothesis:** Agents specialize based on their position in the chain,
even without explicit role prompts. The KV they receive conditions their
behavior.

**Experiment:** Compare:
1. Explicit role prompts + no KV transfer
2. No role prompts + KV transfer (implicit specialization)
3. Both (explicit + KV)

**Probing test:** Train a linear classifier on each agent's hidden states
to predict its role. If probe accuracy is high without explicit role prompts,
specialization is implicit.

### 4.7 Gradient-Aware KV Transfer (Advanced)

For training latent MAS (not just inference):

**Straight-through estimator:**
$$\frac{\partial \text{loss}}{\partial K_{\text{in}}} = \frac{\partial \text{loss}}{\partial K_{\text{out}}}$$

Treat KV transfer as identity in backward pass.

**Training loss:**
$$\mathcal{L} = \mathcal{L}_{\text{task}} + \alpha \cdot \mathcal{L}_{\text{align}} + \gamma \cdot \mathcal{L}_{\text{coherence}}$$

where:
- $\mathcal{L}_{\text{task}}$: task loss (e.g., cross-entropy for GSM8K)
- $\mathcal{L}_{\text{align}} = \|W_a W_{\text{out}} - W_{\text{in}}\|_F^2$
- $\mathcal{L}_{\text{coherence}} = \|h_i - h_{i+1}\|_2^2$ (encourage smooth transitions)

---

## 5. Experimental Design

### 5.1 Primary Research Questions

| RQ | Question |
|----|----------|
| RQ1 | Does LatentMAS achieve similar accuracy to TextMAS? |
| RQ2 | How does latent step count affect accuracy and efficiency? |
| RQ3 | How does agent count affect performance? |
| RQ4 | Does collaboration benefit scale with model size? |
| RQ5 | What is the optimal alignment method? |
| RQ6 | How well does LatentMAS generalize across task types? |

### 5.2 Ten Experiments

**Experiment 1: LatentMAS vs TextMAS vs Single-Model**
- H1: LatentMAS accuracy ≥ TextMAS accuracy
- IV: mode (single, singlematched, textmas, latentmas)
- DV: accuracy_exact_match, total_tokens, latency, peak_memory
- Controlled: model (Qwen3-4B), agents (4), latent_steps (40,20,40,20)
- Test: paired t-test on per-question accuracy
- n=50, MDES = 0.12 (Cohen's d ~0.5, power=0.8, alpha=0.05)
- Expected: LatentMAS ≥ TextMAS, fewer tokens

**Experiment 2: Latent Step Count Sweep**
- H2: accuracy increases with steps up to 40-80, then plateaus
- IV: latent_steps (10, 20, 40, 80, 160)
- DV: accuracy, token_efficiency, latency
- Test: repeated measures ANOVA
- Falsification: if accuracy decreases monotonically with steps

**Experiment 3: Agent Count Sweep**
- H3: accuracy increases with agents up to 4-6, then plateaus
- IV: agent_count (2, 3, 4, 6, 8)
- DV: accuracy, tokens, latency, token_savings_vs_textmas

**Experiment 4: Model Size Scaling**
- H4: accuracy gains from collaboration scale with model size
- IV: model_size (1.5B, 4B, 7B, 14B)
- DV: accuracy_gain (vs single model)

**Experiment 5: KV Compression Methods**
- H5: KV compression to 50% maintains accuracy within 2%
- IV: compression (none, int8, top-k, windowed)
- DV: accuracy, memory, speedup

**Experiment 6: Topology Comparison**
- H6: chain topology is optimal for sequential tasks
- IV: topology (chain, DAG, ring, star, hierarchical)
- DV: accuracy, tokens, latency

**Experiment 7: Position ID Strategy**
- H7: chain (continuous) position_ids outperform reset
- IV: position_mode (chain, reset, offset)
- DV: accuracy, position_overflow_risk

**Experiment 8: Alignment Method Comparison**
- H8: SVD truncated alignment outperforms ridge for large vocab
- IV: alignment_method (ridge, svd, learned)
- DV: accuracy, alignment_residual

**Experiment 9: Heterogeneous vs Homogeneous**
- H9: heterogeneous (small planner + large solver) outperforms
    homogeneous under fixed compute budget
- IV: model_config (homo-4B, hetero-1.5B+7B)
- DV: accuracy, cost, latency

**Experiment 10: Task Generalization**
- H10: LatentMAS generalizes across math, reasoning, code, creative writing
- IV: task (GSM8K, ARC, HumanEval, MBPP, creative_writing)
- DV: accuracy, token_efficiency

### 5.3 Ablation Studies

| Ablation | What's Removed | Expected Impact |
|----------|---------------|-----------------|
| No alignment | Feed raw hidden states as embeds | Major accuracy drop |
| No KV transfer | Each agent isolated | Moderate accuracy drop |
| No latent steps | Just role prompts + KV transfer | Small accuracy drop |
| Compressed KV | Use int8/FP8 KV | Minimal impact |
| Debug probe | Does seeing probe help next agent? | No impact (probes not passed) |

### 5.4 Evaluation Metrics

| Metric | Formula |
|--------|---------|
| accuracy_exact_match | $\frac{1}{N}\sum_i \mathbf{1}[\hat{y}_i = y_i]$ |
| accuracy_f1 | $F_1(\hat{y}, y)$ for free-form answers |
| token_efficiency | $\frac{\text{accuracy}}{\text{total\_tokens}}$ |
| latent_efficiency | $\frac{\text{accuracy}}{\text{total\_forward\_passes}}$ |
| kv_transfer_fidelity | $\frac{\|KV_{\text{in}} - KV_{\text{out}}\|_F}{\|KV_{\text{in}}\|_F}$ |
| alignment_residual | $\frac{\|W_a W_{\text{out}} - W_{\text{in}}\|_F}{\|W_{\text{in}}\|_F}$ |
| communication_cost_ratio | $\frac{\text{latent\_cost}}{\text{text\_cost}}$ |
| speedup_factor | $\frac{t_{\text{text}}}{t_{\text{latent}}}$ |
| peak_memory_ratio | $\frac{M_{\text{latent}}}{M_{\text{text}}}$ |

### 5.5 Statistical Rigor

- **Confidence intervals:** Bootstrap 1000 resamples, report 95% CI
- **Effect size:** Cohen's d for all pairwise comparisons
- **Multiple comparison:** Bonferroni correction (10 experiments → α = 0.005)
- **Paired tests:** Same questions across modes for within-subject comparison
- **Power analysis:** At n=50, MDES ≈ 0.12 (medium effect, d=0.5, power=0.8)
- **Minimum n for small effect (d=0.2):** n ≈ 200 (planned for Phase 2)

---

## 6. Probing & Interpretability Framework

### 6.1 Linear Probing
Train linear probes on each agent's hidden states to predict:
- Agent role (planner, critic, refiner, solver)
- Task type (math, reasoning, code)
- Answer correctness (correct/incorrect)

Probe accuracy → information content of the latent representation.

### 6.2 Attention Pattern Analysis
- Attention entropy across latent steps: does it decrease (focus) or increase (dilution)?
- Cross-agent attention: which parts of prior agent's KV does current agent attend to?
- Attention head specialization: do specific heads attend to specific agent boundaries?

### 6.3 Representation Similarity Analysis (CKA/RSA)
- Centered Kernel Alignment between agents
- Do agents converge or diverge?
- Compare with TextMAS representations

### 6.4 Causal Tracing
- For correct answers: which KV entries contributed most?
- Patching: replace KV entries from incorrect runs and measure answer change
- Identify "critical KV" — entries that determine correctness

### 6.5 Latent Thought Visualization
- t-SNE/UMAP projection of hidden states per agent per step
- Trajectory through latent space across steps
- Compare latent trajectories with text trajectories

---

## 7. Scaling Laws & Generalization

### 7.1 Scaling Hypotheses

| Hypothesis | Statement |
|-----------|----------|
| H_scale_1 | Accuracy gains scale with model size |
| H_scale_2 | Token savings scale with agent count |
| H_scale_3 | Alignment quality scales with model size (tied embeddings) |
| H_scale_4 | KV transfer fidelity scales with model size |

### 7.2 Scaling Experiments
- **2D grid:** model_size × agent_count
- **3D grid:** model_size × agent_count × latent_steps
- **Power-law fit:** $\text{accuracy} = A \cdot (n_{\text{params}})^\alpha \cdot (n_{\text{agents}})^\beta \cdot (m_{\text{steps}})^\gamma$

### 7.3 Generalization Bound Analysis
- PAC-Bayes bound for the agent communication channel
- Rademacher complexity of the latent transfer function
- Saturation point: when does adding agents stop helping?

---

## 8. Safety, Reliability & Failure Modes

### 8.1 Known Failure Modes

| Failure | Detection | Mitigation | Fallback |
|---------|-----------|-----------|----------|
| Alignment collapse | alignment_residual > 0.30 | Use larger β for SVD, or ridge with smaller λ | Text mode |
| KV contamination | downstream accuracy drops > 20% | Isolate failing agent, re-run | Skip agent |
| Position overflow | last_pos > max_position_embeddings | Use sliding window KV | Truncate KV |
| Attention dilution | attention entropy > 0.9 × log(n) | KV compression (top-k) | Windowed KV |
| Mode collapse | CKA(agent_i, agent_j) > 0.95 | Add role-specific prompts | Text mode |

### 8.3 Monitoring
- Real-time alignment residual tracking
- KV transfer fidelity per hop
- Convergence rate per agent (step-by-step hidden state delta)
- Attention entropy distribution
- Hidden state norm trajectory

---

## 9. Infrastructure & Tooling

### 9.1 Repository Structure (within SIRINX OS monorepo)

```
sirinx-os/
├── research/latentmas/          # Rust + Python research code
│   ├── Cargo.toml                # Rust workspace
│   ├── crates/
│   │   ├── katgpt-orchestrator/ # Rust CLI
│   │   └── latent-protocol/     # Shared types
│   ├── python/latent_backend/   # Python inference backend
│   ├── agents/                  # YAML agent configs
│   ├── benchmarks/             # Dataset files
│   ├── runs/                   # Output directory
│   ├── AGENTS.md               # Scoped governance
│   ├── README.md
│   └── BENCHMARK.md
├── services/latentmas-gateway/  # Node.js HTTP gateway
│   ├── server.mjs
│   └── README.md
└── docs/
    └── LatentMAS Blueprint v3.md
```

### 9.2 SIRINX OS Integration

The gateway service follows SIRINX OS patterns:
- Dry-run by default (`LATENTMAS_LIVE_ENABLED=false`)
- Audit log with correlation_id
- Health/ready/version/status endpoints
- Registered in dev-control-api as `/api/latentmas`
- Gates follow the same pattern as other subsystems

### 9.3 Reproducibility Protocol
- Seed control: model init, data shuffling, sampling all seeded
- Environment pinning: requirements.txt with exact versions
- Hardware logging: GPU model, VRAM, CUDA version
- Config persistence: full config saved with every run as JSONL

---

## 10. Roadmap (Phased)

| Phase | Duration | Deliverables | SRL Target |
|-------|----------|-------------|------------|
| 1: MVP | 2-3 weeks | Single process, 4-agent chain, ridge alignment, 3 baselines, GSM8K-mini | SRL-3 |
| 2: Experimental | 3-4 weeks | All 10 experiments, 4 model sizes, 6 topologies, KV compression | SRL-4 |
| 3: Interpretability | 2-3 weeks | Linear probes, attention analysis, CKA, causal tracing, visualization | SRL-4 |
| 4: Advanced | 3-4 weeks | Heterogeneous models, adaptive steps, learned alignment, hybrid mode | SRL-5 |
| 5: Scaling | 4-6 weeks | Scaling laws, KV memory bus (Rust), vLLM/SGLang integration, multi-GPU | SRL-6 |
| 6: Publication | Ongoing | Ablation paper, scaling law paper, interpretability paper | SRL-7 |

---

## 11. Risk Register

| Risk | Prob | Severity | Mitigation | Early Warning |
|------|------|----------|-----------|---------------|
| Alignment matrix too low-rank | Medium | High | Use SVD with larger β, or learned alignment | alignment_residual > 0.20 |
| KV transfer fails on some models | Medium | High | Fallback to text mode, log failure | NaN in hidden states |
| GPU OOM with large models + many agents | High | Medium | KV compression, smaller batch, gradient checkpointing | Memory > 80% VRAM |
| Position overflow on long sequences | Low | Medium | Use sliding window KV, reset mode | last_pos approaching max |
| Mode collapse (no specialization) | Medium | Medium | Add role-specific prompts, check CKA | CKA > 0.90 |
| Inference too slow for experiments | Medium | Low | Use smaller models first, parallelize | Wall-clock > 1hr per condition |
| HuggingFace model unavailable | Low | High | Cache models locally, use alternatives | Download timeout |
| Reproducibility across runs | Medium | High | Fix all seeds, pin library versions | Variance > 5% on repeat |
| Paper claims don't replicate | Medium | High | Report honestly with confidence intervals | Effect size < d=0.2 |
| GPU hardware failure | Low | Critical | Backup to CPU, use cloud instance | nvidia-smi errors |
| Python process crash | Medium | Medium | Rust orchestrator handles, restarts | Non-zero exit code |
| KV serialization corrupted | Low | Medium | Checksum verification, fallback | JSON parse error |
| Alignment cache stale | Low | Low | Cache key includes model hash | Wrong model name |
| Debug probes mislead analysis | Low | Low | Probes analyzed separately from latent path | N/A |
| Research questions answered trivially | Low | Low | Add more challenging benchmarks | Ceiling effect |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| Latent thought | Hidden state used as internal reasoning, not decoded to text |
| KV working memory | past_key_values passed between agents as context |
| Alignment matrix | Wa that maps hidden state → input embedding space |
| Text tax | Token cost of encode/decode round-trip in text-based agent communication |
| Attention dilution | Performance degradation from too much KV causing attention to spread thin |
| Mode collapse | All agents produce similar hidden states, no specialization |
| Chain mode | position_ids continue across agents (cumulative) |
| Reset mode | position_ids restart at 0 for each agent |
| Offset mode | position_ids offset by a fixed amount per agent |
| Latent step | One iteration of hidden → align → forward pass |
| Information bottleneck | Minimize I(h; X) - β·I(h; h_next) for optimal compression |
| Error propagation | How agent-local errors compound across the chain |
| KV saturation | When attention entropy approaches uniform, KV is full |
| Truncated SVD | Pseudo-inverse using top-β singular values only |
| Ridge regression | Regularized least-squares for computing Wa |
| Straight-through estimator | Treat non-differentiable operation as identity in backward pass |
| CKA | Centered Kernel Alignment, measures representation similarity |
| PAC-Bayes | Generalization bound based on posterior distribution over hypotheses |
| Rademacher complexity | Measures function class complexity via random label fitting |
| Shapley value | Fair attribution of contribution among cooperating agents |
| Bonferroni correction | Adjusts α for multiple comparisons: α' = α / n_tests |
| SRL | System Readiness Level (0-9, from idea to mature operating system) |
| Dry-run-lock | Safety gate: all inference blocked unless explicitly enabled |
| Correlation ID | Unique identifier for tracing requests across subsystems |
| Audit event | Structured log of agent action with actor, risk, result |

---

*Document version: v3.0 — June 2026*
*Governance: SIRINX OS AGENTS.md + research/latentmas/AGENTS.md*
*Status: SRL-2, target SRL-3 after Phase 1 completion*