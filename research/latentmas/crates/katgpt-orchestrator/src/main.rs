//! katgpt-latentmas — Rust orchestrator for Latent Multi-Agent Systems.
//!
//! Usage:
//!   katgpt-latentmas run   --model <model> --question <q> --mode latentmas [options]
//!   katgpt-latentmas bench  --model <model> --dataset <path> --mode latentmas [options]
//!   katgpt-latentmas report --input <jsonl> [--compare <baseline.jsonl>]

#[macro_use]
mod macros;
mod agent_graph;
mod benchmark;
mod log;
mod python_bridge;
mod scheduler;

use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "katgpt-latentmas")]
#[command(version = "0.1.0")]
#[command(about = "Latent Multi-Agent System orchestrator")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run a single question through the agent chain.
    Run {
        /// Model name (HuggingFace).
        #[arg(long)]
        model: String,

        /// Question to ask.
        #[arg(long)]
        question: String,

        /// Collaboration mode: single, singlematched, textmas, latentmas.
        #[arg(long, default_value = "latentmas")]
        mode: String,

        /// Agent names (comma-separated).
        #[arg(long, default_value = "planner,critic,refiner,solver")]
        agents: String,

        /// Latent steps per agent (comma-separated, matching agents order).
        #[arg(long, default_value = "40,20,40,20")]
        latent_steps: String,

        /// Position mode: chain, reset, offset.
        #[arg(long, default_value = "chain")]
        position_mode: String,

        /// Alignment method: ridge, svd, learned.
        #[arg(long, default_value = "svd")]
        alignment: String,

        /// Topology: chain, dag, ring, star, hierarchical.
        #[arg(long, default_value = "chain")]
        topology: String,

        /// Enable debug text probes.
        #[arg(long)]
        debug: bool,

        /// Device: cuda, cpu, mps.
        #[arg(long, default_value = "cuda")]
        device: String,

        /// Dtype: float16, float32, bfloat16.
        #[arg(long, default_value = "float16")]
        dtype: String,

        /// Random seed.
        #[arg(long, default_value = "42")]
        seed: u64,

        /// Max tokens for final decode.
        #[arg(long, default_value = "256")]
        max_decode_tokens: usize,

        /// Output file for JSONL log.
        #[arg(long)]
        out: Option<PathBuf>,
    },

    /// Run a benchmark sweep.
    Bench {
        /// Model name (HuggingFace).
        #[arg(long)]
        model: String,

        /// Dataset path (JSONL).
        #[arg(long)]
        dataset: PathBuf,

        /// Collaboration mode.
        #[arg(long, default_value = "latentmas")]
        mode: String,

        /// Agent names (comma-separated).
        #[arg(long, default_value = "planner,critic,refiner,solver")]
        agents: String,

        /// Latent steps per agent (comma-separated).
        #[arg(long, default_value = "40,20,40,20")]
        latent_steps: String,

        /// Position mode.
        #[arg(long, default_value = "chain")]
        position_mode: String,

        /// Alignment method.
        #[arg(long, default_value = "svd")]
        alignment: String,

        /// Topology.
        #[arg(long, default_value = "chain")]
        topology: String,

        /// Enable debug text probes.
        #[arg(long)]
        debug: bool,

        /// Device.
        #[arg(long, default_value = "cuda")]
        device: String,

        /// Dtype.
        #[arg(long, default_value = "float16")]
        dtype: String,

        /// Random seed.
        #[arg(long, default_value = "42")]
        seed: u64,

        /// Max tokens for final decode.
        #[arg(long, default_value = "256")]
        max_decode_tokens: usize,

        /// Output file for JSONL results.
        #[arg(long)]
        out: PathBuf,
    },

    /// Generate a summary report from benchmark results.
    Report {
        /// Input JSONL results file.
        #[arg(long)]
        input: PathBuf,

        /// Optional baseline JSONL for comparison.
        #[arg(long)]
        compare: Option<PathBuf>,

        /// Output format: markdown, json, csv.
        #[arg(long, default_value = "markdown")]
        format: String,
    },

    /// Show system info and diagnostic check.
    Doctor {
        /// Check Python backend availability.
        #[arg(long)]
        check_python: bool,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "katgpt_orchestrator=info".into()),
        )
        .with_writer(std::io::stderr)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Run {
            model,
            question,
            mode,
            agents,
            latent_steps,
            position_mode,
            alignment,
            topology,
            debug,
            device,
            dtype,
            seed,
            max_decode_tokens,
            out,
        } => {
            let config = python_bridge::RunConfigBuilder::default()
                .model_name(model)
                .mode(mode)
                .agents(agents)
                .latent_steps(latent_steps)
                .position_mode(position_mode)
                .alignment(alignment)
                .topology(topology)
                .debug(debug)
                .device(device)
                .dtype(dtype)
                .seed(seed)
                .max_decode_tokens(max_decode_tokens)
                .build()?;

            let graph =
                agent_graph::build_graph(&config.agents, &config.latent_steps, &config.topology)?;
            let plan = scheduler::plan_execution(&graph);
            if plan.steps.len() != config.agents.len() {
                anyhow::bail!("Execution plan size does not match agent count");
            }

            let result = python_bridge::run_single(&config, &question).await?;
            let json = serde_json::to_string_pretty(&result)?;

            if let Some(out_path) = out {
                std::fs::write(&out_path, &format!("{json}\n"))?;
                tracing::info!("Result written to {}", out_path.display());
            }
            println!("{json}");
        }

        Commands::Bench {
            model,
            dataset,
            mode,
            agents,
            latent_steps,
            position_mode,
            alignment,
            topology,
            debug,
            device,
            dtype,
            seed,
            max_decode_tokens,
            out,
        } => {
            let config = python_bridge::BenchConfigBuilder::default()
                .model_name(model)
                .mode(mode)
                .agents(agents)
                .latent_steps(latent_steps)
                .position_mode(position_mode)
                .alignment(alignment)
                .topology(topology)
                .debug(debug)
                .device(device)
                .dtype(dtype)
                .seed(seed)
                .max_decode_tokens(max_decode_tokens)
                .dataset_path(dataset.to_string_lossy().to_string())
                .output_path(out.to_string_lossy().to_string())
                .build()?;

            let graph =
                agent_graph::build_graph(&config.agents, &config.latent_steps, &config.topology)?;
            let plan = scheduler::plan_execution(&graph);
            if plan.steps.len() != config.agents.len() {
                anyhow::bail!("Execution plan size does not match agent count");
            }

            let results = python_bridge::run_benchmark(&config).await?;

            // Write JSONL output
            log::write_jsonl(&out, &results)?;
            tracing::info!("{} results written to {}", results.len(), out.display());

            // Print summary
            benchmark::print_summary(&results);
        }

        Commands::Report {
            input,
            compare,
            format,
        } => {
            let results: Vec<latent_protocol::BenchResult> = log::read_jsonl(&input)?;

            let report = if let Some(baseline_path) = compare {
                let baseline: Vec<latent_protocol::BenchResult> = log::read_jsonl(&baseline_path)?;
                benchmark::generate_comparison_report(&results, &baseline, &format)?
            } else {
                benchmark::generate_report(&results, &format)?
            };

            println!("{report}");
        }

        Commands::Doctor { check_python } => {
            python_bridge::doctor(check_python).await?;
        }
    }

    Ok(())
}
