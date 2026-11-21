import { CalendarClock, Image, ListChecks, MessageSquare, Repeat, Timer } from 'lucide-react';
import { HUES, PRIORITY, REPEAT, STATUS, hueStyle } from '../../lib/constants.js';
import { describeDeadline } from '../../lib/dates.js';
import { tr } from '../../lib/i18n.js';

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

/** Các dấu nhỏ trên thẻ công việc: lặp lại, số bình luận, số ảnh, số phiên Pomodoro. */
export function TaskMeta({ task }) {
  const comments = task.commentCount || 0;
  const images = task.attachments?.length || 0;
  const repeat = task.repeat && task.repeat !== 'none' ? REPEAT[task.repeat] : null;
  if (!repeat && !comments && !images && !task.pomodoros) return null;
  const item = 'inline-flex items-center gap-1 text-[11px] font-semibold text-muted';
  return (
    <>
      {repeat && (
        <span className={item} title={repeat.label}>
          <Repeat className="size-3" aria-hidden="true" />
          <span className="sr-only">{tr('Lặp lại')}: </span>
          {repeat.short}
        </span>
      )}
      {comments > 0 && (
        <span className={item} title={tr('{n} bình luận', { n: comments })}>
          <MessageSquare className="size-3" aria-hidden="true" />
          {comments}
          <span className="sr-only"> {tr('bình luận')}</span>
        </span>
      )}
      {images > 0 && (
        <span className={item} title={tr('{n} ảnh', { n: images })}>
          <Image className="size-3" aria-hidden="true" />
          {images}
          <span className="sr-only"> {tr('ảnh')}</span>
        </span>
      )}
      {task.pomodoros > 0 && (
        <span className={item} title={tr('{n} phiên Pomodoro, {m} phút tập trung', { n: task.pomodoros, m: task.focusMinutes || 0 })}>
          <Timer className="size-3" aria-hidden="true" />
          {task.pomodoros}
          <span className="sr-only"> {tr('phiên Pomodoro')}</span>
        </span>
      )}
    </>
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

const HUE_KEYS = Object.keys(HUES);
/** Mỗi nhãn luôn ra cùng một màu (băm tên nhãn). */
export function tagHue(name = '') {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return HUE_KEYS[h % HUE_KEYS.length];
}

export function TagChip({ name, className = '', children }) {
  return (
    <span
      className={`tag-chip inline-flex max-w-36 items-center gap-0.5 rounded-md px-1.5 py-px text-[11px] font-medium ${className}`}
      style={hueStyle(tagHue(name))}
    >
      <span className="truncate">#{name}</span>
      {children}
    </span>
  );
}

/** Dãy nhãn gọn: hiện tối đa `max` nhãn, phần còn lại gộp thành +n. */
export function TagChips({ tags = [], max = 3 }) {
  if (!tags?.length) return null;
  const rest = tags.length - max;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
      {tags.slice(0, max).map((t) => (
        <TagChip key={t} name={t} />
      ))}
      {rest > 0 && (
        <span
          className="text-[11px] font-medium text-faint"
          title={tags
            .slice(max)
            .map((t) => `#${t}`)
            .join(' ')}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
