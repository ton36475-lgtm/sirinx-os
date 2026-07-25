//! Persistent store for saving/loading harness training data.
//! Flat JSON-based, no heavy DB.

use std::fs;
use std::path::{Path, PathBuf};
use crate::harness::TrainingSample;

/// Simple persistent store for training data
pub struct DataStore {
    path: PathBuf,
}

impl DataStore {
    pub fn new(path: &Path) -> crate::Result<Self> {
        fs::create_dir_all(path)?;
        Ok(Self { path: path.to_path_buf() })
    }

    /// Save training samples to a JSON file
    pub fn save_samples(&self, samples: &[TrainingSample], name: &str) -> crate::Result<()> {
        let file_path = self.path.join(format!("{}.json", name));
        let content = serde_json::to_string_pretty(samples)?;
        fs::write(&file_path, content)?;
        Ok(())
    }

    /// Load training samples from a JSON file
    pub fn load_samples(&self, name: &str) -> crate::Result<Vec<TrainingSample>> {
        let file_path = self.path.join(format!("{}.json", name));
        if !file_path.exists() {
            return Ok(Vec::new());
        }
        let content = fs::read_to_string(&file_path)?;
        let samples: Vec<TrainingSample> = serde_json::from_str(&content)?;
        Ok(samples)
    }

    /// List all stored datasets
    pub fn list_datasets(&self) -> crate::Result<Vec<String>> {
        let mut datasets = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.path) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".json") {
                        datasets.push(name.trim_end_matches(".json").to_string());
                    }
                }
            }
        }
        Ok(datasets)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_save_load() {
        let dir = std::env::temp_dir().join("gc-store-test");
        let _ = fs::remove_dir_all(&dir);

        let store = DataStore::new(&dir).unwrap();
        let samples = vec![
            TrainingSample {
                agent_id: "test".into(),
                task_type: "eval".into(),
                input_hash: "abc".into(),
                output_quality: 0.9,
                latency_ms: 100,
                tokens_used: 500,
                context_length: 4096,
                passed_validation: true,
                timestamp: "now".into(),
            }
        ];

        store.save_samples(&samples, "test-set").unwrap();
        let loaded = store.load_samples("test-set").unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].agent_id, "test");

        let _ = fs::remove_dir_all(&dir);
    }
}
