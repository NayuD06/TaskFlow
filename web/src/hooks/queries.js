import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

// ---------- Queries ----------

export const useProjects = (archived = 'false') => useQuery({ queryKey: ['projects', archived], queryFn: () => api.projects.list(archived) });

export const useProject = (id) => useQuery({ queryKey: ['project', id], queryFn: () => api.projects.get(id), enabled: !!id });

export const useTasks = (params = {}, options = {}) =>
  useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.tasks.list(params),
    placeholderData: keepPreviousData,
    ...options,
  });

export const useTask = (id) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
    // Lấy tạm từ danh sách đã tải để sheet mở ra ngay
    initialData: () => {
      for (const [, list] of qc.getQueriesData({ queryKey: ['tasks'] })) {
        const found = Array.isArray(list) && list.find((t) => t._id === id);
        if (found) return found;
      }
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });
};

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });

export const useActivity = (type = 'all') =>
  useQuery({ queryKey: ['activity', type], queryFn: () => api.activity(type, 30), placeholderData: keepPreviousData });

// ---------- Cập nhật lạc quan ----------

function patchTaskCaches(qc, id, patch) {
  const apply = (t) => (t._id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t);
  qc.setQueriesData({ queryKey: ['tasks'] }, (list) => (Array.isArray(list) ? list.map(apply) : list));
  qc.setQueryData(['task', id], (t) => (t ? apply(t) : t));
  qc.setQueryData(['dashboard'], (d) => {
    if (!d) return d;
    const focus = Object.fromEntries(Object.entries(d.focus).map(([k, v]) => [k, v.map(apply)]));
    return { ...d, focus };
  });
}

function removeTaskFromCaches(qc, id) {
  qc.setQueriesData({ queryKey: ['tasks'] }, (list) => (Array.isArray(list) ? list.filter((t) => t._id !== id) : list));
}

async function snapshot(qc) {
  await qc.cancelQueries({ queryKey: ['tasks'] });
  await qc.cancelQueries({ queryKey: ['dashboard'] });
  return [...qc.getQueriesData({ queryKey: ['tasks'] }), ...qc.getQueriesData({ queryKey: ['task'] }), ...qc.getQueriesData({ queryKey: ['dashboard'] })];
}

function restore(qc, saved) {
  for (const [key, data] of saved || []) qc.setQueryData(key, data);
}

const refreshAll = (qc) => qc.invalidateQueries();

// ---------- Mutations ----------

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task) => api.tasks.toggle(task._id),
    onMutate: async (task) => {
      const saved = await snapshot(qc);
      const done = task.status !== 'done';
      patchTaskCaches(qc, task._id, {
        status: done ? 'done' : 'todo',
        completedAt: done ? new Date().toISOString() : null,
        // Lên đầu cột Đã xong, hoặc về cuối cột Cần làm
        order: done ? -Date.now() : Date.now(),
      });
      return { saved };
    },
    onError: (_e, _t, ctx) => restore(qc, ctx?.saved),
    onSettled: () => refreshAll(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      const saved = await snapshot(qc);
      const optimistic = { ...data };
      if (data.status && data.status !== 'done') optimistic.completedAt = null;
      if (data.status === 'done') optimistic.completedAt = new Date().toISOString();
      delete optimistic.project; // chờ server trả về object dự án đầy đủ
      patchTaskCaches(qc, id, optimistic);
      return { saved };
    },
    onSuccess: (task) => qc.setQueryData(['task', task._id], task),
    onError: (_e, _v, ctx) => restore(qc, ctx?.saved),
    onSettled: () => refreshAll(qc),
  });
}

/** Kéo thả: `apply` là hàm nhận danh sách task cũ của dự án, trả về danh sách mới. */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, index }) => api.tasks.move(id, status, index),
    onMutate: async ({ queryKey, apply }) => {
      const saved = await snapshot(qc);
      if (queryKey && apply) qc.setQueryData(queryKey, (list) => (Array.isArray(list) ? apply(list) : list));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.saved),
    onSettled: () => refreshAll(qc),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.tasks.create(data),
    onSettled: () => refreshAll(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task) => api.tasks.remove(task._id),
    onMutate: async (task) => {
      const saved = await snapshot(qc);
      removeTaskFromCaches(qc, task._id);
      return { saved };
    },
    onError: (_e, _t, ctx) => restore(qc, ctx?.saved),
    onSettled: () => refreshAll(qc),
  });
}

export function useClearDone() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (project) => api.tasks.clearDone(project), onSettled: () => refreshAll(qc) });
}

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => (id ? api.projects.update(id, data) : api.projects.create(data)),
    onSettled: () => refreshAll(qc),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.projects.remove(id), onSettled: () => refreshAll(qc) });
}
