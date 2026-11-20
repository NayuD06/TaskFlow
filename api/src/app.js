import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import { errorHandler, notFoundRoute } from './middleware/errorHandler.js';
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

  app.use('/api/tasks', taskRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api', insightRouter);

  app.use(notFoundRoute);
  app.use(errorHandler);

  return app;
}
