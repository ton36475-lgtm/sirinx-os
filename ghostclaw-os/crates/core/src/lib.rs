//! GHOSTCLAW governance core.
//!
//! Domain types and the TRIAGE -> MAKER -> CHECKER -> GUARD state machine.
//! This crate performs **zero I/O**: no filesystem, no network, no process
//! spawning, no clock. Everything that touches the outside world lives in
//! `worker`, `providers`, `hermes`, `mcp-server`, or `telegram`.
//!
//! Keeping the governance rules in a dependency-free, side-effect-free crate
//! is what makes them testable as invariants rather than as integration luck.
//!
//! Stage S1 of the build order. Gate: `cargo test -p ghostclaw-core` green.

#![forbid(unsafe_code)]
#![deny(missing_debug_implementations)]

mod evidence;
mod machine;
mod risk;
mod stage;

pub use evidence::Evidence;
pub use machine::{Event, GovernanceError, Task};
pub use risk::RiskTier;
pub use stage::Stage;
