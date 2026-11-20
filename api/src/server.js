import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('[db] Không kết nối được MongoDB:', err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] TaskFlow API chạy tại http://localhost:${env.port}`);
    console.log(`[api] CORS cho phép: ${env.corsOrigins.join(', ')}`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] Nhận ${signal}, đang tắt...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
