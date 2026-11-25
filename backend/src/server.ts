
import app from './index';
import { connectDatabase, prisma } from './config/db';

const PORT = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid port number.');
}

async function startServer() {
  try {
    await connectDatabase();

    console.log('Connected to Neon PostgreSQL');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);

    await prisma.$disconnect();

    process.exit(1);
  }
}

startServer();
