// Skills Router - connects skills-kit to sirinx-os
// Implements /api/skills endpoints

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import express from 'express';

const router = express.Router();
const skillsKitPath = '../../../packages/skills-kit/skills';

// GET /api/skills/list
router.get('/list', (req, res) => {
  try {
    const categories = readdirSync(skillsKitPath);
    const skills = [];

    for (const category of categories) {
      if (category === '.DS_Store') continue;
      const skillsPath = join(skillsKitPath, category);
      const skillDirs = readdirSync(skillsPath).filter(f => f !== '.DS_Store');

      for (const skillDir of skillDirs) {
        const skillMd = readFileSync(join(skillsPath, skillDir, 'SKILL.md'), 'utf8');
        skills.push({
          name: skillDir,
          category,
          license: skillMd.includes('license: MIT') ? 'MIT' : 'Unknown'
        });
      }
    }

    res.json({ skills, total: skills.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/skills/:name
router.get('/:name', (req, res) => {
  const { name } = req.params;
  const skillPath = join(skillsKitPath, req.query.category || '', name, 'SKILL.md');

  try {
    const skillContent = readFileSync(skillPath, 'utf8');
    res.json({ skill: skillContent });
  } catch {
    res.status(404).json({ error: 'Skill not found' });
  }
});

// POST /api/skills/orchestrate
router.post('/orchestrate', (req, res) => {
  const { goal, phases } = req.body;

  // Return orchestration plan (dry-run mode)
  res.json({
    goal,
    phases_required: phases || ['planning', 'implementation', 'verification'],
    dry_run: true,
    next_action: 'Review plan, then approve execution'
  });
});

// POST /api/skills/knowledge/scrape
router.post('/knowledge/scrape', (req, res) => {
  const { url, category } = req.body;

  // Dry-run response
  res.json({
    url,
    category: category || 'general',
    dry_run: true,
    status: 'planned',
    evidence_path: '/data/knowledge-base.sqlite',
    next_action: 'Add API key, then run actual scrape'
  });
});

// POST /api/skills/content/create
router.post('/content/create', (req, res) => {
  const { type, prompt } = req.body;

  res.json({
    type,
    prompt,
    dry_run: true,
    status: 'planned',
    output_path: '/data/generated-assets/',
    next_action: 'Configure creative tools, then approve render'
  });
});

// POST /api/skills/social/post
router.post('/social/post', (req, res) => {
  const { platforms, content } = req.body;

  res.json({
    platforms,
    content,
    dry_run: true,
    status: 'scheduled_not_sent',
    approval_required: true,
    next_action: 'Review content, then approve posting'
  });
});

export default router;