//! Lightweight RAG Engine — retrieves context from vector store
//! and builds prompts for agents.
//!
//! No HTTP, no network — pure local library.

use crate::vector::VectorStore;

/// RAG context retrieved from knowledge base
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct RagContext {
    pub query: String,
    pub results: Vec<RagResult>,
    pub context_text: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct RagResult {
    pub source: String,
    pub score: f64,
    pub snippet: String,
}

/// Simple RAG engine backed by a vector store
pub struct RagEngine {
    store: VectorStore,
}

impl RagEngine {
    /// Open RAG engine backed by a vector store at `store_path`
    pub fn open(store_path: &std::path::Path, dimension: usize) -> crate::Result<Self> {
        let store = VectorStore::open(store_path, dimension)?;
        Ok(Self { store })
    }

    /// Query the knowledge base
    pub fn query(&self, query_text: &str, query_vector: &[f64], top_k: usize) -> RagContext {
        let results = self.store.search(query_vector, top_k);

        let rag_results: Vec<RagResult> = results.iter().map(|r| {
            let snippet = r.metadata.get("content")
                .cloned()
                .unwrap_or_else(|| format!("[doc: {}]", r.id));
            RagResult {
                source: r.id.clone(),
                score: r.score,
                snippet,
            }
        }).collect();

        // Build context text from results
        let context_text = rag_results.iter()
            .map(|r| format!("[{}] (score={:.3}): {}", r.source, r.score, r.snippet))
            .collect::<Vec<_>>()
            .join("\n");

        RagContext {
            query: query_text.to_string(),
            results: rag_results,
            context_text,
        }
    }

    /// Get the underlying vector store (for inserts)
    pub fn store_mut(&mut self) -> &mut VectorStore {
        &mut self.store
    }

    /// Get store ref
    pub fn store(&self) -> &VectorStore {
        &self.store
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::fs;

    #[test]
    fn test_rag_query() {
        let dir = std::env::temp_dir().join("gc-rag-test");
        let _ = fs::remove_dir_all(&dir);

        let mut engine = RagEngine::open(&dir, 4).unwrap();
        let mut meta = HashMap::new();
        meta.insert("content".to_string(), "Rust is a systems language".to_string());
        engine.store_mut().insert("doc1", &[1.0, 0.0, 0.0, 0.0], meta).unwrap();

        let ctx = engine.query("Rust", &[1.0, 0.0, 0.0, 0.0], 1);
        assert!(!ctx.results.is_empty());
        assert!(ctx.context_text.contains("Rust is a systems"));

        let _ = fs::remove_dir_all(&dir);
    }
}
