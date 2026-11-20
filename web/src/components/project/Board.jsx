import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlignLeft, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMoveTask, useToggleTask } from '../../hooks/queries.js';
import { PRIORITY, STATUS, STATUSES } from '../../lib/constants.js';
import { useUI } from '../shell/UIContext.jsx';
import { StrikeTitle } from '../task/TaskRow.jsx';
import LiquidCheck from '../ui/LiquidCheck.jsx';
import { ChecklistCount, DueChip, PriorityPill } from '../ui/Pills.jsx';
import { useToast } from '../ui/Toasts.jsx';
import QuickAdd from './QuickAdd.jsx';

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(b.createdAt) - new Date(a.createdAt);

function group(tasks) {
  const cols = { todo: [], doing: [], done: [] };
  for (const t of [...tasks].sort(byOrder)) (cols[t.status] || cols.todo).push(t._id);
  return cols;
}

/* ---------- Thẻ ---------- */

function CardBody({ task, overlay = false }) {
  const toggle = useToggleTask();
  const notify = useToast();
  const done = task.status === 'done';
  const color = PRIORITY[task.priority]?.color;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-surface p-3.5 pl-4 ${
        overlay ? 'shadow-lift border-accent/50' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: done ? 'var(--line-strong)' : color }} aria-hidden="true" />
      <div className="flex items-start gap-2.5">
        <span className="pt-px" onPointerDown={(e) => e.stopPropagation()}>
          <LiquidCheck
            size={18}
            checked={done}
            color={color}
            label={done ? `Bỏ đánh dấu xong: ${task.title}` : `Đánh dấu xong: ${task.title}`}
            onToggle={() =>
              toggle.mutate(task, {
                onError: (err) => notify({ tone: 'error', message: err.message }),
              })
            }
          />
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug font-medium">
          <StrikeTitle done={done}>{task.title}</StrikeTitle>
        </p>
      </div>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 flex gap-1.5 pl-[28px] text-xs leading-relaxed text-muted">
          <span>{task.description}</span>
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[28px]">
        <PriorityPill priority={task.priority} muted={done} />
        <DueChip task={task} />
        <ChecklistCount checklist={task.checklist} />
        {task.description && !task.checklist?.length && <AlignLeft className="size-3.5 text-faint" aria-label="Có mô tả" />}
      </div>
    </div>
  );
}

function SortableCard({ task }) {
  const { openTask } = useUI();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task._id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === 'Enter' && !e.defaultPrevented) openTask(task._id);
      }}
      aria-label={`${task.title}. Nhấn Space để kéo, Enter để mở`}
      className={`cursor-grab touch-manipulation rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing ${
        isDragging ? 'opacity-35' : ''
      }`}
    >
      <CardBody task={task} />
    </li>
  );
}

/* ---------- Cột ---------- */

function Column({ status, ids, tasksById, projectId, index }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const meta = STATUS[status];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08 * index, ease: [0.16, 0.84, 0.24, 1] }}
      className="flex w-[84vw] max-w-[340px] shrink-0 snap-start flex-col rounded-[20px] border border-line bg-surface-2/60 md:w-auto md:max-w-none md:shrink"
      aria-label={`Cột ${meta.label}`}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold">
          <span
            className="size-2 rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 0 4px color-mix(in oklab, ${meta.color} 20%, transparent)` }}
          />
          {meta.label}
          <span className="rounded-md bg-surface-3 px-1.5 text-[11px] text-muted tabular-nums">{ids.length}</span>
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink"
          aria-label={`Thêm việc vào cột ${meta.label}`}
        >
          <Plus className="size-4" />
        </button>
      </header>

      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`mx-2 flex min-h-28 flex-1 flex-col gap-2 rounded-2xl p-1 pb-2 transition-colors duration-200 ${isOver ? 'bg-accent/8' : ''}`}
        >
          {ids.map((id) => tasksById.get(id) && <SortableCard key={id} task={tasksById.get(id)} />)}
          {ids.length === 0 && !adding && (
            <li className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-4 py-6 text-center text-xs text-faint">
              Kéo thẻ vào đây
            </li>
          )}
        </ul>
      </SortableContext>

      <div className="px-2 pb-2">
        <QuickAdd projectId={projectId} status={status} open={adding} onOpenChange={setAdding} />
      </div>
    </motion.section>
  );
}

/* ---------- Bảng ---------- */

/**
 * tasks: task đang hiển thị (đã lọc), allTasks: toàn bộ task của dự án (để tính vị trí thật khi đang lọc).
 * queryKey: khoá cache danh sách để cập nhật lạc quan.
 */
