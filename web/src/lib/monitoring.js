// Báo lỗi lên Sentry. Chỉ bật khi có VITE_SENTRY_DSN, và chỉ tải thư viện Sentry lúc đó
// (tách file riêng) để người dùng bình thường không phải tải thêm.
const DSN = import.meta.env.VITE_SENTRY_DSN;
let sentry = null;

export function initMonitoring() {
  if (!DSN || !import.meta.env.PROD) return;
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        release: typeof __APP_VERSION__ === 'string' ? `taskflow-web@${__APP_VERSION__}` : undefined,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        // Bỏ qua lỗi mạng thường gặp (mất kết nối, máy chủ đang ngủ)
        ignoreErrors: ['Không kết nối được tới máy chủ', 'Failed to fetch', 'Load failed', 'NetworkError'],
      });
      sentry = Sentry;
    })
    .catch(() => {});
}

/** Ghi lại lỗi (vd từ ErrorBoundary). Không có Sentry thì in ra console. */
export function reportError(error, context) {
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
  else console.error(error);
}

/** Gắn id người dùng (không gửi email hay tên) để biết lỗi xảy ra với bao nhiêu người. */
export function setMonitoringUser(id) {
  sentry?.setUser(id ? { id } : null);
}
