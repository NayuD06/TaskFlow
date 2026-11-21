import * as Sentry from '@sentry/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isProd, isTest } from './config/env.js';
import { publicConfig, signUpload } from './controllers/metaController.js';
import { importData } from './controllers/portableController.js';
import { buildOpenApi } from './docs/openapi.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundRoute } from './middleware/errorHandler.js';
import { apiLimiter, uploadLimiter } from './middleware/rateLimit.js';
import { adminRouter } from './routes/adminRoutes.js';
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
  exposedHeaders: ['Content-Disposition'],
};

// Log mỗi request một dòng. Chỉ ghi đường dẫn (bỏ query) và id người dùng, không ghi email hay token.
morgan.token('path', (req) => req.originalUrl.split('?')[0]);
morgan.token('uid', (req) => (req.user ? String(req.user._id) : '-'));
const LOG_FORMAT = isProd
  ? ':remote-addr :method :path :status :res[content-length] :response-time ms uid=:uid'
  : ':method :path :status :response-time ms';
const skipLog = (req) => isTest || req.path === '/api/health';

const openapi = buildOpenApi();

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(morgan(LOG_FORMAT, { skip: skipLog }));

  app.get('/', (req, res) => {
    res.json({ name: 'TaskFlow API', docs: '/api/docs', health: '/api/health' });
  });

  app.get('/api/health', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      status: dbReady ? 'ok' : 'degraded',
      db: dbReady ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });

  // Tài liệu API (Swagger UI)
  app.get('/api/docs.json', (req, res) => res.json(openapi));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'TaskFlow API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, tryItOutEnabled: true },
    })
  );

  app.use('/api', apiLimiter);

  // Nhập dữ liệu cần body lớn hơn (tối đa 5 MB) nên khai báo trước bộ đọc JSON chung
  app.post('/api/import', express.json({ limit: '5mb' }), requireAuth, importData);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/config', publicConfig);
  app.post('/api/uploads/sign', requireAuth, uploadLimiter, signUpload);
  app.use('/api/auth', authRouter);

  // Mọi route dữ liệu đều cần đăng nhập, và chỉ trả về dữ liệu người đó được xem
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
  app.use('/api/tasks', requireAuth, taskRouter);
  app.use('/api/projects', requireAuth, projectRouter);
  app.use('/api', requireAuth, insightRouter);

  app.use(notFoundRoute);
  // Gửi lỗi 5xx lên Sentry (chỉ khi đã đặt SENTRY_DSN)
  if (env.sentryDsn && !isTest) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
