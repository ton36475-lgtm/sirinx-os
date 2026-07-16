//! GHOSTCLAW MCP Server — exposes tool surfaces to agents via stdio.
//! Governance NEVER lives here — MCP exposes capabilities, Hermes decides.

use ghostclaw_core::Evidence;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use tracing::info;

#[derive(Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    #[serde(default)]
    params: Value,
    id: Value,
}

fn main() {
    tracing_subscriber::fmt().init();
    info!("GHOSTCLAW MCP Server starting (stdio mode)");

    let stdin = io::stdin();
    let stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if line.trim().is_empty() {
            continue;
        }

        let req: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let _ = write_response(stdout.lock(), &json!({
                    "jsonrpc": "2.0",
                    "error": {"code": -32700, "message": format!("Parse error: {e}")},
                    "id": null
                }));
                continue;
            }
        };

        let result = handle_method(&req.method, &req.params);
        let resp = json!({
            "jsonrpc": "2.0",
            "result": result,
            "id": req.id
        });

        let mut out = stdout.lock();
        let _ = write_response(out, &resp);
    }
}

fn write_response(mut out: io::StdoutLock<'_>, resp: &Value) {
    let _ = writeln!(out, "{}", serde_json::to_string(resp).unwrap());
    let _ = out.flush();
}

fn handle_method(method: &str, params: &Value) -> Value {
    match method {
        "initialize" => json!({
            "protocolVersion": "2025-06-18",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "ghostclaw-mcp",
                "version": "0.1.0"
            }
        }),
        "tools/list" => json!({
            "tools": [
                {
                    "name": "run_check",
                    "description": "Run a verification command (cargo test, npm build, etc.) and return raw evidence",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "command": {"type": "string"},
                            "args": {"type": "array", "items": {"type": "string"}},
                            "cwd": {"type": "string"}
                        },
                        "required": ["command", "cwd"]
                    }
                },
                {
                    "name": "classify_risk",
                    "description": "Classify a task description into risk tiers (Green/Yellow/Red)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"}
                        },
                        "required": ["description"]
                    }
                },
                {
                    "name": "git_commit",
                    "description": "Create a git commit (NEVER git push — that requires human gate)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string"},
                            "branch": {"type": "string"}
                        },
                        "required": ["message"]
                    }
                }
            ]
        }),
        "tools/call" => {
            let tool_name = params["name"].as_str().unwrap_or("");
            match tool_name {
                "run_check" => {
                    let cmd = params["arguments"]["command"].as_str().unwrap_or("");
                    let cwd = params["arguments"]["cwd"].as_str().unwrap_or(".");

                    // Parse args
                    let args: Vec<&str> = params["arguments"]["args"]
                        .as_array()
                        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
                        .unwrap_or_default();

                    // This is sync in MCP stdio mode — spawn blocking
                    let evidence = std::process::Command::new(cmd)
                        .args(&args)
                        .current_dir(cwd)
                        .output();

                    match evidence {
                        Ok(output) => {
                            let ev = Evidence {
                                command: format!("{cmd} {}", args.join(" ")),
                                exit_code: output.status.code().unwrap_or(-1),
                                stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
                                stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
                            };
                            json!({
                                "content": [{
                                    "type": "text",
                                    "text": serde_json::to_string_pretty(&ev).unwrap()
                                }]
                            })
                        }
                        Err(e) => json!({
                            "content": [{
                                "type": "text",
                                "text": format!("Error: {e}")
                            }],
                            "isError": true
                        }),
                    }
                }
                "classify_risk" => {
                    let desc = params["arguments"]["description"].as_str().unwrap_or("").to_lowercase();
                    let risk = if desc.contains("deploy") || desc.contains("push") || desc.contains("delete")
                        || desc.contains("production") || desc.contains("payment") || desc.contains("secret")
                        || desc.contains("dns") || desc.contains("drop") || desc.contains("ลบ")
                        || desc.contains("ดีพลอย") || desc.contains("โปรดักชัน")
                    {
                        "Red"
                    } else if desc.contains("merge") || desc.contains("install")
                        || desc.contains("migrate") || desc.contains("commit")
                    {
                        "Yellow"
                    } else {
                        "Green"
                    };
                    json!({
                        "content": [{
                            "type": "text",
                            "text": format!("Risk tier: {risk}\nGreen=auto-approve, Yellow=abort window, Red=human gate required")
                        }]
                    })
                }
                "git_commit" => {
                    // GUARD's git rule: commit only, NEVER push
                    json!({
                        "content": [{
                            "type": "text",
                            "text": "git_commit tool: creates commit only. git push is NOT available in any MCP tool. Push requires human gate via Hermes /api/tasks/:id/approve."
                        }]
                    })
                }
                _ => json!({
                    "content": [{"type": "text", "text": format!("Unknown tool: {tool_name}")}],
                    "isError": true
                }),
            }
        }
        _ => json!(null),
    }
}
