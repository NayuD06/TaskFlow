// Bật Sentry (báo lỗi) trước khi nạp Express. Chạy bằng: node --import ./src/instrument.js src/server.js
// Không đặt SENTRY_DSN thì file này không làm gì cả.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RENDER_GIT_COMMIT || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
    // Không gửi mật khẩu, token lên Sentry
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) delete event.request.headers.authorization;
      }
      return event;
    },
  });
  console.log('[sentry] Đã bật báo lỗi');
}
