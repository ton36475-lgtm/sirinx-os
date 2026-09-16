//! Benchmark summary and report generation.

use latent_protocol::BenchResult;
use std::collections::HashMap;

/// Print a quick summary to stderr.
pub fn print_summary(results: &[BenchResult]) {
    if results.is_empty() {
        eprintln!("No results to summarize.");
        return;
    }

    let total = results.len();
    let correct = results.iter().filter(|r| r.correct).count();
    let accuracy = correct as f64 / total as f64;

    let avg_tokens: f64 = results.iter().map(|r| r.total_tokens as f64).sum::<f64>() / total as f64;
    let avg_latency: f64 = results
        .iter()
        .map(|r| r.total_latency_ms as f64)
        .sum::<f64>()
        / total as f64;
    let avg_memory: f64 = results.iter().map(|r| r.peak_memory_mb).sum::<f64>() / total as f64;

    eprintln!("╔══════════════════════════════════════╗");
    eprintln!("║      BENCHMARK SUMMARY              ║");
    eprintln!("╠══════════════════════════════════════╣");
    eprintln!("║ Questions:    {total:>22} ║");
    eprintln!("║ Correct:      {correct:>22} ║");
    eprintln!("║ Accuracy:     {:>21.2}% ║", accuracy * 100.0);
    eprintln!("║ Avg Tokens:   {:>22.1} ║", avg_tokens);
    eprintln!("║ Avg Latency:  {:>20.1}ms ║", avg_latency);
    eprintln!("║ Avg Memory:   {:>20.1}MB ║", avg_memory);
    eprintln!("╚══════════════════════════════════════╝");
}

/// Generate report in specified format.
pub fn generate_report(results: &[BenchResult], format: &str) -> anyhow::Result<String> {
    match format.to_lowercase().as_str() {
        "markdown" | "md" => Ok(generate_markdown_report(results)),
        "json" => Ok(serde_json::to_string_pretty(results)?),
        "csv" => Ok(generate_csv_report(results)),
        other => anyhow::bail!("Unknown format: {other}"),
    }
}

/// Generate comparison report between two results.
pub fn generate_comparison_report(
    results: &[BenchResult],
    baseline: &[BenchResult],
    format: &str,
) -> anyhow::Result<String> {
    // Index by question_id
    let baseline_map: HashMap<String, &BenchResult> = baseline
        .iter()
        .map(|r| (r.question_id.clone(), r))
        .collect();

    let mut matched = Vec::new();
    for r in results {
        if let Some(b) = baseline_map.get(&r.question_id) {
            matched.push((r, b));
        }
    }

    if matched.is_empty() {
        return Ok("No matching questions found for comparison".into());
    }

    let n = matched.len();
    let acc_a = matched.iter().filter(|(a, _)| a.correct).count() as f64 / n as f64;
    let acc_b = matched.iter().filter(|(_, b)| b.correct).count() as f64 / n as f64;

    let avg_tok_a: f64 = matched
        .iter()
        .map(|(a, _)| a.total_tokens as f64)
        .sum::<f64>()
        / n as f64;
    let avg_tok_b: f64 = matched
        .iter()
        .map(|(_, b)| b.total_tokens as f64)
        .sum::<f64>()
        / n as f64;

    let avg_lat_a: f64 = matched
        .iter()
        .map(|(a, _)| a.total_latency_ms as f64)
        .sum::<f64>()
        / n as f64;
    let avg_lat_b: f64 = matched
        .iter()
        .map(|(_, b)| b.total_latency_ms as f64)
        .sum::<f64>()
        / n as f64;

    let token_reduction = if avg_tok_b > 0.0 {
        (1.0 - avg_tok_a / avg_tok_b) * 100.0
    } else {
        0.0
    };

    let speedup = if avg_lat_a > 0.0 {
        avg_lat_b / avg_lat_a
    } else {
        0.0
    };

    match format.to_lowercase().as_str() {
        "markdown" | "md" => {
            Ok(format!(
                r#"# Comparison Report

| Metric | System A | System B | Delta |
|--------|----------|----------|-------|
| Questions | {n} | {n} | — |
| Accuracy | {:.2}% | {:.2}% | {:+.2}% |
| Avg Tokens | {:.1} | {:.1} | {:+.1} |
| Avg Latency | {:.1}ms | {:.1}ms | {:+.1}ms |
| Token Reduction | — | — | {:.2}% |
| Speedup | — | — | {:.2}× |

*System A = primary, System B = baseline*
"#,
                acc_a * 100.0, acc_b * 100.0, (acc_a - acc_b) * 100.0,
                avg_tok_a, avg_tok_b, avg_tok_a - avg_tok_b,
                avg_lat_a, avg_lat_b, avg_lat_a - avg_lat_b,
                token_reduction,
                speedup,
            ))
        }
        "json" => {
            let comparison = serde_json::json!({
                "n_matched": n,
                "system_a": {
                    "accuracy": acc_a,
                    "avg_tokens": avg_tok_a,
                    "avg_latency_ms": avg_lat_a,
                },
                "system_b": {
                    "accuracy": acc_b,
                    "avg_tokens": avg_tok_b,
                    "avg_latency_ms": avg_lat_b,
                },
                "delta": {
                    "accuracy": acc_a - acc_b,
                    "tokens": avg_tok_a - avg_tok_b,
                    "latency_ms": avg_lat_a - avg_lat_b,
                },
                "token_reduction_pct": token_reduction,
                "speedup_factor": speedup,
            });
            Ok(serde_json::to_string_pretty(&comparison)?)
        }
        "csv" => {
            Ok(format!(
                "metric,system_a,system_b,delta\naccuracy,{},{},{}\navg_tokens,{},{},{}\navg_latency_ms,{},{},{}\ntoken_reduction_pct,{},,\nspeedup_factor,,{}\n",
                acc_a, acc_b, acc_a - acc_b,
                avg_tok_a, avg_tok_b, avg_tok_a - avg_tok_b,
                avg_lat_a, avg_lat_b, avg_lat_a - avg_lat_b,
                token_reduction, speedup,
            ))
        }
        other => anyhow::bail!("Unknown format: {other}"),
    }
}

