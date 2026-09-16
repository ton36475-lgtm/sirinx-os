//! Agent graph construction and validation.

use latent_protocol::{AgentConfig, AgentGraph, AgentRole, Topology};
use std::collections::HashMap;

/// Build an agent graph from constituent parts.
pub fn build_graph(
    agent_names: &[String],
    latent_steps: &[usize],
    topology: &str,
) -> anyhow::Result<AgentGraph> {
    if agent_names.len() != latent_steps.len() {
        anyhow::bail!(
            "Agent count ({}) != latent_steps count ({})",
            agent_names.len(),
            latent_steps.len()
        );
    }

    let role_map: HashMap<&str, AgentRole> = HashMap::from([
        ("planner", AgentRole::Planner),
        ("critic", AgentRole::Critic),
        ("refiner", AgentRole::Refiner),
        ("solver", AgentRole::Solver),
    ]);

    let agents: Vec<AgentConfig> = agent_names
        .iter()
        .enumerate()
        .map(|(i, name)| {
            let role = role_map
                .get(name.as_str())
                .cloned()
                .unwrap_or_else(|| AgentRole::Custom(name.clone()));
            AgentConfig {
                name: name.clone(),
                role,
                model_name: None,
                latent_steps: latent_steps[i],
                prompt: default_prompt(name),
                max_debug_tokens: if i < agent_names.len() - 1 { 50 } else { 0 },
            }
        })
        .collect();

    let top = match topology {
        "chain" => Topology::Chain,
        "dag" => Topology::Dag,
        "ring" => Topology::Ring,
        "star" => Topology::Star,
        "hierarchical" => Topology::Hierarchical,
        other => anyhow::bail!("Unknown topology: {other}"),
    };

    // Build edges
    let edges = match top {
        Topology::Chain => (0..agents.len().saturating_sub(1))
            .map(|i| (i, i + 1))
            .collect(),
        Topology::Ring => {
            let n = agents.len();
            let mut e: Vec<(usize, usize)> = (0..n).map(|i| (i, (i + 1) % n)).collect();
            e.pop(); // remove last edge to avoid cycle in processing order
            e
        }
        Topology::Star => {
            // All agents → central agent (middle one)
            let center = agents.len() / 2;
            (0..agents.len())
                .filter(|&i| i != center)
                .map(|i| (i, center))
                .collect()
        }
        Topology::Hierarchical => {
            match agents.len() {
                4 => vec![(0, 1), (0, 2), (1, 3), (2, 3)], // planner → {critic, refiner} → solver
                n => (0..n.saturating_sub(1)).map(|i| (i, i + 1)).collect(), // fallback
            }
        }
        Topology::Dag => {
            // For DAG, default to chain; custom DAGs would be specified via config
            (0..agents.len().saturating_sub(1))
                .map(|i| (i, i + 1))
                .collect()
        }
    };

    Ok(AgentGraph {
        agents,
        topology: top,
        edges,
    })
}

fn default_prompt(name: &str) -> String {
    match name {
        "planner" => "You are a Planner. Break down the problem into clear steps.".into(),
        "critic" => "You are a Critic. Identify errors, gaps, and risks in the plan.".into(),
        "refiner" => "You are a Refiner. Improve the solution based on critique.".into(),
        "solver" => "You are a Solver. Produce the final answer based on prior work.".into(),
        other => format!("You are {other}. Process the input and prepare for the next agent."),
    }
}
