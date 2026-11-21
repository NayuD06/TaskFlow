import { Router } from 'express';
import { getDashboard, listActivity } from '../controllers/dashboardController.js';
import { exportData } from '../controllers/portableController.js';
import {
  addMember,
  cancelInvite,
  createProject,
  deleteProject,
  getProject,
  listMembers,
  listProjects,
  removeMember,
  updateProject,
} from '../controllers/projectController.js';
import {
  addAttachment,
  addComment,
  clearDone,
  createTask,
  deleteComment,
  deleteTask,
  getTask,
  listComments,
  listTags,
  listTasks,
  logPomodoro,
  moveTask,
  removeAttachment,
  toggleTask,
  updateTask,
} from '../controllers/taskController.js';

export const taskRouter = Router();
taskRouter.route('/').get(listTasks).post(createTask).delete(clearDone);
taskRouter.get('/tags', listTags);
taskRouter.route('/:id').get(getTask).patch(updateTask).delete(deleteTask);
taskRouter.patch('/:id/toggle', toggleTask);
taskRouter.post('/:id/move', moveTask);
taskRouter.route('/:id/comments').get(listComments).post(addComment);
taskRouter.delete('/:id/comments/:commentId', deleteComment);
taskRouter.post('/:id/attachments', addAttachment);
taskRouter.delete('/:id/attachments/:attachmentId', removeAttachment);
taskRouter.post('/:id/pomodoros', logPomodoro);

export const projectRouter = Router();
projectRouter.route('/').get(listProjects).post(createProject);
projectRouter.route('/:id').get(getProject).patch(updateProject).delete(deleteProject);
projectRouter.route('/:id/members').get(listMembers).post(addMember);
projectRouter.delete('/:id/members/:userId', removeMember);
projectRouter.delete('/:id/invites', cancelInvite);

export const insightRouter = Router();
insightRouter.get('/dashboard', getDashboard);
insightRouter.get('/activity', listActivity);
insightRouter.get('/export', exportData);
