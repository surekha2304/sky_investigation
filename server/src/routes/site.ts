import { Router, Request, Response } from 'express'
import { OVERNIGHT_EVENTS } from '../lib/data/events'
import { SITE_ZONES, DRONE_PATROL_ALPHA } from '../lib/data/site'

const router = Router()

router.get('/events', (_req: Request, res: Response) => {
  res.json({ events: OVERNIGHT_EVENTS })
})

router.get('/zones', (_req: Request, res: Response) => {
  res.json({ zones: SITE_ZONES })
})

router.get('/drone-patrol', (_req: Request, res: Response) => {
  res.json({ patrol: DRONE_PATROL_ALPHA })
})

export default router
