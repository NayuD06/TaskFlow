import { CalendarClock, ListChecks } from 'lucide-react';
import { PRIORITY, STATUS, hueStyle } from '../../lib/constants.js';
import { describeDeadline } from '../../lib/dates.js';

const base = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

export function PriorityPill({ priority, muted = false }) {
  const p = PRIORITY[priority] || PRIORITY.medium;
  return (
    <span className={`${base} ${muted ? 'tone-muted' : p.tone}`}>
      <span className="size-1.5 rounded-full" style={{ background: muted ? 'var(--faint)' : p.color }} />
      {p.label}
    </span>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.todo;
  return <span className={`${base} ${s.tone}`}>{s.label}</span>;
}

export function DueChip({ task }) {
  const due = describeDeadline(task);
  if (!due) return null;
  const late = due.tone === 'tone-danger';
  return (
    <span className={`${base} ${due.tone}`}>
      {late ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-danger" />
        </span>
      ) : (
        <CalendarClock className="size-3" aria-hidden="true" />
      )}
      <time dateTime={task.deadline}>{due.label}</time>
    </span>
  );
}

export function ChecklistCount({ checklist = [] }) {
  if (!checklist.length) return null;
  const done = checklist.filter((c) => c.done).length;
  const all = done === checklist.length;
  return (
    <span className={`${base} ${all ? 'tone-success' : 'tone-muted'}`}>
      <ListChecks className="size-3" aria-hidden="true" />
      {done}/{checklist.length}
    </span>
  );
}

export function ProjectTag({ project, className = '' }) {
  if (!project?.name) return null;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs text-muted ${className}`} style={hueStyle(project.color)}>
      <span className="hue-dot size-2 shrink-0 rounded-full" />
      <span className="truncate">{project.name}</span>
    </span>
  );
}

/** Ô vuông chữ cái đầu tô màu theo dự án. */
export function ProjectTile({ project, size = 36, className = '' }) {
  const letter = (project?.name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className={`hue-tint hue-ring hue-text grid shrink-0 place-items-center rounded-[10px] font-display font-bold ${className}`}
      style={{ ...hueStyle(project?.color), width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
