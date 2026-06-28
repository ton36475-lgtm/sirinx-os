//! Agent role, configuration, and graph topology definitions.

/// Role of an agent in the collaboration chain.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum AgentRole {
    Planner,
    Critic,
    Refiner,
    Solver,
    Custom(String),
}

impl std::fmt::Display for AgentRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentRole::Planner => write!(f, "planner"),
            AgentRole::Critic => write!(f, "critic"),
            AgentRole::Refiner => write!(f, "refiner"),
            AgentRole::Solver => write!(f, "solver"),
            AgentRole::Custom(name) => write!(f, "{}", name),
        }
    }
}

/// Configuration for a single agent.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub role: AgentRole,
    pub model_name: Option<String>,
    pub latent_steps: usize,
    pub prompt: String,
    pub max_debug_tokens: usize,
}

/// Topology of the agent communication graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Topology {
    /// Sequential: A → B → C → D
    Chain,
    /// Directed acyclic graph (custom edges).
    Dag,
    /// Ring: A → B → C → D → A
    Ring,
    /// Star: all agents → central agent
    Star,
    /// Hierarchical: planner → [critic, refiner] → solver
    Hierarchical,
}

impl std::fmt::Display for Topology {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Topology::Chain => write!(f, "chain"),
            Topology::Dag => write!(f, "dag"),
            Topology::Ring => write!(f, "ring"),
            Topology::Star => write!(f, "star"),
            Topology::Hierarchical => write!(f, "hierarchical"),
        }
    }
}

/// Agent graph: defines the execution order and communication edges.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentGraph {
    pub agents: Vec<AgentConfig>,
    pub topology: Topology,
    /// Edges: (from_index, to_index). For chain: [(0,1), (1,2), (2,3)]
    pub edges: Vec<(usize, usize)>,
}

impl AgentGraph {
    /// Build a sequential chain graph from agent configs.
    pub fn chain(agents: Vec<AgentConfig>) -> Self {
        let edges: Vec<(usize, usize)> = (0..agents.len().saturating_sub(1))
            .map(|i| (i, i + 1))
            .collect();
        Self {
            agents,
            topology: Topology::Chain,
            edges,
        }
    }

    /// Get execution order (topological sort). For chain, it's just 0..n.
    pub fn execution_order(&self) -> Vec<usize> {
        // For chain and star, topological sort is just sequential.
        // For DAG, we'd need a proper topo sort. For now, sequential.
        (0..self.agents.len()).collect()
    }

    /// Get upstream agents whose KV should be passed to agent at `index`.
    pub fn upstream_of(&self, index: usize) -> Vec<usize> {
        self.edges
            .iter()
            .filter(|(_, to)| *to == index)
            .map(|(from, _)| *from)
            .collect()
    }

    /// Get downstream agents that receive KV from agent at `index`.
    pub fn downstream_of(&self, index: usize) -> Vec<usize> {
        self.edges
            .iter()
            .filter(|(from, _)| *from == index)
            .map(|(_, to)| *to)
            .collect()
    }
}

/// Default agent chain: Planner → Critic → Refiner → Solver
impl Default for AgentGraph {
    fn default() -> Self {
        let agents = vec![
            AgentConfig {
                name: "planner".into(),
                role: AgentRole::Planner,
                model_name: None,
                latent_steps: 40,
                prompt: "You are a Planner. Break down the problem into steps.".into(),
                max_debug_tokens: 50,
            },
            AgentConfig {
                name: "critic".into(),
                role: AgentRole::Critic,
                model_name: None,
                latent_steps: 20,
                prompt: "You are a Critic. Identify potential issues in the plan.".into(),
                max_debug_tokens: 50,
            },
            AgentConfig {
                name: "refiner".into(),
                role: AgentRole::Refiner,
                model_name: None,
                latent_steps: 40,
                prompt: "You are a Refiner. Improve the plan based on critique.".into(),
                max_debug_tokens: 50,
            },
            AgentConfig {
                name: "solver".into(),
                role: AgentRole::Solver,
                model_name: None,
                latent_steps: 20,
                prompt: "You are a Solver. Produce the final answer.".into(),
                max_debug_tokens: 0,
            },
        ];
        Self::chain(agents)
    }
}
