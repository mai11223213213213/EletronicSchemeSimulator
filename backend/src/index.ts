import express from 'express'
import { connectDatabase, prisma } from './config/db'

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected' })
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' })
  }
})

async function startServer() {
  try {
    await connectDatabase()
    console.log('Connected to PostgreSQL')
  } catch (error) {
    console.warn('PostgreSQL is unavailable; database-backed routes will not work until it is started.')
    console.warn(error)
  }

  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
  })
}

startServer().catch(async (error: unknown) => {
  console.error('Failed to start API server:', error)
  await prisma.$disconnect()
  process.exitCode = 1
})