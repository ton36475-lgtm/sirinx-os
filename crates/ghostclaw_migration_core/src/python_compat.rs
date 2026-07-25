//! Python compatibility boundary.
//!
//! The `python` feature is intentionally a placeholder in P085. It documents the
//! future PyO3 adapter seam without pulling dependencies or loading Python during
//! local-safe validation.

use crate::engine::{handle_with_memory, EngineResponse};
use crate::error::Result;

/// Handles a command in the same shape expected by a future Python wrapper.
pub fn handle_command_for_python(raw_command: &str) -> Result<EngineResponse> {
    handle_with_memory(raw_command)
}
