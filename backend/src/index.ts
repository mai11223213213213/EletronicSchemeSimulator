
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { prisma } from './config/db';
import apiRouter from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const FRONTEND_URL =
  process.env.FRONTEND_URL ?? 'http://localhost:5173';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET is missing or shorter than 32 characters.',
  );
}

const app = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

app.use('/api', apiRouter);

app.use((_req, res) => {
  return res.status(404).json({
    message: 'Route not found',
  });
});

app.use(errorMiddleware);

export default app;
