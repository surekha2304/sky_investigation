import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'
import { runInvestigation } from '../lib/agent/investigator'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY not configured' })
    return
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    // @ts-ignore — flush is available in some environments
    if (typeof res.flush === 'function') res.flush()
  }

  const groq = new Groq({ apiKey })

  try {
    await runInvestigation(groq, (event) => {
      send(event)
    })
  } catch (err) {
    send({ type: 'error', message: String(err) })
    send({ type: 'done' })
  }

  res.end()
})

export default router
