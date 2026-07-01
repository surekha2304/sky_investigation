import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import agentRouter from './routes/agent'
import mcpRouter from './routes/mcp'
import siteRouter from './routes/site'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/agent', agentRouter)
app.use('/api/mcp', mcpRouter)
app.use('/api/site', siteRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`6:10 Assistant server running on http://localhost:${PORT}`)
})
