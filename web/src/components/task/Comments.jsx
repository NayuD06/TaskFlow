import { LoaderCircle, MessageSquare, SendHorizontal, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useCommentActions, useComments } from '../../hooks/queries.js';
import { relativeTime } from '../../lib/dates.js';
import { tr } from '../../lib/i18n.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Avatar } from '../auth/Fields.jsx';
import { useToast } from '../ui/Toasts.jsx';

const MAX = 1000;

/** Bình luận trong công việc. canModerate: chủ dự án xoá được bình luận của mọi người. */
export default function Comments({ taskId, canModerate = false }) {
  const { user } = useAuth();
  const notify = useToast();
  const { data: comments = [], isLoading } = useComments(taskId);
  const { add, remove } = useCommentActions(taskId);
  const [text, setText] = useState('');

  const send = () => {
    const value = text.trim();
    if (!value || add.isPending) return;
    add.mutate(value, {
      onSuccess: () => setText(''),
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });
  };

  return (
    <section aria-labelledby="comments-title">
      <h3 id="comments-title" className="flex items-center gap-2 text-[13px] font-semibold">
        <MessageSquare className="size-4 text-muted" aria-hidden="true" />
        {tr('Bình luận')} {comments.length > 0 && <span className="text-faint">({comments.length})</span>}
      </h3>

      {isLoading ? (
        <div className="grid h-14 place-items-center text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-label={tr('Đang tải')} />
        </div>
      ) : (
        <ol className="mt-2 space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => {
              const mine = c.author?._id === user._id;
              return (
                <motion.li
                  key={c._id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group flex gap-2.5"
                >
                  <Avatar user={c.author} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2 text-xs">
                      <span className="font-semibold text-ink">{mine ? tr('Bạn') : c.author?.name}</span>
                      <time dateTime={c.createdAt} className="text-faint">
                        {relativeTime(c.createdAt)}
                      </time>
                      {(mine || canModerate) && (
                        <button
                          type="button"
                          onClick={() => remove.mutate(c._id, { onError: (err) => notify({ tone: 'error', message: err.message }) })}
                          className="ml-auto rounded p-0.5 text-faint opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                          aria-label={tr('Xoá bình luận')}
                          title={tr('Xoá bình luận')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </p>
                    <p className="mt-1 rounded-xl rounded-tl-sm bg-surface-2 px-3 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap">{c.text}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {comments.length === 0 && <li className="text-xs text-faint">{tr('Chưa có bình luận. Ghi chú tiến độ hay hỏi đồng đội ngay tại đây.')}</li>}
        </ol>
      )}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Avatar user={user} size={30} className="mb-1" />
        <label className="sr-only" htmlFor={`comment-${taskId}`}>
          {tr('Viết bình luận')}
        </label>
        <textarea
          id={`comment-${taskId}`}
          rows={1}
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          onInput={(e) => {
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
          }}
          placeholder={tr('Viết bình luận… (Ctrl+Enter để gửi)')}
          className="min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim() || add.isPending}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white hover:brightness-110 disabled:opacity-50"
          aria-label={tr('Gửi bình luận')}
        >
          {add.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
        </button>
      </form>
    </section>
  );
}