fn generate_markdown_report(results: &[BenchResult]) -> String {
    if results.is_empty() {
        return "# Benchmark Report\n\nNo results.\n".into();
    }

    let total = results.len();
    let correct = results.iter().filter(|r| r.correct).count();
    let accuracy = correct as f64 / total as f64;

    let avg_tokens: f64 = results.iter().map(|r| r.total_tokens as f64).sum::<f64>() / total as f64;
    let avg_latency: f64 = results
        .iter()
        .map(|r| r.total_latency_ms as f64)
        .sum::<f64>()
        / total as f64;
    let avg_memory: f64 = results.iter().map(|r| r.peak_memory_mb).sum::<f64>() / total as f64;

    let max_tokens = results.iter().map(|r| r.total_tokens).max().unwrap_or(0);
    let min_tokens = results.iter().map(|r| r.total_tokens).min().unwrap_or(0);

    let max_latency = results
        .iter()
        .map(|r| r.total_latency_ms)
        .max()
        .unwrap_or(0);
    let min_latency = results
        .iter()
        .map(|r| r.total_latency_ms)
        .min()
        .unwrap_or(0);

    format!(
        r#"# Benchmark Report

## Summary

| Metric | Value |
|--------|-------|
| Total Questions | {total} |
| Correct | {correct} |
| Accuracy | {:.2}% |
| Avg Tokens | {:.1} |
| Avg Latency | {:.1}ms |
| Avg Peak Memory | {:.1}MB |
| Min/Max Tokens | {min_tokens} / {max_tokens} |
| Min/Max Latency | {min_latency}ms / {max_latency}ms |

## Per-Question Results

| ID | Correct | Tokens | Latency (ms) | Memory (MB) |
|----|---------|--------|--------------|-------------|
{}
"#,
        accuracy * 100.0,
        avg_tokens,
        avg_latency,
        avg_memory,
        results
            .iter()
            .map(|r| {
                format!(
                    "| {} | {} | {} | {} | {:.1} |",
                    r.question_id,
                    if r.correct { "✓" } else { "✗" },
                    r.total_tokens,
                    r.total_latency_ms,
                    r.peak_memory_mb,
                )
            })
            .collect::<Vec<_>>()
            .join("\n"),
    )
}

fn generate_csv_report(results: &[BenchResult]) -> String {
    let mut csv = String::from("question_id,correct,tokens,latency_ms,peak_memory_mb\n");
    for r in results {
        csv.push_str(&format!(
            "{},{},{},{},{}\n",
            r.question_id, r.correct, r.total_tokens, r.total_latency_ms, r.peak_memory_mb,
        ));
    }
    csv
}
