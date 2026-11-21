import { Router } from 'express';
import {
  changePassword,
  deleteMe,
  forgotPassword,
  googleSignIn,
  login,
  logoutAll,
  me,
  register,
  resetPassword,
  updateMe,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, mailLimiter, sensitiveLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/google', authLimiter, googleSignIn);
authRouter.post('/forgot-password', mailLimiter, forgotPassword);
authRouter.post('/reset-password', authLimiter, resetPassword);

authRouter.get('/me', requireAuth, me);
authRouter.patch('/me', requireAuth, updateMe);
authRouter.delete('/me', sensitiveLimiter, requireAuth, deleteMe);
authRouter.post('/change-password', sensitiveLimiter, requireAuth, changePassword);
authRouter.post('/logout-all', requireAuth, logoutAll);
