//! JSONL logging utilities.

use latent_protocol::BenchResult;
use std::path::Path;

/// Read a JSONL file and deserialize each line.
pub fn read_jsonl(path: &Path) -> anyhow::Result<Vec<BenchResult>> {
    let content = std::fs::read_to_string(path)?;
    let mut results = Vec::new();

    for (i, line) in content.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        match serde_json::from_str::<BenchResult>(line) {
            Ok(r) => results.push(r),
            Err(e) => {
                tracing::warn!("Failed to parse line {}: {e}", i + 1);
            }
        }
    }

    Ok(results)
}

/// Write results to a JSONL file.
pub fn write_jsonl(path: &Path, results: &[BenchResult]) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut content = String::new();
    for r in results {
        content.push_str(&serde_json::to_string(r)?);
        content.push('\n');
    }

    std::fs::write(path, content)?;
    Ok(())
}
