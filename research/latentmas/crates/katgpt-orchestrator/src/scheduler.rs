//! Agent scheduler — orders and executes agents in topological order.
//!
//! For sequential chain execution (Phase 1), this is simple: run agents 0→1→2→3.
//! For future DAG/topology support, this will handle parallel execution.

use latent_protocol::AgentGraph;

/// Execution plan: ordered list of agent indices with their upstream dependencies.
#[derive(Debug, Clone)]
pub struct ExecutionPlan {
    /// Ordered list of (agent_index, upstream_indices) pairs.
    pub steps: Vec<(usize, Vec<usize>)>,
}

/// Build execution plan from agent graph.
pub fn plan_execution(graph: &AgentGraph) -> ExecutionPlan {
    // Topological sort
    let order = graph.execution_order();
    let mut steps = Vec::with_capacity(order.len());

    for &idx in &order {
        let upstream = graph.upstream_of(idx);
        steps.push((idx, upstream));
    }

    ExecutionPlan { steps }
}

#[cfg(test)]
mod tests {
    use super::*;
    use latent_protocol::AgentConfig;

    #[test]
    fn test_chain_plan() {
        let agents: Vec<AgentConfig> = (0..4)
            .map(|i| AgentConfig {
                name: format!("agent{i}"),
                role: latent_protocol::AgentRole::Custom(format!("agent{i}")),
                model_name: None,
                latent_steps: 20,
                prompt: String::new(),
                max_debug_tokens: 50,
            })
            .collect();

        let graph = AgentGraph::chain(agents);
        let plan = plan_execution(&graph);
        assert_eq!(plan.steps.len(), 4);
        assert!(plan.steps[0].1.is_empty()); // No upstream for first
        assert_eq!(plan.steps[1].1, vec![0]); // upstream is agent 0
    }
}
