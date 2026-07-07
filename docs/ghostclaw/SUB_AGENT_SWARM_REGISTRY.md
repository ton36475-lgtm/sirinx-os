# Sub-Agent Swarm Registry

**Version:** 1.0.0
**Date:** 2026-06-30

---

## Registered Sub-Agents (15 total)

1. Codex_Builder — primary_build_lane
2. ZCode_GLM_Worker — long_context_worker
3. ZAI_TUI_CLI_Worker — optional_terminal_worker
4. Schema_Engineer — schema_builder
5. Queue_Master — runtime_bus_agent
6. Automation_Engineer — local_automation_builder
7. Docs_Architect — documentation_agent
8. Test_Runner — validation_worker
9. Browser_Smoke_Worker — local_ui_smoke_agent
10. Tauri_App_Architect — desktop_mobile_app_strategy
11. Krea2_Image_Knowledge_Worker — ai_image_knowledge
12. Skill_Discovery_Worker — agent_skill_registry
13. Cost_Guardian — cost_policy
14. Security_Boundary_Auditor — security
15. Release_Gate_Worker — release_safety

## Model Router

| Lane | Model |
|---|---|
| code_patch | Kimi K2.7 Code |
| repo_mapping | GLM 5.2 Max |
| architecture | DeepSeek V4 Pro |
| final_decision | GPT-5.5 |
| critic_review | Claude Opus 4.8 |
| long_context | ZCode / GLM |
| fallback | local_static_analysis |
