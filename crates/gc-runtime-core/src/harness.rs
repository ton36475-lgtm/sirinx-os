//! Harness Trainer — Self-evaluation & capability improvement
//!
//! Measures agent performance, identifies gaps, generates improvements.
//! Runs as part of the self-evolution loop.

use std::collections::HashMap;

/// A training sample — one agent performance record
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TrainingSample {
    pub agent_id: String,
    pub task_type: String,
    pub input_hash: String,
    pub output_quality: f64,     // 0.0 - 1.0
    pub latency_ms: u64,
    pub tokens_used: u64,
    pub context_length: u64,
    pub passed_validation: bool,
    pub timestamp: String,
}

/// Evaluation result
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct EvalResult {
    pub agent_id: String,
    pub samples_evaluated: usize,
    pub avg_quality: f64,
    pub pass_rate: f64,
    pub avg_latency_ms: u64,
    pub bottlenecks: Vec<String>,
    pub improvement_suggestions: Vec<String>,
}

/// Simple in-memory training harness (no heavy ML)
pub struct Harness {
    samples: Vec<TrainingSample>,
    /// Map of agent → capability scores
    capability_cache: HashMap<String, AgentCapability>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AgentCapability {
    pub agent_id: String,
    pub overall_score: f64,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub last_updated: String,
}

impl Harness {
    pub fn new() -> Self {
        Self {
            samples: Vec::new(),
            capability_cache: HashMap::new(),
        }
    }

    /// Record a training sample
    pub fn record_sample(&mut self, sample: TrainingSample) {
        self.samples.push(sample);
    }

    /// Evaluate an agent's performance
    pub fn evaluate(&self, agent_id: &str, last_n: usize) -> EvalResult {
        let agent_samples: Vec<&TrainingSample> = self.samples
            .iter()
            .filter(|s| s.agent_id == agent_id)
            .rev()
            .take(last_n)
            .collect();

        let total = agent_samples.len();
        if total == 0 {
            return EvalResult {
                agent_id: agent_id.to_string(),
                samples_evaluated: 0,
                avg_quality: 0.0,
                pass_rate: 0.0,
                avg_latency_ms: 0,
                bottlenecks: vec!["No samples recorded".to_string()],
                improvement_suggestions: vec!["Start recording training data".to_string()],
            };
        }

        let avg_quality: f64 = agent_samples.iter().map(|s| s.output_quality).sum::<f64>() / total as f64;
        let pass_count = agent_samples.iter().filter(|s| s.passed_validation).count();
        let pass_rate = pass_count as f64 / total as f64;
        let avg_latency: u64 = agent_samples.iter().map(|s| s.latency_ms).sum::<u64>() / total as u64;

        // Detect bottlenecks
        let mut bottlenecks = Vec::new();
        if avg_latency > 5000 {
            bottlenecks.push(format!("High latency ({}ms avg)", avg_latency));
        }
        if pass_rate < 0.7 {
            bottlenecks.push(format!("Low validation pass rate ({:.1}%)", pass_rate * 100.0));
        }
        if avg_quality < 0.5 {
            bottlenecks.push(format!("Low output quality ({:.2})", avg_quality));
        }

        // Generate improvement suggestions
        let mut suggestions = Vec::new();
        if pass_rate < 0.8 {
            suggestions.push("Increase guardrail strictness — pre-validate outputs".to_string());
        }
        if avg_latency > 2000 {
            suggestions.push("Reduce context window or switch to faster model".to_string());
        }

        EvalResult {
            agent_id: agent_id.to_string(),
            samples_evaluated: total,
            avg_quality,
            pass_rate,
            avg_latency_ms: avg_latency,
            bottlenecks,
            improvement_suggestions: suggestions,
        }
    }

    /// Calculate capability score for an agent
    pub fn capability(&mut self, agent_id: &str) -> AgentCapability {
        if let Some(cached) = self.capability_cache.get(agent_id) {
            return cached.clone();
        }

        let eval = self.evaluate(agent_id, 100);
        let overall = eval.avg_quality * 0.4 + eval.pass_rate * 0.6;

        let capability = AgentCapability {
            agent_id: agent_id.to_string(),
            overall_score: overall,
            strengths: vec![],
            weaknesses: eval.bottlenecks.clone(),
            last_updated: format!("{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()),
        };

        self.capability_cache.insert(agent_id.to_string(), capability.clone());
        capability
    }

    /// Total training samples collected
    pub fn total_samples(&self) -> usize {
        self.samples.len()
    }

    /// Clear capability cache (force re-eval)
    pub fn invalidate_cache(&mut self) {
        self.capability_cache.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_sample(agent: &str, quality: f64, passed: bool) -> TrainingSample {
        TrainingSample {
            agent_id: agent.to_string(),
            task_type: "code_gen".to_string(),
            input_hash: "abc".to_string(),
            output_quality: quality,
            latency_ms: 100,
            tokens_used: 500,
            context_length: 4096,
            passed_validation: passed,
            timestamp: "2026-01-01".to_string(),
        }
    }

    #[test]
    fn test_harness_eval() {
        let mut h = Harness::new();
        for _ in 0..10 {
            h.record_sample(make_sample("codex", 0.8, true));
        }
        for _ in 0..5 {
            h.record_sample(make_sample("codex", 0.3, false));
        }

        let result = h.evaluate("codex", 100);
        assert_eq!(result.samples_evaluated, 15);
        assert!(result.avg_quality > 0.5);
        assert!(result.pass_rate > 0.5);
    }
}
