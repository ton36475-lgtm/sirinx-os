# P1 Workspace Scaffold - Rust Crates Structure

# crates/hermes-core/Cargo.toml
```toml
[package]
name = "hermes-core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"

[lib]
path = "src/lib.rs"
```

# crates/hermes-worker/Cargo.toml  
```toml
[package]
name = "hermes-worker"
version = "0.1.0"
edition = "2021"

[dependencies]
hermes-core = { path = "../hermes-core" }
worker = "0.5"

[[bin]]
name = "hermes-worker"
path = "src/lib.rs"
```

# crates/hermes-governance/Cargo.toml
```toml
[package]
name = "hermes-governance"
version = "0.1.0"
edition = "2021"

[dependencies]
hermes-core = { path = "../hermes-core" }

[lib]
path = "src/lib.rs"
```

---

## P1 Cargo Workspace (ready for deployment)

```toml
[workspace]
members = [
  "crates/hermes-core",
  "crates/hermes-worker",
  "crates/hermes-governance",
  "crates/hermes-lock",
  "crates/hermes-router",
  "crates/hermes-dispatch",
  "crates/hermes-feed"
]
resolver = "2"
```