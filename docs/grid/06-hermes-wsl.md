# 06 - Hermes WSL Performance Grid

Status: implementation candidate, local-only

```mermaid
flowchart TB
  subgraph NORMAL["WSL: hermes normal mode"]
    N1["Frequent stdout flush"]
    N2["ANSI / emoji / spinner overhead"]
    N3["PTY latency"]
    N4["Subprocess context switch"]
    N5["Symptoms: slow, reconnecting, timeout, connection lost"]
  end

  subgraph TUI["WSL: hermes --tui"]
    T1["Alternate screen buffer"]
    T2["Frame-based redraw"]
    T3["Buffered UI updates"]
    T4["Async state kept in memory"]
    T5["Symptoms: lower latency, stable connection, higher throughput"]
  end

  subgraph OPT["Hermes Engineering Fixes"]
    O1["Detect WSL_DISTRO_NAME"]
    O2["Disable spinner / emoji when terminal is weak"]
    O3["NO_COLOR fallback"]
    O4["Buffered output flush"]
    O5["Default to TUI on WSL"]
    O6["Prefer ext4 project path over /mnt/c"]
  end

  NORMAL --> OPT
  TUI --> OPT
```

## Definition Of Done

- Detect WSL without assuming the shell is interactive.
- Prefer TUI or low-noise output when WSL PTY is weak.
- Add a local test or diagnostic command before changing runtime behavior.

