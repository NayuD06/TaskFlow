import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useRef, useState } from 'react';
import { useTags } from '../../hooks/queries.js';
import { MAX_TAGS, cleanTag, fold } from '../../lib/text.js';
import { TagChip } from '../ui/Pills.jsx';
import { tr } from '../../lib/i18n.js';

/**
 * Ô nhập nhãn: gõ rồi Enter (hoặc dấu phẩy) để thêm, Backspace khi ô trống để xoá nhãn cuối.
 * Gợi ý lấy từ các nhãn bạn đã dùng ở những việc khác.
 */
export default function TagInput({ value = [], onChange }) {
  const { data: known = [] } = useTags();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();
  const full = value.length >= MAX_TAGS;

  const has = (name) => value.some((v) => v.toLowerCase() === name.toLowerCase());
  const typed = cleanTag(text);

  const options = useMemo(() => {
    const q = fold(typed);
    const list = known
      .filter((t) => !value.some((v) => v.toLowerCase() === t.name.toLowerCase()) && (!q || fold(t.name).includes(q)))
      .slice(0, 6)
      .map((t) => ({ name: t.name, count: t.count }));
    if (typed && !list.some((o) => o.name.toLowerCase() === typed.toLowerCase()) && !value.some((v) => v.toLowerCase() === typed.toLowerCase()))
      list.push({ name: typed, create: true });
    return list;
  }, [known, typed, value]);

  const add = (raw) => {
    const name = cleanTag(raw);
    setText('');
    setActive(0);
    if (!name || has(name) || full) return;
    onChange([...value, name]);
  };

  const remove = (name) => {
    onChange(value.filter((v) => v !== name));
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && options[active]) add(options[active].name);
      else if (typed) add(typed);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Escape' && open) {
      // Chỉ đóng gợi ý, không đóng cả bảng chi tiết
      e.stopPropagation();
      setOpen(false);
    }
  };

  const showList = open && !full && options.length > 0;

  return (
    <div className="relative">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1.5 focus-within:border-accent"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span key={tag} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <TagChip name={tag} className="py-0.5 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(tag);
                  }}
                  className="-mr-0.5 ml-0.5 grid size-4 place-items-center rounded opacity-70 hover:bg-black/10 hover:opacity-100"
                  aria-label={tr('Bỏ nhãn {tag}', { tag })}
                >
                  <X className="size-3" />
                </button>
              </TagChip>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            if (next.endsWith(',')) return add(next.slice(0, -1));
            setText(next);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          disabled={full}
          maxLength={30}
          placeholder={full ? tr('Tối đa {MAX_TAGS} nhãn', { MAX_TAGS }) : value.length ? tr('Thêm nhãn') : tr('Ví dụ: báo cáo, frontend')}
          role="combobox"
          aria-label={tr('Thêm nhãn')}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          className="h-6 min-w-24 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint disabled:cursor-not-allowed"
        />
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={tr('Gợi ý nhãn')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="shadow-lift absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface p-1"
          >
            {options.map((o, i) => (
              <li
                key={o.name + (o.create ? '-new' : '')}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o.name);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${i === active ? 'bg-surface-2' : ''}`}
              >
                {o.create ? (
                  <>
                    <Plus className="size-3.5 text-accent-hi" aria-hidden="true" />
                    <span>
                      {tr('Tạo nhãn')} <TagChip name={o.name} />
                    </span>
                  </>
                ) : (
                  <>
                    <TagChip name={o.name} />
                    <span className="ml-auto text-[11px] text-faint tabular-nums">{tr('{n} việc', { n: o.count })}</span>
                  </>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
