import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toasts.jsx';
import { api } from '../lib/api.js';
import { shortDate } from '../lib/dates.js';
import { tr } from '../lib/i18n.js';

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

/** Các nhãn đã dùng, kèm số việc: [{ name, count }] */
export const useTags = () => useQuery({ queryKey: ['tags'], queryFn: api.tasks.tags, staleTime: 60_000 });

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });

/** Cấu hình công khai từ máy chủ: Google, tải ảnh, email. Ít khi đổi nên giữ lâu. */
export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: Infinity, gcTime: Infinity, retry: 1, meta: { quiet: true } });

export const useMembers = (projectId, enabled = true) =>
  useQuery({ queryKey: ['members', projectId], queryFn: () => api.projects.members(projectId), enabled: !!projectId && enabled });

export const useComments = (taskId) => useQuery({ queryKey: ['comments', taskId], queryFn: () => api.tasks.comments(taskId), enabled: !!taskId });

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

/** Hoàn thành một việc lặp lại: báo cho người dùng biết lần tiếp theo đã được tạo. */
function useNextOccurrenceToast() {
  const notify = useToast();
  return (result) => {
    const next = result?.nextOccurrence;
    if (!next) return;
    notify({
      tone: 'success',
      message: next.deadline ? tr('Đã tạo lần lặp tiếp theo: {date}', { date: shortDate(new Date(next.deadline)) }) : tr('Đã tạo lần lặp tiếp theo'),
    });
  };
}

// ---------- Mutations ----------

export function useToggleTask() {
  const qc = useQueryClient();
  const announce = useNextOccurrenceToast();
  return useMutation({
    mutationFn: (task) => api.tasks.toggle(task._id).then((res) => (announce(res), res)),
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
  const announce = useNextOccurrenceToast();
  return useMutation({
    mutationFn: ({ id, data }) => api.tasks.update(id, data).then((res) => (announce(res), res)),
    onMutate: async ({ id, data }) => {
      const saved = await snapshot(qc);
      const optimistic = { ...data };
      if (data.status && data.status !== 'done') optimistic.completedAt = null;
      if (data.status === 'done') optimistic.completedAt = new Date().toISOString();
      delete optimistic.project; // chờ server trả về object dự án đầy đủ
      patchTaskCaches(qc, id, optimistic);
      return { saved };
    },
    onSuccess: ({ nextOccurrence, ...task }) => qc.setQueryData(['task', task._id], task),
    onError: (_e, _v, ctx) => restore(qc, ctx?.saved),
    onSettled: () => refreshAll(qc),
  });
}

/** Kéo thả: `apply` là hàm nhận danh sách task cũ của dự án, trả về danh sách mới. */
export function useMoveTask() {
  const qc = useQueryClient();
  const announce = useNextOccurrenceToast();
  return useMutation({
    mutationFn: ({ id, status, index }) => api.tasks.move(id, status, index).then((res) => (announce(res), res)),
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

// ---------- Thành viên dự án ----------

export function useMemberActions(projectId) {
  const qc = useQueryClient();
  const settle = () => {
    qc.invalidateQueries({ queryKey: ['members', projectId] });
    qc.invalidateQueries({ queryKey: ['projects'] });
    qc.invalidateQueries({ queryKey: ['project', projectId] });
  };
  return {
    invite: useMutation({ mutationFn: (email) => api.projects.invite(projectId, email), onSuccess: settle }),
    remove: useMutation({ mutationFn: (userId) => api.projects.removeMember(projectId, userId), onSuccess: settle }),
    cancel: useMutation({ mutationFn: (email) => api.projects.cancelInvite(projectId, email), onSuccess: settle }),
  };
}

// ---------- Bình luận, ảnh, Pomodoro ----------

/** Cập nhật task trong mọi cache (danh sách, chi tiết) bằng dữ liệu server vừa trả về. */
function putTask(qc, task) {
  qc.setQueryData(['task', task._id], task);
  qc.setQueriesData({ queryKey: ['tasks'] }, (list) => (Array.isArray(list) ? list.map((t) => (t._id === task._id ? { ...t, ...task } : t)) : list));
}

const bumpComments = (qc, taskId, delta) => {
  const apply = (t) => (t._id === taskId ? { ...t, commentCount: Math.max(0, (t.commentCount || 0) + delta) } : t);
  qc.setQueryData(['task', taskId], (t) => (t ? apply(t) : t));
  qc.setQueriesData({ queryKey: ['tasks'] }, (list) => (Array.isArray(list) ? list.map(apply) : list));
};

export function useCommentActions(taskId) {
  const qc = useQueryClient();
  const key = ['comments', taskId];
  return {
    add: useMutation({
      mutationFn: (text) => api.tasks.addComment(taskId, text),
      onSuccess: (comment) => {
        qc.setQueryData(key, (list = []) => [...list, comment]);
        bumpComments(qc, taskId, 1);
        qc.invalidateQueries({ queryKey: ['activity'] });
      },
    }),
    remove: useMutation({
      mutationFn: (commentId) => api.tasks.deleteComment(taskId, commentId),
      onMutate: async (commentId) => {
        await qc.cancelQueries({ queryKey: key });
        const saved = qc.getQueryData(key);
        qc.setQueryData(key, (list = []) => list.filter((c) => c._id !== commentId));
        bumpComments(qc, taskId, -1);
        return { saved };
      },
      onError: (_e, _id, ctx) => {
        qc.setQueryData(key, ctx?.saved);
        bumpComments(qc, taskId, 1);
      },
    }),
  };
}

export function useAttachmentActions(taskId) {
  const qc = useQueryClient();
  return {
    add: useMutation({ mutationFn: (data) => api.tasks.addAttachment(taskId, data), onSuccess: (task) => putTask(qc, task) }),
    remove: useMutation({ mutationFn: (attachmentId) => api.tasks.removeAttachment(taskId, attachmentId), onSuccess: (task) => putTask(qc, task) }),
  };
}

export function useLogPomodoro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, minutes }) => api.tasks.pomodoro(taskId, minutes),
    onSuccess: (task) => {
      putTask(qc, task);
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
