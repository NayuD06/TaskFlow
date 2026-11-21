import { useEffect, useRef, useState } from 'react';
import { useConfig } from '../../hooks/queries.js';
import { lang } from '../../lib/i18n.js';

// Thư viện "Sign in with Google" chỉ tải khi máy chủ đã bật đăng nhập Google
let loader = null;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error('gsi')));
    script.onerror = () => {
      loader = null;
      script.remove();
      reject(new Error('gsi'));
    };
    document.head.appendChild(script);
  });
  return loader;
}

/** Theo dõi giao diện sáng/tối để nút Google đổi màu theo. */
function useDocTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme || 'dark'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** Có bật đăng nhập Google hay không (để trang đăng nhập quyết định có hiện dòng "hoặc"). */
export function useGoogleEnabled() {
  const { data } = useConfig();
  return !!data?.googleClientId;
}

/**
 * Nút đăng nhập bằng Google do chính Google vẽ (bắt buộc theo quy định của Google).
 * onCredential nhận ID token để gửi lên máy chủ kiểm tra.
 */
export default function GoogleButton({ onCredential, text = 'continue_with', disabled = false }) {
  const { data: config } = useConfig();
  const clientId = config?.googleClientId;
  const box = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const theme = useDocTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !box.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => res?.credential && handler.current(res.credential),
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
        });
        box.current.innerHTML = '';
        google.accounts.id.renderButton(box.current, {
          type: 'standard',
          theme: theme === 'light' ? 'outline' : 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          width: Math.min(400, Math.max(220, box.current.offsetWidth || 320)),
          locale: lang === 'en' ? 'en' : 'vi',
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, theme, text]);

  if (!clientId || failed) return null;
  return (
    <div
      ref={box}
      className={`flex min-h-11 w-full justify-center [color-scheme:normal] ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      aria-busy={disabled}
    />
  );
}
