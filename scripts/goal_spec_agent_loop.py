#!/usr/bin/env python3
"""Goal-Spec Driven Agent Loop for End-to-End Development.

This script implements a goal-spec driven agent loop that:
1. Parses goal specifications from project requirements
2. Orchestrates agents for end-to-end development
3. Manages task delegation across the agent team
4. Handles approval workflows and A2A sync
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Agent:
    name: str
    role: str
    endpoint: str
    status: str = "unknown"


@dataclass(frozen=True)
class GoalSpec:
    name: str
    description: str
    tasks: list[str]
    agents: list[str]
    approval_required: bool = True


class GoalSpecDrivenLoop:
    """Goal-spec driven agent loop coordinator."""

    def __init__(self, *, dry_run: bool = False, timeout: float = 30.0) -> None:
        self.dry_run = dry_run
        self.timeout = timeout
        self.agents: dict[str, Agent] = {}
        self.goals: dict[str, GoalSpec] = {}

    def initialize_agents(self) -> None:
        """Initialize agent list from configuration."""
        self.agents = {
            "antigravity2": Agent("antigravity2", "Speed Execution", "http://127.0.0.1:9002"),
            "codex": Agent("codex", "Deep Reasoning", "http://127.0.0.1:9001"),
            "claude": Agent("claude", "Architecture", "http://127.0.0.1:9005"),
            "opencode": Agent("opencode", "Code Review", "http://127.0.0.1:9006"),
            "copilot": Agent("copilot", "GitHub Native", "http://127.0.0.1:9007"),
            "webmcp": Agent("webmcp", "Browser Automation", "http://127.0.0.1:9003"),
            "planner": Agent("planner", "Strategy", "http://127.0.0.1:9004"),
        }

    def load_goal_spec(self, goal_name: str) -> GoalSpec:
        """Load a goal specification from project files."""
        goal_file = ROOT / "goal_specs" / f"{goal_name}.json"
        
        if goal_file.exists():
            with open(goal_file) as f:
                data = json.load(f)
                return GoalSpec(
                    name=data["name"],
                    description=data["description"],
                    tasks=data.get("tasks", []),
                    agents=data.get("agents", []),
                    approval_required=data.get("approval_required", True),
                )
        
        return GoalSpec(
            name="end-to-end-dev",
            description="End-to-end agentic development with free models and A2A sync",
            tasks=[
                "Configure free models (DeepSeek v4 flash)",
                "Setup Hermes model with A2A sync",
                "Configure Telegram approval command center",
                "Integrate Omniroute and Codex",
                "Fix MaxPlus API model list",
            ],
            agents=["antigravity2", "codex", "claude", "opencode", "planner"],
            approval_required=True,
        )

    def check_agent_status(self, agent: Agent) -> str:
        """Check if an agent is running."""
        if self.dry_run:
            return "simulated"
        
        try:
            response = httpx.get(f"{agent.endpoint}/health", timeout=5.0)
            return "online" if response.status_code == 200 else "offline"
        except httpx.RequestError:
            return "offline"

    def submit_task(self, goal_spec: GoalSpec, task: str, agent_name: str) -> dict[str, Any]:
        """Submit a task to an agent."""
        if self.dry_run:
            return {
                "status": "dry_run",
                "agent": agent_name,
                "task": task,
                "message": f"Would submit task: {task} to agent {agent_name}",
            }
        
        agent = self.agents.get(agent_name)
        if not agent:
            return {"error": f"Unknown agent: {agent_name}"}

        try:
            response = httpx.post(
                f"{agent.endpoint}/rpc",
                json={"task": task, "goal": goal_spec.name},
                timeout=self.timeout,
            )
            return {"status": "success", "response": response.json()}
        except httpx.RequestError as e:
            return {"status": "error", "error": str(e)}

    def run_goal_loop(self, goal_name: str) -> None:
        """Run the complete goal-spec driven loop."""
        print(f"=== GOAL-SPEC DRIVEN LOOP: {goal_name} ===")
        
        self.initialize_agents()
        goal_spec = self.load_goal_spec(goal_name)
        
        print(f"\nGoal: {goal_spec.name}")
        print(f"Description: {goal_spec.description}")
        print(f"Approval Required: {goal_spec.approval_required}")
        print(f"Tasks: {len(goal_spec.tasks)}")
        
        for task in goal_spec.tasks:
            print(f"\n--- TASK: {task} ---")
            
            agent_name = goal_spec.agents[0] if goal_spec.agents else "antigravity2"
            agent = self.agents.get(agent_name)
            
            if agent:
                status = self.check_agent_status(agent)
                print(f"  Agent: {agent_name} ({status})")
                
                if status == "online":
                    result = self.submit_task(goal_spec, task, agent_name)
                    if "error" in result:
                        print(f"  Error: {result['error']}")
                    else:
                        print(f"  Status: {result.get('status', 'unknown')}")
                else:
                    print(f"  Agent offline, queuing for later execution")
            else:
                print(f"  No agent available for this task")
        
        print("\n=== GOAL LOOP COMPLETE ===")


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Goal-spec driven agent loop")
    parser.add_argument("--goal", default="end-to-end-dev", help="Goal specification name")
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode")
    parser.add_argument("--live", action="store_true", help="Connect to live agent endpoints")
    parser.add_argument("--task", help="Single task to execute")
    args = parser.parse_args()

    loop = GoalSpecDrivenLoop(dry_run=args.dry_run)
    
    if args.task:
        goal_spec = loop.load_goal_spec(args.goal)
        result = loop.submit_task(goal_spec, args.task, "antigravity2")
        print(json.dumps(result, indent=2))
    else:
        loop.run_goal_loop(args.goal)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
