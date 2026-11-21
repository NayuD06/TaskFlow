import { ChevronLeft, ChevronRight, ExternalLink, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAttachmentActions, useConfig } from '../../hooks/queries.js';
import { cloudinaryThumb, uploadImage } from '../../lib/cloudinary.js';
import { tr } from '../../lib/i18n.js';
import { useToast } from '../ui/Toasts.jsx';

const MAX = 10;

/** Xem ảnh to: phím ← → để chuyển, Esc để đóng. */
function Lightbox({ items, index, onIndex, onClose, onRemove }) {
  const item = items[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      else if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, items.length, onIndex, onClose]);
  if (!item) return null;
  const nav = 'grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20';

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={tr('Xem ảnh')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center gap-2 p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-[13px] text-white/80">
          {item.name || tr('Ảnh')} · {index + 1}/{items.length}
        </p>
        <a href={item.url} target="_blank" rel="noreferrer" className={nav} aria-label={tr('Mở ảnh gốc')} title={tr('Mở ảnh gốc')}>
          <ExternalLink className="size-4" />
        </a>
        <button type="button" onClick={() => onRemove(item)} className={nav} aria-label={tr('Gỡ ảnh này')} title={tr('Gỡ ảnh này')}>
          <Trash2 className="size-4" />
        </button>
        <button type="button" onClick={onClose} className={nav} aria-label={tr('Đóng')} autoFocus>
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={item._id}
            src={cloudinaryThumb(item.url, 1600)}
            alt={item.name || ''}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </AnimatePresence>
        {items.length > 1 && (
          <>
            <button
              type="button"
              className={`${nav} absolute left-3`}
              aria-label={tr('Ảnh trước')}
              onClick={(e) => {
                e.stopPropagation();
                onIndex((index - 1 + items.length) % items.length);
              }}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className={`${nav} absolute right-3`}
              aria-label={tr('Ảnh sau')}
              onClick={(e) => {
                e.stopPropagation();
                onIndex((index + 1) % items.length);
              }}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

/** Ảnh đính kèm của công việc, lưu trên Cloudinary. Kéo thả, dán (Ctrl+V) hoặc bấm để thêm. */
export default function Attachments({ task }) {
  const { data: config } = useConfig();
  const uploads = config?.uploads;
  const notify = useToast();
  const { add, remove } = useAttachmentActions(task._id);
  const fileRef = useRef(null);
  const [queue, setQueue] = useState([]); // ảnh đang tải: { id, name, progress, preview }
  const [open, setOpen] = useState(null);
  const [dragging, setDragging] = useState(false);
  const items = task.attachments || [];
  const room = MAX - items.length - queue.length;

  const upload = async (files) => {
    if (!uploads) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    if (list.length > room) notify({ tone: 'error', message: tr('Mỗi công việc tối đa {n} ảnh', { n: MAX }) });
    for (const file of list.slice(0, Math.max(0, room))) {
      const id = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setQueue((q) => [...q, { id, name: file.name, progress: 0, preview }]);
      try {
        const data = await uploadImage(file, {
          ...uploads,
          kind: 'tasks',
          onProgress: (p) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        });
        await add.mutateAsync(data);
      } catch (err) {
        notify({ tone: 'error', message: err.message });
      } finally {
        URL.revokeObjectURL(preview);
        setQueue((q) => q.filter((x) => x.id !== id));
      }
    }
  };

  const removeItem = (item) => {
    setOpen(null);
    remove.mutate(item._id, {
      onSuccess: () =>
        notify({
          message: tr('Đã gỡ ảnh'),
          action: {
            label: tr('Hoàn tác'),
            onClick: () => {
              const { url, publicId, name, width, height, bytes } = item;
              add.mutate({ url, publicId, name, width, height, bytes }, { onError: (err) => notify({ tone: 'error', message: err.message }) });
            },
          },
        }),
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });
  };

  // Dán ảnh từ clipboard khi đang mở chi tiết công việc
  useEffect(() => {
    if (!uploads) return undefined;
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        upload(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  if (!uploads && !items.length) return null;

  return (
    <section
      aria-labelledby="attachments-title"
      onDragOver={(e) => {
        if (!uploads || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
      onDrop={(e) => {
        if (!uploads) return;
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
      className={`rounded-2xl transition-colors ${dragging ? 'bg-accent-soft ring-2 ring-accent/60 ring-dashed' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h3 id="attachments-title" className="text-[13px] font-semibold">
          {tr('Ảnh đính kèm')} {items.length > 0 && <span className="text-faint">({items.length})</span>}
        </h3>
        {uploads && <span className="text-[11px] text-faint">{tr('Kéo thả hoặc Ctrl+V để dán ảnh')}</span>}
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.li
              key={item._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative"
            >
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface-2"
                aria-label={tr('Xem ảnh {name}', { name: item.name || i + 1 })}
              >
                <img
                  src={cloudinaryThumb(item.url, 240, 240)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={tr('Gỡ ảnh {name}', { name: item.name || i + 1 })}
              >
                <X className="size-3.5" />
              </button>
            </motion.li>
          ))}
          {queue.map((q) => (
            <motion.li
              key={q.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative aspect-square overflow-hidden rounded-xl border border-line"
            >
              <img src={q.preview} alt="" className="size-full object-cover opacity-50" />
              <span className="absolute inset-0 grid place-items-center">
                <LoaderCircle className="size-5 animate-spin text-ink" aria-label={tr('Đang tải ảnh lên')} />
              </span>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-surface-3">
                <span className="block h-full bg-accent transition-[width]" style={{ width: `${Math.round(q.progress * 100)}%` }} />
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {uploads && room > 0 && (
          <li>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-line-strong text-muted hover:border-accent hover:bg-accent-soft hover:text-accent-hi"
            >
              <span className="flex flex-col items-center gap-1 text-[11px] font-semibold">
                <ImagePlus className="size-5" aria-hidden="true" />
                {tr('Thêm ảnh')}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = '';
              }}
            />
          </li>
        )}
      </ul>
      <AnimatePresence>
        {open !== null && items[open] && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onRemove={removeItem} />}
      </AnimatePresence>
    </section>
  );
}
