//! Bridge between Rust orchestrator and Python latent backend.
//!
//! Protocol: Rust spawns `python -m latent_backend.run_agent` as a subprocess,
//! sends JSONL config on stdin, reads JSONL events on stdout.

use latent_protocol::{
    AgentEvent, BenchConfig, BenchQuestion, BenchResult, ProtocolMessage, RunConfig,
};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

/// Builder for RunConfig (single question).
#[derive(Default, Debug)]
pub struct RunConfigBuilder {
    model_name: String,
    mode: String,
    agents: String,
    latent_steps: String,
    position_mode: String,
    alignment: String,
    topology: String,
    debug: bool,
    device: String,
    dtype: String,
    seed: u64,
    max_decode_tokens: usize,
}

impl RunConfigBuilder {
    pub fn default() -> Self {
        Self {
            model_name: String::new(),
            mode: "latentmas".into(),
            agents: "planner,critic,refiner,solver".into(),
            latent_steps: "40,20,40,20".into(),
            position_mode: "chain".into(),
            alignment: "svd".into(),
            topology: "chain".into(),
            debug: false,
            device: "cuda".into(),
            dtype: "float16".into(),
            seed: 42,
            max_decode_tokens: 256,
        }
    }

    builder_field!(model_name, String);
    builder_field!(mode, String);
    builder_field!(agents, String);
    builder_field!(latent_steps, String);
    builder_field!(position_mode, String);
    builder_field!(alignment, String);
    builder_field!(topology, String);
    builder_field!(device, String);
    builder_field!(dtype, String);
    builder_field!(seed, u64);
    builder_field!(max_decode_tokens, usize);
    builder_field!(debug, bool);

    pub fn build(self) -> anyhow::Result<RunConfig> {
        let correlation_id = uuid::Uuid::new_v4().to_string();
        let agents: Vec<String> = self
            .agents
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();
        let latent_steps: Vec<usize> = self
            .latent_steps
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();

        let mode = match self.mode.as_str() {
            "single" => latent_protocol::CollaborationMode::Single,
            "singlematched" => latent_protocol::CollaborationMode::SingleMatched,
            "textmas" => latent_protocol::CollaborationMode::Textmas,
            "latentmas" => latent_protocol::CollaborationMode::Latentmas,
            other => anyhow::bail!("Unknown mode: {other}"),
        };

        let position_mode = match self.position_mode.as_str() {
            "chain" => latent_protocol::PositionMode::Chain,
            "reset" => latent_protocol::PositionMode::Reset,
            "offset" => latent_protocol::PositionMode::Offset,
            other => anyhow::bail!("Unknown position_mode: {other}"),
        };

        let alignment_method = match self.alignment.as_str() {
            "ridge" => latent_protocol::AlignmentMethod::Ridge,
            "svd" => latent_protocol::AlignmentMethod::Svd,
            "learned" => latent_protocol::AlignmentMethod::Learned,
            other => anyhow::bail!("Unknown alignment method: {other}"),
        };

        Ok(RunConfig {
            correlation_id,
            model_name: self.model_name,
            mode,
            agents,
            latent_steps,
            position_mode,
            alignment_method,
            topology: self.topology,
            debug: self.debug,
            device: self.device,
            dtype: self.dtype,
            seed: self.seed,
            max_decode_tokens: self.max_decode_tokens,
        })
    }
}

/// Builder for BenchConfig (benchmark sweep).
#[derive(Default, Debug)]
pub struct BenchConfigBuilder {
    model_name: String,
    mode: String,
    agents: String,
    latent_steps: String,
    position_mode: String,
    alignment: String,
    topology: String,
    debug: bool,
    device: String,
    dtype: String,
    seed: u64,
    max_decode_tokens: usize,
    dataset_path: String,
    output_path: String,
}

