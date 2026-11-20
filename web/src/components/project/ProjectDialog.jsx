import { Check, LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSaveProject } from '../../hooks/queries.js';
import { HUES, HUE_NAMES } from '../../lib/constants.js';
import { Dialog } from '../ui/Overlay.jsx';
import { ProjectTile } from '../ui/Pills.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { useUI } from '../shell/UIContext.jsx';

export default function ProjectDialog() {
  const { projectDialog, closeProjectDialog } = useUI();
  const editing = projectDialog?.project;
  const save = useSaveProject();
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', color: 'blue' });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectDialog) return;
    setError(null);
    setForm({
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      color: editing?.color ?? Object.keys(HUES)[Math.floor(Math.random() * 10)],
    });
  }, [projectDialog, editing]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Hãy đặt tên cho dự án');
      return;
    }
    try {
      const project = await save.mutateAsync({ id: editing?._id, data: { ...form, name: form.name.trim() } });
      notify({ tone: 'success', message: editing ? 'Đã lưu dự án' : `Đã tạo dự án “${project.name}”` });
      closeProjectDialog();
      if (!editing) navigate(`/projects/${project._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={!!projectDialog} onClose={closeProjectDialog} labelId="project-dialog-title">
      <form onSubmit={submit} noValidate>
        <div className="flex items-center gap-3">
          <motion.div key={form.color + form.name.charAt(0)} initial={{ scale: 0.85, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}>
            <ProjectTile project={{ name: form.name || 'D', color: form.color }} size={44} />
          </motion.div>
          <div>
            <h2 id="project-dialog-title" className="font-display text-base font-bold">
              {editing ? 'Sửa dự án' : 'Dự án mới'}
            </h2>
            <p className="text-[13px] text-muted">Mỗi dự án có một màu riêng để dễ nhận ra.</p>
          </div>
        </div>

        <label htmlFor="p-name" className="mt-5 block text-[13px] font-semibold">
          Tên dự án
        </label>
        <input
          id="p-name"
          autoFocus
          value={form.name}
          maxLength={60}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ví dụ: Đồ án tốt nghiệp"
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none placeholder:text-faint focus:border-accent"
        />

        <label htmlFor="p-desc" className="mt-4 block text-[13px] font-semibold">
          Mô tả <span className="font-normal text-muted">(không bắt buộc)</span>
        </label>
        <textarea
          id="p-desc"
          rows={2}
          value={form.description}
          maxLength={300}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 outline-none focus:border-accent"
        />

        <fieldset className="mt-4">
          <legend className="text-[13px] font-semibold">Màu</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(HUES).map(([name, hex]) => {
              const active = form.color === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: name }))}
                  aria-pressed={active}
                  aria-label={HUE_NAMES[name]}
                  title={HUE_NAMES[name]}
                  className="grid size-8 place-items-center rounded-full transition-transform hover:scale-110"
                  style={{ background: hex, boxShadow: active ? `0 0 0 3px var(--surface), 0 0 0 5px ${hex}` : 'none' }}
                >
                  {active && <Check className="size-4 text-black/70" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="tone-danger mt-4 rounded-xl px-3 py-2 text-[13px] font-medium">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={closeProjectDialog} className="h-10 rounded-xl px-4 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
            Huỷ
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle className="size-4 animate-spin" />}
            {editing ? 'Lưu thay đổi' : 'Tạo dự án'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
