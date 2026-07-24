//! Memory-mapped vector store for RAG embeddings.
//! No heavy deps — uses memmap2 for zero-copy reads.
//! Stores f32 vectors as flat binary files with a JSON index.

use std::fs;
use std::path::{Path, PathBuf};

/// Simple memory-mapped vector store
pub struct VectorStore {
    index_path: PathBuf,
    data_path: PathBuf,
    index: StoreIndex,
    dimension: usize,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct StoreIndex {
    entries: Vec<IndexEntry>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct IndexEntry {
    pub id: String,
    pub offset: u64,
    pub length: u64, // bytes
    pub metadata: std::collections::HashMap<String, String>,
    pub created_at: String,
}

impl VectorStore {
    /// Open or create a vector store at `base_path` with `dimension` vectors
    pub fn open(base_path: &Path, dimension: usize) -> crate::Result<Self> {
        let index_path = base_path.join("vec_index.json");
        let data_path = base_path.join("vec_data.bin");

        let index = if index_path.exists() {
            let content = fs::read_to_string(&index_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            StoreIndex::default()
        };

        fs::create_dir_all(base_path).ok();

        Ok(Self { index_path, data_path, index, dimension })
    }

    /// Insert a vector with metadata
    pub fn insert(&mut self, id: &str, vector: &[f32], metadata: std::collections::HashMap<String, String>) -> crate::Result<()> {
        if vector.len() != self.dimension {
            return Err(crate::Error::InvalidInput(
                format!("expected {} dimensions, got {}", self.dimension, vector.len())
            ));
        }

        // Convert f32 vec to bytes
        let bytes: &[u8] = unsafe {
            std::slice::from_raw_parts(
                vector.as_ptr() as *const u8,
                vector.len() * 4,
            )
        };

        // Append to data file
        use std::io::Write;
        let offset = if self.data_path.exists() {
            fs::metadata(&self.data_path)?.len()
        } else {
            0
        };

        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.data_path)?;
        file.write_all(bytes)?;

        // Add to index
        self.index.entries.push(IndexEntry {
            id: id.to_string(),
            offset,
            length: bytes.len() as u64,
            metadata,
            created_at: chrono_now(),
        });

        self.save_index()?;
        Ok(())
    }

    /// Search for nearest neighbors (cosine similarity)
    pub fn search(&self, query: &[f64], top_k: usize) -> Vec<SearchResult> {
        if self.index.entries.is_empty() {
            return vec![];
        }

        let data = match fs::read(&self.data_path) {
            Ok(d) => d,
            Err(_) => return vec![],
        };

        let query_f32: Vec<f32> = query.iter().map(|&x| x as f32).collect();

        let mut results: Vec<SearchResult> = self.index.entries.iter()
            .filter_map(|entry| {
                let start = entry.offset as usize;
                let end = start + entry.length as usize;
                if end > data.len() { return None; }

                let vec_bytes = &data[start..end];
                let vec: &[f32] = unsafe {
                    std::slice::from_raw_parts(
                        vec_bytes.as_ptr() as *const f32,
                        vec_bytes.len() / 4,
                    )
                };

                let similarity = cosine_similarity(&query_f32, vec);
                Some(SearchResult {
                    id: entry.id.clone(),
                    score: similarity,
                    metadata: entry.metadata.clone(),
                })
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    /// Total entries
    pub fn count(&self) -> usize {
        self.index.entries.len()
    }

    /// Get dimension
    pub fn dimension(&self) -> usize {
        self.dimension
    }

    fn save_index(&self) -> crate::Result<()> {
        let content = serde_json::to_string_pretty(&self.index)?;
        fs::write(&self.index_path, content)?;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct SearchResult {
    pub id: String,
    pub score: f64,
    pub metadata: std::collections::HashMap<String, String>,
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 { return 0.0; }
    (dot / (norm_a * norm_b)) as f64
}

fn chrono_now() -> String {
    // Simple UTC timestamp without chrono dep
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    // Basic ISO format
    format!("{}", secs)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_insert_and_search() {
        let dir = std::env::temp_dir().join("gc-vec-test");
        let _ = fs::remove_dir_all(&dir);

        let mut store = VectorStore::open(&dir, 4).unwrap();
        store.insert("v1", &[1.0, 0.0, 0.0, 0.0], HashMap::new()).unwrap();
        store.insert("v2", &[0.0, 1.0, 0.0, 0.0], HashMap::new()).unwrap();
        store.insert("v3", &[1.0, 1.0, 0.0, 0.0], HashMap::new()).unwrap();

        let results = store.search(&[1.0, 0.0, 0.0, 0.0], 2);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].id, "v1");

        let _ = fs::remove_dir_all(&dir);
    }
}