impl BenchConfigBuilder {
    builder_field!(model_name, String);
    builder_field!(mode, String);
    builder_field!(agents, String);
    builder_field!(latent_steps, String);
    builder_field!(position_mode, String);
    builder_field!(alignment, String);
    builder_field!(topology, String);
    builder_field!(device, String);
    builder_field!(dtype, String);
    builder_field!(seed, u64);
    builder_field!(max_decode_tokens, usize);
    builder_field!(debug, bool);
    builder_field!(dataset_path, String);
    builder_field!(output_path, String);

    pub fn build(self) -> anyhow::Result<BenchConfig> {
        let agents: Vec<String> = self
            .agents
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();
        let latent_steps: Vec<usize> = self
            .latent_steps
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();

        let mode = match self.mode.as_str() {
            "single" => latent_protocol::CollaborationMode::Single,
            "singlematched" => latent_protocol::CollaborationMode::SingleMatched,
            "textmas" => latent_protocol::CollaborationMode::Textmas,
            "latentmas" => latent_protocol::CollaborationMode::Latentmas,
            other => anyhow::bail!("Unknown mode: {other}"),
        };

        let position_mode = match self.position_mode.as_str() {
            "chain" => latent_protocol::PositionMode::Chain,
            "reset" => latent_protocol::PositionMode::Reset,
            "offset" => latent_protocol::PositionMode::Offset,
            other => anyhow::bail!("Unknown position_mode: {other}"),
        };

        let alignment_method = match self.alignment.as_str() {
            "ridge" => latent_protocol::AlignmentMethod::Ridge,
            "svd" => latent_protocol::AlignmentMethod::Svd,
            "learned" => latent_protocol::AlignmentMethod::Learned,
            other => anyhow::bail!("Unknown alignment method: {other}"),
        };

        Ok(BenchConfig {
            model_name: self.model_name,
            mode,
            agents,
            latent_steps,
            position_mode,
            alignment_method,
            topology: self.topology,
            debug: self.debug,
            device: self.device,
            dtype: self.dtype,
            seed: self.seed,
            max_decode_tokens: self.max_decode_tokens,
            dataset_path: self.dataset_path,
            output_path: self.output_path,
        })
    }
}

/// Spawn Python backend and run a single question.
pub async fn run_single(config: &RunConfig, question: &str) -> anyhow::Result<BenchResult> {
    let mut child = spawn_python_backend()?;

    // Send RunConfig
    let init_msg = serde_json::to_string(&ProtocolMessage::Run(config.clone()))?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{init_msg}\n").as_bytes())
        .await?;
    child.stdin.as_mut().unwrap().flush().await?;

    // Send question
    let q = BenchQuestion {
        id: "single".into(),
        question: question.to_string(),
        answer: String::new(),
        category: "unknown".into(),
    };
    let q_msg = serde_json::to_string(&ProtocolMessage::Question(q))?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{q_msg}\n").as_bytes())
        .await?;
    child.stdin.as_mut().unwrap().flush().await?;

    // Send end
    let end_msg = serde_json::to_string(&ProtocolMessage::EndOfQuestions)?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{end_msg}\n").as_bytes())
        .await?;
    child.stdin.as_mut().unwrap().flush().await?;

    // Read events
    let mut events = Vec::new();
    let mut result: Option<BenchResult> = None;
    let stdout = child.stdout.take().unwrap();
    let mut reader = BufReader::new(stdout).lines();

    while let Ok(Some(line)) = reader.next_line().await {
        if line.is_empty() {
            continue;
        }
        tracing::debug!("Backend: {line}");

        match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(val) => {
                if val.get("event").is_some() {
                    if let Ok(e) = serde_json::from_value::<AgentEvent>(val.clone()) {
                        // Log event
                        log_event(&e);
                        events.push(e);
                    }
                } else if val.get("answer").is_some() {
                    result = serde_json::from_value::<BenchResult>(val.clone()).ok();
                }
            }
            Err(e) => {
                tracing::warn!("Failed to parse JSON from backend: {e}: {line}");
            }
        }
    }

    let status = child.wait().await?;
    if !status.success() {
        tracing::error!("Python backend exited with status {status}");
    }

    result
        .ok_or_else(|| anyhow::anyhow!("No result returned from backend"))
        .map(|mut r| {
            r.events = events;
            r
        })
}