export default function Board({ tasks, allTasks, queryKey, projectId }) {
  const move = useMoveTask();
  const notify = useToast();
  const base = useMemo(() => group(tasks), [tasks]);
  const tasksById = useMemo(() => new Map(allTasks.map((t) => [t._id, t])), [allTasks]);
  const [items, setItems] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const dragging = useRef(false);
  const startStatus = useRef(null);
  const columns = items ?? base;

  // Khi dữ liệu mới về (sau cập nhật lạc quan) thì bỏ bản nháp lúc kéo
  useEffect(() => {
    if (!dragging.current) setItems(null);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id, cols = columns) => (STATUSES.includes(id) ? id : STATUSES.find((s) => cols[s].includes(id)));

  const onDragStart = ({ active }) => {
    dragging.current = true;
    startStatus.current = findColumn(active.id, base);
    setActiveId(active.id);
    setItems(base);
  };

  const onDragOver = ({ active, over }) => {
    if (!over) return;
    setItems((prev) => {
      const cols = prev ?? base;
      const from = findColumn(active.id, cols);
      const to = findColumn(over.id, cols);
      if (!from || !to || from === to) return prev;
      const target = cols[to];
      const overIndex = target.indexOf(over.id);
      const insertAt = overIndex >= 0 ? overIndex : target.length;
      return {
        ...cols,
        [from]: cols[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, insertAt), active.id, ...target.slice(insertAt)],
      };
    });
  };

  const finish = () => {
    dragging.current = false;
    setActiveId(null);
  };

  const onDragCancel = () => {
    finish();
    setItems(null);
  };

  const onDragEnd = ({ active, over }) => {
    const cols = items ?? base;
    const to = over ? findColumn(over.id, cols) : null;
    const from = startStatus.current;
    if (!to) return onDragCancel();

    let list = cols[to];
    const oldIndex = list.indexOf(active.id);
    const overIndex = list.indexOf(over.id);
    if (overIndex >= 0 && oldIndex !== overIndex) list = arrayMove(list, oldIndex, overIndex);
    const finalCols = { ...cols, [to]: list };
    setItems(finalCols);
    finish();

    // Vị trí thật trong cột đầy đủ (kể cả các thẻ đang bị bộ lọc ẩn)
    const pos = list.indexOf(active.id);
    const full = allTasks
      .filter((t) => t.status === to && t._id !== active.id)
      .sort(byOrder)
      .map((t) => t._id);
    const next = list[pos + 1];
    const prev = list[pos - 1];
    let index = full.length;
    if (next && full.includes(next)) index = full.indexOf(next);
    else if (prev && full.includes(prev)) index = full.indexOf(prev) + 1;
    else if (!next && !prev) index = 0;

    const before = allTasks
      .filter((t) => t.status === from)
      .sort(byOrder)
      .map((t) => t._id);
    if (from === to && before.indexOf(active.id) === index) {
      setItems(null);
      return undefined;
    }

    const task = tasksById.get(active.id);
    const apply = (cache) => {
      const ordered = cache.filter((t) => t.status === to && t._id !== active.id).sort(byOrder);
      ordered.splice(index, 0, { ...task, status: to });
      const orderOf = new Map(ordered.map((t, i) => [t._id, i]));
      return cache.map((t) => {
        if (t._id === active.id) {
          const completedAt = to === 'done' ? t.completedAt || new Date().toISOString() : null;
          return { ...t, status: to, order: orderOf.get(t._id), completedAt };
        }
        return orderOf.has(t._id) ? { ...t, order: orderOf.get(t._id) } : t;
      });
    };

    move.mutate(
      { id: active.id, status: to, index, queryKey, apply },
      {
        onSuccess: () => {
          if (from !== to && to === 'done') notify({ tone: 'success', message: `Đã xong “${task.title}”` });
        },
        onError: (err) => {
          setItems(null);
          notify({ tone: 'error', message: err.message });
        },
      },
    );
    return undefined;
  };

  const activeTask = activeId ? tasksById.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        screenReaderInstructions: { draggable: 'Nhấn Space để nhấc thẻ, dùng phím mũi tên để di chuyển, Space để thả, Esc để huỷ.' },
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {STATUSES.map((s, i) => (
          <Column key={s} status={s} index={i} ids={columns[s]} tasksById={tasksById} projectId={projectId} />
        ))}
      </div>
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)' }}>
          {activeTask && (
            <motion.div initial={{ rotate: 0, scale: 1 }} animate={{ rotate: 2.5, scale: 1.03 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
              <CardBody task={activeTask} overlay />
            </motion.div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
