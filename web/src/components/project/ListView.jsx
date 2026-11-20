import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { STATUS, STATUSES } from '../../lib/constants.js';
import { usePersistentState } from '../../lib/theme.js';
import { sortTasks } from '../task/Filters.jsx';
import TaskRow from '../task/TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import { tr } from '../../lib/i18n.js';

function Section({ status, tasks, projectId, index }) {
  const [folded, setFolded] = usePersistentState(`taskflow-fold-${status}`, status === 'done');
  const [adding, setAdding] = useState(false);
  const meta = STATUS[status];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.16, 0.84, 0.24, 1] }}
      className="rounded-[20px] border border-line bg-surface"
    >
      <button type="button" onClick={() => setFolded((v) => !v)} aria-expanded={!folded} className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left">
        <motion.span animate={{ rotate: folded ? 0 : 90 }} transition={{ duration: 0.2 }} className="text-faint">
          <ChevronRight className="size-4" aria-hidden="true" />
        </motion.span>
        <span className="size-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[13px] font-semibold">{meta.label}</span>
        <span className="rounded-md bg-surface-3 px-1.5 text-[11px] text-muted tabular-nums">{tasks.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {!folded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.75, 0.2, 1] }}
            className="overflow-hidden"
          >
            <ul className="border-t border-line px-1.5 py-1.5">
              <AnimatePresence initial={false}>
                {tasks.map((t) => (
                  <TaskRow key={t._id} task={t} showProject={false} />
                ))}
              </AnimatePresence>
              {tasks.length === 0 && (
                <li className="px-3 py-3 text-[13px] text-faint">
                  {status === 'done' ? tr('Chưa có việc nào xong. Tick vào vòng tròn để hoàn thành.') : tr('Chưa có việc nào.')}
                </li>
              )}
            </ul>
            {status !== 'done' && (
              <div className="px-2 pb-2">
                <QuickAdd
                  projectId={projectId}
                  status={status}
                  open={adding}
                  onOpenChange={setAdding}
                  label={tr('Thêm vào {status}', { status: meta.label.toLowerCase() })}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default function ListView({ tasks, projectId, sort = 'board' }) {
  return (
    <div className="space-y-3">
      {STATUSES.map((s, i) => (
        <Section
          key={s}
          index={i}
          status={s}
          projectId={projectId}
          tasks={sortTasks(
            tasks.filter((t) => t.status === s),
            sort,
          )}
        />
      ))}
    </div>
  );
}
