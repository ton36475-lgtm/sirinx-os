//! GC-NEURAL — Neural Core CLI
//!
//! Lightweight CLI interface to gc-runtime-core.
//! Communication via stdin/stdout JSON-LD protocol.
//!
//! Usage:
//!   gc-neural embed <text>         -> JSON vector
//!   gc-neural search <query>       -> top-k results
//!   gc-neural train <samples>      -> eval agent
//!   gc-neural status               -> core health

use std::io::{self, BufRead};
use gc_runtime_core;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: gc-neural <command> [args...]");
        eprintln!("Commands: embed, search, train, status, store-path");
        std::process::exit(1);
    }

    let repo = std::env::var("SIRINX_OS")
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
            format!("{}/sirinx-os", home)
        });

    match args[1].as_str() {
        "status" => cmd_status(&repo),
        "store-path" => cmd_store_path(&repo),
        "embed" => cmd_embed(&args),
        "search" => cmd_search(&repo, &args),
        "train" => cmd_train(&repo, &args),
        other => {
            eprintln!("Unknown command: {}", other);
            std::process::exit(1);
        }
    }
}

fn cmd_status(repo: &str) {
    let runtime = format!("{}/.ghostclaw_runtime", repo);
    let vec_path = format!("{}/neural/vectors", runtime);
    let store_path = std::path::Path::new(&vec_path);

    let count = if store_path.exists() {
        gc_runtime_core::VectorStore::open(store_path, 128)
            .map(|s| s.count())
            .unwrap_or(0)
    } else {
        0
    };

    let output = serde_json::json!({
        "status": "ok",
        "core_version": env!("CARGO_PKG_VERSION"),
        "vector_count": count,
        "vector_dimension": 128,
        "store_path": vec_path,
    });

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}

fn cmd_store_path(repo: &str) {
    let runtime = format!("{}/.ghostclaw_runtime", repo);
    let vec_path = format!("{}/neural/vectors", runtime);
    std::fs::create_dir_all(&vec_path).ok();
    println!("{}", vec_path);
}

fn cmd_embed(args: &[String]) {
    // Placeholder: returns mock embedding for now
    // Real embedding will use fastembed-rs or local ONNX model
    let text = if args.len() > 2 {
        args[2..].join(" ")
    } else {
        let stdin = io::stdin();
        let mut line = String::new();
        stdin.lock().read_line(&mut line).ok();
        line.trim().to_string()
    };

    // Generate a deterministic mock vector based on text hash
    let mut vec = vec![0.0f64; 128];
    let hash: u64 = text.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64));
    for i in 0..16 {
        let seed = ((hash >> (i * 4)) & 0xF) as f64 / 15.0;
        vec[i * 8] = seed;
        vec[i * 8 + 1] = 1.0 - seed;
    }
    // Normalize
    let norm: f64 = vec.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm > 0.0 {
        for v in &mut vec { *v /= norm; }
    }

    let output = serde_json::json!({
        "text": text,
        "dimension": 128,
        "vector": vec,
    });

    println!("{}", serde_json::to_string(&output).unwrap());
}

fn cmd_search(repo: &str, args: &[String]) {
    let query = if args.len() > 2 {
        args[2..].join(" ")
    } else {
        eprintln!("Usage: gc-neural search <query>");
        std::process::exit(1);
    };

    let runtime = format!("{}/.ghostclaw_runtime", repo);
    let vec_path = format!("{}/neural/vectors", runtime);
    std::fs::create_dir_all(&vec_path).ok();

    let store_path = std::path::Path::new(&vec_path);
    let store = gc_runtime_core::VectorStore::open(store_path, 128)
        .unwrap_or_else(|e| {
            eprintln!("Error opening store: {}", e);
            std::process::exit(1);
        });

    // Generate query vector (mock)
    let hash: u64 = query.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64));
    let mut qvec = vec![0.0f64; 128];
    for i in 0..16 {
        let seed = ((hash >> (i * 4)) & 0xF) as f64 / 15.0;
        qvec[i * 8] = seed;
        qvec[i * 8 + 1] = 1.0 - seed;
    }

    let results = store.search(&qvec, 5);

    let output = serde_json::json!({
        "query": query,
        "results": results,
    });

    println!("{}", serde_json::to_string(&output).unwrap());
}

fn cmd_train(repo: &str, args: &[String]) {
    let agent_id = args.get(2).map(|s| s.as_str()).unwrap_or("codex");

    let runtime = format!("{}/.ghostclaw_runtime", repo);
    let data_path = format!("{}/training", runtime);
    std::fs::create_dir_all(&data_path).ok();

    let store = gc_runtime_core::DataStore::new(std::path::Path::new(&data_path))
        .unwrap_or_else(|e| {
            eprintln!("Error opening data store: {}", e);
            std::process::exit(1);
        });

    let samples = store.load_samples("training_data").unwrap_or_default();
    let total = samples.len();

    let mut harness = gc_runtime_core::Harness::new();
    for s in &samples {
        harness.record_sample(s.clone());
    }

    let eval = harness.evaluate(agent_id, 100);
    let capability = harness.capability(agent_id);

    let output = serde_json::json!({
        "agent": agent_id,
        "samples_total": total,
        "evaluation": {
            "samples_evaluated": eval.samples_evaluated,
            "avg_quality": eval.avg_quality,
            "pass_rate": eval.pass_rate,
            "bottlenecks": eval.bottlenecks,
            "improvements": eval.improvement_suggestions,
        },
        "capability": {
            "overall_score": capability.overall_score,
            "weaknesses": capability.weaknesses,
        }
    });

    println!("{}", serde_json::to_string(&output).unwrap());
}
