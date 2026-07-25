//! GHOSTCLAW Telegram command surface, exposed as a library so the command
//! handlers can be exercised without a live Telegram round-trip.
//!
//! The binary in `main.rs` is the long-polling loop; the logic it dispatches
//! lives here.

pub mod maxplus_commands;
