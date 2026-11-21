import { Router } from 'express';
import {
  deleteCloudImages,
  deleteUser,
  getStats,
  listCloudImages,
  listUsers,
  recentActivity,
  updateUser,
} from '../controllers/adminController.js';

// Gắn sau requireAuth + requireAdmin trong app.js
export const adminRouter = Router();

adminRouter.get('/stats', getStats);
adminRouter.get('/activity', recentActivity);
adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:id', updateUser);
adminRouter.delete('/users/:id', deleteUser);
adminRouter.get('/images', listCloudImages);
adminRouter.delete('/images', deleteCloudImages);