/// Run a benchmark sweep.
pub async fn run_benchmark(config: &BenchConfig) -> anyhow::Result<Vec<BenchResult>> {
    // Load dataset
    let questions = load_dataset(&config.dataset_path)?;
    tracing::info!(
        "Loaded {} questions from {}",
        questions.len(),
        config.dataset_path
    );

    let mut child = spawn_python_backend()?;

    // Send BenchConfig
    let init_msg = serde_json::to_string(&ProtocolMessage::Bench(config.clone()))?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{init_msg}\n").as_bytes())
        .await?;
    child.stdin.as_mut().unwrap().flush().await?;

    // Send all questions
    for q in &questions {
        let q_msg = serde_json::to_string(&ProtocolMessage::Question(q.clone()))?;
        child
            .stdin
            .as_mut()
            .unwrap()
            .write_all(format!("{q_msg}\n").as_bytes())
            .await?;
    }
    // End
    let end_msg = serde_json::to_string(&ProtocolMessage::EndOfQuestions)?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{end_msg}\n").as_bytes())
        .await?;
    child.stdin.as_mut().unwrap().flush().await?;

    // Read results
    let mut results = Vec::new();
    let stdout = child.stdout.take().unwrap();
    let mut reader = BufReader::new(stdout);

    let mut linebuf = String::new();
    loop {
        linebuf.clear();
        let n = reader.read_line(&mut linebuf).await?;
        if n == 0 {
            break;
        }
        let line = linebuf.trim();
        if line.is_empty() {
            continue;
        }

        match serde_json::from_str::<serde_json::Value>(line) {
            Ok(val) => {
                if let Some(event) = val.get("event") {
                    if let Ok(e) = serde_json::from_value::<AgentEvent>(val.clone()) {
                        log_event(&e);
                    }
                    _ = event;
                } else if val.get("question_id").is_some() {
                    if let Ok(r) = serde_json::from_value::<BenchResult>(val.clone()) {
                        tracing::info!(
                            "Q{}: {} (tokens={}, latency={}ms)",
                            r.question_id,
                            if r.correct { "✓" } else { "✗" },
                            r.total_tokens,
                            r.total_latency_ms
                        );
                        results.push(r);
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Parse error: {e}: {line}");
            }
        }
    }

    let status = child.wait().await?;
    tracing::info!("Backend exited with status {status}");
    Ok(results)
}

/// Run diagnostic check.
pub async fn doctor(check_python: bool) -> anyhow::Result<()> {
    println!("=== LatentMAS Doctor ===\n");

    // Check Rust version
    let rust_ver = Command::new("rustc").arg("--version").output().await;
    match rust_ver {
        Ok(out) => println!("Rust: {}", String::from_utf8_lossy(&out.stdout).trim()),
        Err(_) => println!("Rust: NOT FOUND"),
    }

    // Check Python
    let py_ver = Command::new("python3").arg("--version").output().await;
    match py_ver {
        Ok(out) => println!("Python: {}", String::from_utf8_lossy(&out.stdout).trim()),
        Err(_) => {
            println!("Python: NOT FOUND");
            return Ok(());
        }
    }

    if check_python {
        // Check latent_backend module
        let check = Command::new("python3")
            .args(["-c", "import latent_backend; print('latent_backend: OK')"])
            .output()
            .await;
        match check {
            Ok(out) => {
                let s = String::from_utf8_lossy(&out.stdout);
                let e = String::from_utf8_lossy(&out.stderr);
                if s.contains("OK") {
                    println!("{s}");
                } else {
                    println!("latent_backend: NOT INSTALLED");
                    if !e.is_empty() {
                        println!("  Error: {e}");
                    }
                }
            }
            Err(_) => println!("latent_backend: CHECK FAILED"),
        }

        // Check torch
        let torch = Command::new("python3")
            .args(["-c", "import torch; print(f'torch {torch.__version__}, CUDA: {torch.cuda.is_available()}')"])
            .output()
            .await;
        match torch {
            Ok(out) => println!("torch: {}", String::from_utf8_lossy(&out.stdout).trim()),
            Err(_) => println!("torch: NOT FOUND"),
        }

        // Check transformers
        let transformers = Command::new("python3")
            .args([
                "-c",
                "import transformers; print(f'transformers {transformers.__version__}')",
            ])
            .output()
            .await;
        match transformers {
            Ok(out) => println!(
                "transformers: {}",
                String::from_utf8_lossy(&out.stdout).trim()
            ),
            Err(_) => println!("transformers: NOT FOUND"),
        }
    }

    // Check GPU (if nvidia-smi exists)
    let gpu = Command::new("nvidia-smi")
        .arg("--query-gpu=name,memory.total")
        .arg("--format=csv,noheader")
        .output()
        .await;
    match gpu {
        Ok(out) => println!("GPU: {}", String::from_utf8_lossy(&out.stdout).trim()),
        Err(_) => println!("GPU: nvidia-smi not found (may be CPU-only or MPS)"),
    }

    println!("\n=== Doctor Complete ===");
    Ok(())
}

fn spawn_python_backend() -> anyhow::Result<tokio::process::Child> {
    let child = Command::new("python3")
        .args(["-m", "latent_backend.run_agent"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .kill_on_drop(true)
        .spawn()?;

    Ok(child)
}

fn load_dataset(path: &str) -> anyhow::Result<Vec<BenchQuestion>> {
    let content = std::fs::read_to_string(path)?;
    let mut questions = Vec::new();

    for line in content.lines() {
        if line.is_empty() {
            continue;
        }
        let q: BenchQuestion = serde_json::from_str(line)?;
        questions.push(q);
    }

    Ok(questions)
}

fn log_event(event: &AgentEvent) {
    match event {
        AgentEvent::AgentStarted {
            agent_name,
            agent_index,
            ..
        } => {
            tracing::info!("[{agent_name}] Agent #{agent_index} started");
        }
        AgentEvent::LatentStep {
            agent_name,
            step,
            hidden_norm,
            convergence_metric,
            ..
        } => {
            tracing::debug!(
                "[{agent_name}] Step {step}: |h|={hidden_norm:.4}, conv={convergence_metric:.6}"
            );
        }
        AgentEvent::DebugProbe {
            agent_name, text, ..
        } => {
            tracing::info!("[{agent_name}] Debug probe: {text}");
        }
        AgentEvent::AgentFinished {
            agent_name,
            latency_ms,
            kv_seq_len,
            alignment_residual,
            ..
        } => {
            tracing::info!("[{agent_name}] Finished: {latency_ms}ms, KV len={kv_seq_len}, alignment={alignment_residual:.6}");
        }
        AgentEvent::KVTransfer {
            from_agent,
            to_agent,
            kv_size_bytes,
            transfer_fidelity,
            ..
        } => {
            tracing::info!("[{from_agent}→{to_agent}] KV transfer: {kv_size_bytes}B, fidelity={transfer_fidelity:.6}");
        }
        AgentEvent::Fallback {
            agent_name,
            reason,
            fallback_mode,
            ..
        } => {
            tracing::warn!("[{agent_name}] Fallback ({fallback_mode}): {reason}");
        }
        AgentEvent::AnswerDecoded {
            answer,
            total_tokens,
            total_latency_ms,
            ..
        } => {
            tracing::info!("Answer decoded: tokens={total_tokens}, latency={total_latency_ms}ms");
            tracing::info!("Answer: {answer}");
        }
    }
}
