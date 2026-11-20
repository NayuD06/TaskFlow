import { CircleAlert, CircleCheck, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

/** notify({ message, tone: 'success' | 'error' | 'neutral', action: { label, onClick } }) */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (toast) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { tone: 'neutral', ...toast, id }]);
      setTimeout(() => dismiss(id), toast.action ? 6000 : 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="shadow-lift pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1222] py-2.5 pr-2.5 pl-4 text-[13px] font-medium text-white"
            >
              {t.tone === 'error' && <CircleAlert className="size-4 shrink-0 text-danger" aria-hidden="true" />}
              {t.tone === 'success' && <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />}
              <span className="min-w-0 truncate">{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
                >
                  <Undo2 className="size-3.5" aria-hidden="true" />
                  {t.action.label}
                </button>
              ) : (
                <span className="w-1.5" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
