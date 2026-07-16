// Minimal lib for compilation
pub mod launch_gate;
pub mod agent_driver;

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskTier { Green, Yellow, Red }

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stage { Triage, Maker, Checker, Guard, Done, Aborted }

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Evidence { pub command: String, pub exit_code: i32, pub stdout: String, pub stderr: String }

pub fn advance() {}