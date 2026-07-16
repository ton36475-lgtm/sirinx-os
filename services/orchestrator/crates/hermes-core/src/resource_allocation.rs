//! Explicit resource budgets without hardware or provider assumptions.

use serde::{Deserialize, Serialize};

use crate::RiskTier;

/// Operator-supplied hardware facts. The control plane never guesses them.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HardwareProfile {
    /// Logical cores admitted to the worker pool.
    pub cpu_cores: u16,
    /// Memory budget in mebibytes.
    pub memory_mib: u32,
    /// Whether an approved accelerator is available.
    pub accelerator_available: bool,
    /// Accelerator memory budget in mebibytes.
    pub accelerator_memory_mib: u32,
}

impl HardwareProfile {
    /// Creates a validated, explicitly detected hardware profile.
    pub fn new(
        cpu_cores: u16,
        memory_mib: u32,
        accelerator_available: bool,
        accelerator_memory_mib: u32,
    ) -> Result<Self, ResourceProfileError> {
        if cpu_cores == 0 || memory_mib == 0 {
            return Err(ResourceProfileError::MissingCapacity);
        }
        if !accelerator_available && accelerator_memory_mib != 0 {
            return Err(ResourceProfileError::UnexpectedAcceleratorMemory);
        }
        if accelerator_available && accelerator_memory_mib == 0 {
            return Err(ResourceProfileError::MissingAcceleratorMemory);
        }
        Ok(Self {
            cpu_cores,
            memory_mib,
            accelerator_available,
            accelerator_memory_mib,
        })
    }

    /// Produces a bounded recommendation. This does not authorize execution.
    pub fn allocation_for(
        &self,
        tier: RiskTier,
    ) -> Result<ResourceAllocation, ResourceProfileError> {
        let (requested_cores, requested_memory_mib) = match tier {
            RiskTier::Low => (1, 512),
            RiskTier::Medium => (self.cpu_cores.min(2), 2_048),
            RiskTier::High => (self.cpu_cores.min(4), 4_096),
        };
        if self.memory_mib < requested_memory_mib {
            return Err(ResourceProfileError::InsufficientMemory {
                required_mib: requested_memory_mib,
                available_mib: self.memory_mib,
            });
        }
        Ok(ResourceAllocation {
            cpu_cores: requested_cores,
            memory_mib: requested_memory_mib,
            accelerator: false,
        })
    }
}

/// Concrete bounded resource request.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ResourceAllocation {
    /// Logical cores assigned to one task.
    pub cpu_cores: u16,
    /// Memory limit in mebibytes.
    pub memory_mib: u32,
    /// Whether the task may use an accelerator. Defaults to false because
    /// accelerator use requires a separate compute-policy decision.
    pub accelerator: bool,
}

/// Sanitized performance counters associated with a task receipt.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct PerformanceTelemetry {
    /// Total elapsed milliseconds.
    pub latency_ms: u64,
    /// CPU milliseconds charged to the task.
    pub cpu_time_ms: u64,
    /// Peak resident memory in mebibytes.
    pub peak_memory_mib: u32,
    /// Integer cost in micro-units, avoiding floating-point money arithmetic.
    pub cost_micros: u64,
}

/// Invalid or insufficient resource profile.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum ResourceProfileError {
    /// CPU and memory capacity must both be positive.
    #[error("hardware profile must declare positive cpu and memory capacity")]
    MissingCapacity,
    /// Accelerator memory cannot be declared when no accelerator exists.
    #[error("accelerator memory declared without an accelerator")]
    UnexpectedAcceleratorMemory,
    /// An admitted accelerator must declare its memory capacity.
    #[error("accelerator memory capacity is missing")]
    MissingAcceleratorMemory,
    /// The profile cannot satisfy the bounded tier recommendation.
    #[error("requires {required_mib} MiB but only {available_mib} MiB is available")]
    InsufficientMemory {
        /// Requested memory.
        required_mib: u32,
        /// Available memory.
        available_mib: u32,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_should_not_infer_accelerator_memory() {
        let result = HardwareProfile::new(8, 16_384, false, 4_096);

        assert_eq!(
            result,
            Err(ResourceProfileError::UnexpectedAcceleratorMemory)
        );
    }

    #[test]
    fn allocation_should_fail_when_memory_is_insufficient() {
        let profile = HardwareProfile::new(2, 1_024, false, 0).expect("valid profile");

        let result = profile.allocation_for(RiskTier::High);

        assert!(matches!(
            result,
            Err(ResourceProfileError::InsufficientMemory { .. })
        ));
    }

    #[test]
    fn allocation_should_keep_accelerator_disabled_without_separate_gate() {
        let profile = HardwareProfile::new(8, 16_384, true, 8_192).expect("valid profile");

        let allocation = profile
            .allocation_for(RiskTier::High)
            .expect("profile has capacity");

        assert!(!allocation.accelerator);
    }
}
