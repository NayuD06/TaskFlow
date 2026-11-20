import { Router } from 'express';
import { changePassword, deleteMe, login, logoutAll, me, register, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);

authRouter.get('/me', requireAuth, me);
authRouter.patch('/me', requireAuth, updateMe);
authRouter.delete('/me', sensitiveLimiter, requireAuth, deleteMe);
authRouter.post('/change-password', sensitiveLimiter, requireAuth, changePassword);
authRouter.post('/logout-all', requireAuth, logoutAll);
