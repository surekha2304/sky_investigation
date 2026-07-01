import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import agentRouter from './routes/agent'
import mcpRouter from './routes/mcp'
import siteRouter from './routes/site'

const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/agent', agentRouter)
app.use('/api/mcp', mcpRouter)
app.use('/api/site', siteRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`6:10 Assistant server running on http://localhost:${PORT}`)
})
