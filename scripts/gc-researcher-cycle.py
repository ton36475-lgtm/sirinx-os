#!/usr/bin/env python3
"""
GC Data Researcher — Full Auto Research Cycle
Sub-agent ที่รันรอบวิจัยอัตโนมัติ พร้อม ChatGPT Deep Research integration
"""
import json, os, sys, subprocess, time, re
from pathlib import Path

REPO = Path("/Users/sirinx/sirinx-os")
RUNTIME = REPO / ".ghostclaw_runtime" / "research"
OUTBOX = REPO / ".ghostclaw_runtime" / "a2a2a" / "outbox"
BRAIN = Path("/Users/sirinx/Documents/Obsidian Vault/SIRINX/08_AI_MEMORY")

RUNTIME.mkdir(parents=True, exist_ok=True)

def log(msg: str):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"[{ts}] {msg}")

class DataResearcher:
    def __init__(self):
        self.run_id = f"DR-{time.strftime('%Y%m%d-%H%M%S')}"
    
    def scan_gaps(self) -> dict:
        """Phase 1 — scan system state + identify research gaps"""
        log("Phase 1: Scanning system gaps")
        gaps = {"bridge": {}, "qa": {}, "backlog": {}, "agents": {}}
        
        # Check bridge state
        bridge_file = REPO / ".ghostclaw_runtime" / "bridge_memory_state.json"
        if bridge_file.exists():
            data = json.loads(bridge_file.read_text())
            gaps["bridge"] = data
        
        # Check outbox backlog
        for agent in ["hermes","codex","opencode","zcode","kiro","copilot"]:
            agent_dir = OUTBOX / agent
            if agent_dir.exists():
                count = len(list(agent_dir.glob("*.md")))
                if count > 0:
                    gaps["backlog"][agent] = count
        
        # Check QA verdict
        qa_dir = REPO / ".ghostclaw_runtime" / "a2a2a" / "qa-reviews"
        if qa_dir.exists():
            logs = sorted(qa_dir.glob("qa-review-*.json"), reverse=True)
            if logs:
                try:
                    data = json.loads(logs[0].read_text())
                    gaps["qa"] = data.get("verdict", "unknown")
                except: pass
        
        # Save snapshot
        snapshot = RUNTIME / "tasks" / f"snapshot-{self.run_id}.json"
        snapshot.write_text(json.dumps(gaps, indent=2))
        log(f"  Snapshot saved: {snapshot.name}")
        return gaps
    
    def generate_questions(self, gaps: dict) -> list:
        """Phase 2 — generate research questions from gaps"""
        log("Phase 2: Generating research questions")
        questions = [
            {
                "id": f"{self.run_id}-Q1",
                "topic": "Multi-agent orchestration best practices 2026",
                "priority": "high",
                "reason": "Backlog of 217 packets across fleet — need better coordination patterns"
            },
            {
                "id": f"{self.run_id}-Q2",
                "topic": "Rust async CLI patterns with tokio",
                "priority": "medium",
                "reason": "GhostClaw Rust crates have compile warnings — need modern patterns"
            },
            {
                "id": f"{self.run_id}-Q3",
                "topic": "AI safety gate implementation patterns",
                "priority": "high",
                "reason": "QA auto-review false positives — need better safety scanning"
            },
            {
                "id": f"{self.run_id}-Q4",
                "topic": "Automated code review and QA pipelines 2026",
                "priority": "high",
                "reason": "51 unstaged files, QA verdict always BLOCK — need automated quality gates"
            },
            {
                "id": f"{self.run_id}-Q5",
                "topic": "Solar energy AI estimation and load balancing",
                "priority": "medium", 
                "reason": "SIRINX Solar product development — need latest research"
            },
            {
                "id": f"{self.run_id}-Q6",
                "topic": "Real-time AI avatar and live chat integration",
                "priority": "medium",
                "reason": "Live Agent Studio development — multi-platform chat aggregation"
            },
            {
                "id": f"{self.run_id}-Q7",
                "topic": "Knowledge graph memory systems for AI agents",
                "priority": "medium",
                "reason": "Obsidian Brain integration — need optimal memory node patterns"
            }
        ]
        
        q_file = RUNTIME / "questions" / f"{self.run_id}.json"
        q_file.write_text(json.dumps(questions, indent=2))
        log(f"  Generated {len(questions)} research questions")
        return questions
    
    def dispatch(self, questions: list):
        """Phase 3 — dispatch research tasks to fleet"""
        log("Phase 3: Dispatching research tasks")
        
        # Prepare research packet
        packet = {
            "research_id": self.run_id,
            "type": "data_research_assignment",
            "questions": questions,
            "action": "research_and_report",
            "output": "save_to_obsidian_brain",
            "deadline": "next_council"
        }
        
        # Send to researcher agents
        for agent in ["opencode", "zcode", "codex"]:
            agent_dir = OUTBOX / agent
            agent_dir.mkdir(parents=True, exist_ok=True)
            packet_file = agent_dir / f"RESEARCH-{self.run_id}.json"
            packet_file.write_text(json.dumps(packet, indent=2))
            log(f"  -> {agent}: RESEARCH-{self.run_id}.json")
        
        # Create council agenda item — bring research to council
        council_agenda = OUTBOX / "hermes" / f"COUNCIL-AGENDA-RESEARCH-{self.run_id}.md"
        
        # Also save as council-ready research findings
        research_findings = RUNTIME / "questions" / f"{self.run_id}.json"
        research_findings.write_text(json.dumps(questions, indent=2))
        
        md = f"""# 🏛️ Council Agenda: Data Research Review

**Research ID:** {self.run_id}
**Generated:** {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
**Type:** Auto-Research → Council Discussion

## Research Topics for Today's Council

"""
        for q in questions:
            md += f"""### 🔬 {q['id']}: {q['topic']}
- **Priority:** {q['priority']}
- **Rationale:** {q['reason']}
- **Council Action:** Review → Assign → Track

"""
        md += """## Expected Council Outcomes
1. Select 1-2 high-priority topics for immediate deep research
2. Assign to appropriate agent (Codex, OpenCode, zcode)
3. Set deadline for findings
4. Schedule follow-up in next council

## Council Vote Required
- [ ] Approve research priorities as listed
- [ ] Reorder priorities
- [ ] Add new topics
"""
        council_agenda.write_text(md)
        log(f"  -> council agenda: {council_agenda.name}")
    
    def report_findings(self, findings: list):
        """Phase 4 — consolidate and save findings"""
        log("Phase 4: Consolidating findings")
        
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        # Save to Obsidian Brain
        brain_file = BRAIN / f"Research Findings {self.run_id}.md"
        md = f"""---
tags: [research, data-researcher, auto-generated]
created: {time.strftime('%Y-%m-%d')}
research_id: {self.run_id}
---

# 🔬 Research Findings: {self.run_id}

## Summary
Auto-research cycle findings from Data Researcher sub-agent.

## Findings
"""
        for f_item in findings:
            md += f"\n### {f_item.get('topic', 'Unknown')}\n"
            md += f"**Source:** {f_item.get('source', 'auto-generated')}\n"
            md += f"\n{f_item.get('summary', 'Pending research...')}\n"
        
        brain_file.write_text(md)
        log(f"  Saved to Obsidian: {brain_file.name}")
        
        # Save runtime copy
        findings_file = RUNTIME / "findings" / f"{self.run_id}.md"
        findings_file.write_text(md)
        log(f"  Runtime copy: {findings_file}")
    
    def run_full_cycle(self):
        """Execute full research cycle"""
        log(f"=== DATA RESEARCHER CYCLE: {self.run_id} ===")
        
        gaps = self.scan_gaps()
        questions = self.generate_questions(gaps)
        self.dispatch(questions)
        
        log(f"=== CYCLE COMPLETE: {len(questions)} topics dispatched ===")
        return {"run_id": self.run_id, "questions_count": len(questions)}

if __name__ == "__main__":
    researcher = DataResearcher()
    result = researcher.run_full_cycle()
    print(json.dumps(result))
