// A2A MCP Sync Control API Route
// POST /api/a2a-sync/connect { agent: "claude"|"opencode"|"codex", action: "status"|"connect"|"disconnect" }

import { Router } from 'express'
import { exec } from 'child_process'

const router = Router()

router.get('/status', async (req, res) => {
  const workspaces = ['claude', 'opencode', 'codex']
  const results: Record<string, any> = {}
  
  for (const agent of workspaces) {
    try {
      const mcpJson = require(`~/.hermes/profiles/solis/workspaces/${agent}/.mcp.json`)
      results[agent] = {
        status: 'configured',
        servers: Object.keys(mcpJson.mcpServers || {}),
        workspace: `~/.hermes/profiles/solis/workspaces/${agent}`
      }
    } catch (e) {
      results[agent] = { status: 'not_configured' }
    }
  }
  
  res.json({ success: true, workspaces: results })
})

router.post('/connect/:agent', async (req, res) => {
  const { agent } = req.params
  
  // In safe mode - just acknowledge, don't actually spawn
  res.json({
    success: true,
    agent,
    action: 'connect',
    message: `MCP sync requested for ${agent} (dry-run mode)`
  })
})

export default router
