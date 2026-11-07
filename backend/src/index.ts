
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { connectDatabase, prisma } from './config/db';

import apiRouter from './routes';

import { errorMiddleware } from './middleware/error.middleware';

const app = express();

const PORT = Number(process.env.PORT) || 3001;

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

// Парсинг JSON
app.use(express.json({ limit: '1mb' }));

// Читання Cookie
app.use(cookieParser());

// Перевірка працездатності сервера та БД
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

// Усі API-маршрути
app.use('/api', apiRouter);

// Обробка неіснуючих маршрутів
app.use((_req, res) => {
  res.status(404).json({
    message: 'Маршрут не знайдено',
  });
});

// Глобальна обробка помилок
app.use(errorMiddleware);

// Запуск сервера
async function startServer() {
  try {
    await connectDatabase();

    console.log('Connected to Neon PostgreSQL');

    app.listen(PORT, () => {
      console.log(
        `Backend running at http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);

    await prisma.$disconnect();

    process.exit(1);
  }
}

startServer();
