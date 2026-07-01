import { Router, Request, Response } from 'express'
import { callTool, TOOL_DEFINITIONS, GROQ_TOOLS } from '../lib/mcp/server'

const router = Router()

// List all available tools
router.get('/tools', (_req: Request, res: Response) => {
  res.json({ tools: TOOL_DEFINITIONS, groq_format: GROQ_TOOLS })
})

// Execute a specific tool
router.post('/:toolName', (req: Request, res: Response) => {
  const toolName = Array.isArray(req.params.toolName) ? req.params.toolName[0] : req.params.toolName
  const input = req.body || {}
  const result = callTool(toolName, input)
  if (result.success) {
    res.json({ tool: toolName, result: result.data })
  } else {
    res.status(400).json({ tool: toolName, error: result.error })
  }
})

export default router
