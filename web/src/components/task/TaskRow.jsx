import { motion } from 'motion/react';
import { useToggleTask } from '../../hooks/queries.js';
import { PRIORITY } from '../../lib/constants.js';
import { useUI } from '../shell/UIContext.jsx';
import LiquidCheck from '../ui/LiquidCheck.jsx';
import { ChecklistCount, DueChip, PriorityPill, ProjectTag, TagChips } from '../ui/Pills.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { tr } from '../../lib/i18n.js';

/** Tên task có gạch ngang chạy dần qua từng dòng khi hoàn thành. */
export function StrikeTitle({ done, children, className = '' }) {
  return (
    <span
      className={`bg-no-repeat transition-[background-size,color] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        done ? 'text-muted delay-150 duration-500' : 'duration-300'
      } ${className}`}
      style={{
        backgroundImage: 'linear-gradient(currentColor, currentColor)',
        backgroundPosition: '0 58%',
        backgroundSize: done ? '100% 1.5px' : '0% 1.5px',
      }}
    >
      {children}
    </span>
  );
}

/** Dòng task 2 tầng dùng ở Tổng quan, Việc của tôi và chế độ Danh sách. */
export default function TaskRow({ task, showProject = true, className = '' }) {
  const { openTask } = useUI();
  const toggle = useToggleTask();
  const notify = useToast();
  const done = task.status === 'done';

  const onToggle = () =>
    toggle.mutate(task, {
      onSuccess: () => {
        if (!done)
          notify({
            tone: 'success',
            message: tr('Đã xong “{title}”', { title: task.title }),
            action: { label: tr('Hoàn tác'), onClick: () => toggle.mutate({ ...task, status: 'done' }) },
          });
      },
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      className={`group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2 ${className}`}
      onClick={() => openTask(task._id)}
    >
      <span className="pt-0.5">
        <LiquidCheck
          checked={done}
          color={PRIORITY[task.priority]?.color}
          onToggle={onToggle}
          label={done ? tr('Bỏ đánh dấu xong: {title}', { title: task.title }) : tr('Đánh dấu xong: {title}', { title: task.title })}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug font-medium">
          <StrikeTitle done={done}>{task.title}</StrikeTitle>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {showProject && <ProjectTag project={task.project} className="max-w-40" />}
          <ChecklistCount checklist={task.checklist} />
          <TagChips tags={task.tags} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-1.5">
        <DueChip task={task} />
        <span className="hidden sm:inline">
          <PriorityPill priority={task.priority} muted={done} />
        </span>
      </div>
    </motion.li>
  );
}
