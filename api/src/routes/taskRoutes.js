import { Router } from 'express';
import { getDashboard, listActivity } from '../controllers/dashboardController.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/projectController.js';
import {
  clearDone,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  moveTask,
  toggleTask,
  updateTask,
} from '../controllers/taskController.js';

export const taskRouter = Router();
taskRouter.route('/').get(listTasks).post(createTask).delete(clearDone);
taskRouter.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
taskRouter.patch('/:id/toggle', toggleTask);
taskRouter.post('/:id/move', moveTask);

export const projectRouter = Router();
projectRouter.route('/').get(listProjects).post(createProject);
projectRouter.route('/:id').get(getProject).patch(updateProject).delete(deleteProject);

export const insightRouter = Router();
insightRouter.get('/dashboard', getDashboard);
insightRouter.get('/activity', listActivity);
