//! CI guard: no RED auto-approve path may reappear.
//!
//! Modelled on the existing rule that greps the GUARD crate for `git push`. The
//! reason for a grep test rather than a unit test is that the thing being
//! prevented is a *future edit*, not a current behaviour — a unit test proves
//! today's code is right, this proves tomorrow's cannot quietly stop being.
//!
//! Background: docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md

use std::path::Path;

/// Tokens that mean a Red auto-approve path and nothing else.
///
/// Green and Yellow auto-approval is correct behaviour, so the bare words
/// "auto-approve" and "auto_approve" are deliberately NOT here — a guard that
/// fires on legitimate code is a guard someone eventually deletes.
const BANNED_ALWAYS: &[&str] = &["AutoApproveAttempt", "AutoPolicy", "auto:red"];

/// Identifiers that would be a Red auto-approve path. `auto_approve` in this
/// form can only be a function or field name — prose uses the hyphen.
const BANNED_IDENTS: &[&str] = &["auto_approve", "autoApprove"];

/// `auto-approve` cannot be a Rust identifier, so it is only worth flagging when
/// it looks like a route rather than a sentence.
fn looks_like_a_route(line: &str) -> bool {
    line.contains("/auto-approve")
}

fn mentions_red(line: &str) -> bool {
    let l = line.to_ascii_lowercase();
    l.contains("red") && !l.contains("required") && !l.contains("credential")
}

/// A line about the automatic tiers is not about Red. `green_auto_approves_at_guard`
/// contains `auto_approve` as a substring and is entirely correct.
fn is_about_an_automatic_tier(line: &str) -> bool {
    let l = line.to_ascii_lowercase();
    l.contains("green") || l.contains("yellow")
}

/// Whether this line is a Red auto-approve path.
fn is_red_auto_approve(line: &str) -> bool {
    if BANNED_ALWAYS.iter().any(|t| line.contains(t)) {
        return true;
    }
    if is_about_an_automatic_tier(line) {
        return false;
    }
    BANNED_IDENTS.iter().any(|t| line.contains(t)) || (looks_like_a_route(line) && mentions_red(line))
}

/// Prose about the removal is not the removal. Comments are described, not code.
fn is_comment(line: &str) -> bool {
    let t = line.trim_start();
    t.starts_with("//") || t.starts_with("/*") || t.starts_with('*')
}

fn scan(dir: &Path, hits: &mut Vec<String>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for e in entries.flatten() {
        let path = e.path();
        let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if path.is_dir() {
            if name != "target" && !name.starts_with('.') {
                scan(&path, hits);
            }
            continue;
        }
        if path.extension().and_then(|s| s.to_str()) != Some("rs") {
            continue;
        }
        // This guard names the banned tokens itself; skipping it avoids a
        // test that always fails on its own source.
        if name == "red_gate_guard.rs" {
            continue;
        }
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        for (i, line) in text.lines().enumerate() {
            // A line explaining that the path was removed is not the path.
            if line.contains("P100") || line.trim_start().starts_with("//!") {
                continue;
            }
            if is_comment(line) {
                continue;
            }
            if is_red_auto_approve(line) {
                hits.push(format!("{}:{}  {}", path.display(), i + 1, line.trim()));
            }
        }
    }
}

#[test]
fn no_red_auto_approve_path_exists_in_the_workspace() {
    // crates/core/tests → ../../  = the crates/ directory.
    let crates = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("crates dir")
        .to_path_buf();

    let mut hits = Vec::new();
    scan(&crates, &mut hits);

    assert!(
        hits.is_empty(),
        "a RED auto-approve path has reappeared. The Red gate advances on \
         HumanApprove/HumanReject only — see docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md.\n\n{}",
        hits.join("\n")
    );
}

#[test]
fn the_guard_actually_looks_at_files() {
    // A scanner with a broken path silently passes forever. Prove it reads code.
    let crates = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("crates dir")
        .to_path_buf();
    assert!(crates.join("core/src/lib.rs").exists(), "scan root is wrong: {}", crates.display());
}

#[test]
fn the_guard_would_catch_the_path_that_was_removed() {
    // The lines below are what P100 found. If the matcher stops recognising them,
    // the guard is decorative.
    let removed = [
        "            Event::AutoApproveAttempt(policy) => {",
        "                let policy = AutoPolicy::default();",
        r#"                let approver = format!("auto:red:{}", policy.policy_version);"#,
        r#"        .route("/api/tasks/{id}/auto-approve", post(auto_approve))  // RED"#,
    ];
    for line in removed {
        let caught = is_red_auto_approve(line);
        assert!(caught, "guard would not catch: {line}");
    }
}

#[test]
fn the_guard_leaves_green_and_yellow_alone() {
    // These are correct. A guard that fires on them gets switched off.
    let legitimate = [
        r#"            task.approval = ApprovalState::ApprovedBy("auto:green".into());"#,
        r#"            task.audit.push(format!("auto-approved: yellow tier (abort window elapsed)"));"#,
        r#"    fn green_auto_approves_at_guard() {"#,
        r#"        "Green=auto-approve, Yellow=abort window, Red=human gate required""#,
    ];
    for line in legitimate {
        let caught = is_red_auto_approve(line);
        assert!(!caught, "guard false-positives on legitimate code: {line}");
    }
}
