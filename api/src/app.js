import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundRoute } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/authRoutes.js';
import { insightRouter, projectRouter, taskRouter } from './routes/taskRoutes.js';

// Cho phép wildcard trong CORS_ORIGIN, vd: https://taskflow-*.vercel.app
const originMatchers = env.corsOrigins.map((origin) => {
  if (!origin.includes('*')) return (value) => value === origin;
  const pattern = origin.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`^${pattern.join('[^.]*')}$`);
  return (value) => regex.test(value);
});

const corsOptions = {
  origin(origin, callback) {
    // Request không có Origin (curl, Postman, health check) luôn được phép
    if (!origin || originMatchers.some((match) => match(origin))) return callback(null, true);
    callback(null, false);
  },
};

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.get('/', (req, res) => {
    res.json({ name: 'TaskFlow API', docs: '/api/health' });
  });

  app.get('/api/health', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      status: dbReady ? 'ok' : 'degraded',
      db: dbReady ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);

  // Mọi route dữ liệu đều cần đăng nhập, và chỉ trả về dữ liệu của chính người đó
  app.use('/api/tasks', requireAuth, taskRouter);
  app.use('/api/projects', requireAuth, projectRouter);
  app.use('/api', requireAuth, insightRouter);

  app.use(notFoundRoute);
  app.use(errorHandler);

  return app;
}
