// services/command-center/src/evidence_chain.rs
// SHA256 Evidence Chain for GHOSTCLAW

use sha2::{Sha256, Digest};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct EvidenceEntry {
    pub task_id: String,
    pub action: String,
    pub timestamp: u64,
    pub hash: String,
    pub previous_hash: String,
}

pub struct EvidenceChain;

impl EvidenceChain {
    pub fn new_entry(task_id: &str, action: &str, prev_hash: &str) -> EvidenceEntry {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        let mut hasher = Sha256::new();
        hasher.update(format!("{}{}", task_id, action).as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        
        EvidenceEntry {
            task_id: task_id.to_string(),
            action: action.to_string(),
            timestamp,
            hash,
            previous_hash: prev_hash.to_string(),
        }
    }
}