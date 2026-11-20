import { Languages } from 'lucide-react';
import { lang, setLang } from '../../lib/i18n.js';

/** Nút đổi Việt ⇄ Anh. Hiện mã ngôn ngữ sẽ chuyển sang (đang tiếng Việt thì hiện EN). */
export default function LangSwitch({ className = '' }) {
  const next = lang === 'vi' ? 'en' : 'vi';
  const label = next === 'en' ? 'Switch to English' : 'Chuyển sang tiếng Việt';
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      className={`h-9 items-center gap-1 rounded-xl px-2 text-muted hover:bg-surface-2 hover:text-ink ${className || 'flex'}`}
    >
      <Languages className="size-4" aria-hidden="true" />
      <span className="text-[11px] font-bold tracking-wide" lang={next}>
        {next.toUpperCase()}
      </span>
    </button>
  );
}
