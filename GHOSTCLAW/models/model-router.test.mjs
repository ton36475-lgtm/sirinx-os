/**
 * GHOSTCLAW Model Auto Swap Router — Vitest Test Suite
 * Phase 6
 *
 * Run with:
 *   npx vitest run GHOSTCLAW/models/model-router.test.mjs
 */

import { describe, expect, it } from 'vitest';
import { ModelRouter } from './model-router.mjs';

describe('ModelRouter — default lane routing', () => {
  const router = new ModelRouter();

  it('routes code_patch to Kimi K2.7 Code', () => {
    const result = router.route('code_patch');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('kimi_k2_7_code');
    expect(result.lane.display_name).toBe('Kimi K2.7 Code');
    expect(result.lane.role).toBe('coding_tool_use_reference');
  });

  it('routes repo_mapping to GLM 5.2 Max', () => {
    const result = router.route('repo_mapping');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('glm_5_2_max');
    expect(result.lane.display_name).toBe('GLM 5.2 Max');
  });

  it('routes architecture to DeepSeek V4 Pro', () => {
    const result = router.route('architecture');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('deepseek_v4_pro');
    expect(result.lane.display_name).toBe('DeepSeek V4 Pro');
  });

  it('routes final_decision to GPT-5.5', () => {
    const result = router.route('final_decision');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('gpt_5_5');
    expect(result.lane.display_name).toBe('GPT-5.5');
  });

  it('routes critic_review to Claude Opus 4.8', () => {
    const result = router.route('critic_review');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('claude_opus_4_8');
    expect(result.lane.display_name).toBe('Claude Opus 4.8');
  });
});

describe('ModelRouter — unknown task type fallback', () => {
  const router = new ModelRouter();

  it('routes unknown task type to fallback lane (GLM 5.2 Max)', () => {
    const result = router.route('nonexistent_task_type');
    expect(result.blocked).toBe(false);
    expect(result.lane).toBeDefined();
    expect(result.lane.model).toBe('glm_5_2_max');
    expect(result.reason).toContain('Unknown task type');
  });

  it('provides a reason for the fallback', () => {
    const result = router.route('random_thing');
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });
});

describe('ModelRouter — D/X action classes are blocked', () => {
  const router = new ModelRouter();

  it('blocks dependency_install (tier D)', () => {
    const result = router.route('dependency_install');
    expect(result.blocked).toBe(true);
    expect(result.lane).toBeUndefined();
    expect(result.reason).toBeDefined;
  });

  it('blocks model_download (tier D)', () => {
    const result = router.route('model_download');
    expect(result.blocked).toBe(true);
  });

  it('blocks gpu_inference (tier D)', () => {
    const result = router.route('gpu_inference');
    expect(result.blocked).toBe(true);
  });

  it('blocks external_network_write (tier D)', () => {
    const result = router.route('external_network_write');
    expect(result.blocked).toBe(true);
  });

  it('blocks push (tier X)', () => {
    const result = router.route('push');
    expect(result.blocked).toBe(true);
  });

  it('blocks deploy (tier X)', () => {
    const result = router.route('deploy');
    expect(result.blocked).toBe(true);
  });

  it('blocks production_action (tier X)', () => {
    const result = router.route('production_action');
    expect(result.blocked).toBe(true);
  });

  it('blocks secret_access (tier X)', () => {
    const result = router.route('secret_access');
    expect(result.blocked).toBe(true);
  });

  it('blocks ambiguous_input (tier X)', () => {
    const result = router.route('ambiguous_input');
    expect(result.blocked).toBe(true);
  });

  it('blocks recursive_codex_launch (tier X)', () => {
    const result = router.route('recursive_codex_launch');
    expect(result.blocked).toBe(true);
  });

  it('blocks recursive_moa_launch (tier X)', () => {
    const result = router.route('recursive_moa_launch');
    expect(result.blocked).toBe(true);
  });

  it('blocked result includes task_type', () => {
    const result = router.route('kv_only_protocol');
    expect(result.blocked).toBe(true);
    expect(result.task_type).toBe('kv_only_protocol');
  });
});

describe('ModelRouter — custom lanes and helpers', () => {
  it('supports custom lane overrides', () => {
    const router = new ModelRouter({
      lanes: {
        custom_lane: {
          model: 'custom_model',
          display_name: 'Custom Model',
          role: 'custom_role',
          provider: 'custom_provider',
        },
      },
    });

    const result = router.route('custom_lane');
    expect(result.blocked).toBe(false);
    expect(result.lane.model).toBe('custom_model');

    // Default lanes still work
    const codeResult = router.route('code_patch');
    expect(codeResult.lane.model).toBe('kimi_k2_7_code');
  });

  it('supports additional blocked classes', () => {
    const router = new ModelRouter({
      blockedClasses: ['extra_blocked_action'],
    });

    const result = router.route('extra_blocked_action');
    expect(result.blocked).toBe(true);
  });

  it('listLanes returns all registered lanes', () => {
    const router = new ModelRouter();
    const lanes = router.listLanes();
    expect(lanes.code_patch).toBeDefined();
    expect(lanes.repo_mapping).toBeDefined();
    expect(lanes.architecture).toBeDefined();
    expect(lanes.final_decision).toBeDefined();
    expect(lanes.critic_review).toBeDefined();
  });

  it('getFallback returns the fallback lane', () => {
    const router = new ModelRouter();
    const fallback = router.getFallback();
    expect(fallback.model).toBe('glm_5_2_max');
  });
});