// Gửi email qua API HTTP của Brevo hoặc Resend (không dùng SMTP vì Render bản miễn phí chặn cổng SMTP).
// Chưa cấu hình thì: lúc chạy local in nội dung ra terminal, lúc test lưu vào outbox để kiểm tra.
import { env, isProd, isTest } from '../config/env.js';

export const outbox = [];

export function mailProvider() {
  if (!env.mail.from) return null;
  if (env.mail.brevoKey) return 'brevo';
  if (env.mail.resendKey) return 'resend';
  return null;
}

// "TaskFlow <ban@gmail.com>" -> { name, email }
function parseFrom(from) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || 'TaskFlow', email: match[2] } : { name: 'TaskFlow', email: from.trim() };
}

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Máy chủ email trả về lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Trả về true nếu đã gửi được. Không ném lỗi để request chính không bị hỏng vì email. */
export async function sendMail({ to, subject, html, text }) {
  if (isTest) {
    outbox.push({ to, subject, html, text });
    return true;
  }
  const provider = mailProvider();
  if (!provider) {
    if (!isProd) console.log(`[mail] (chưa cấu hình gửi email) Tới: ${to}\n[mail] ${subject}\n${text}\n`);
    else console.warn('[mail] Chưa cấu hình MAIL_FROM và BREVO_API_KEY/RESEND_API_KEY, bỏ qua email tới', to);
    return false;
  }
  try {
    if (provider === 'brevo') {
      await post('https://api.brevo.com/v3/smtp/email', { 'api-key': env.mail.brevoKey }, {
        sender: parseFrom(env.mail.from),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      });
    } else {
      await post('https://api.resend.com/emails', { authorization: `Bearer ${env.mail.resendKey}` }, { from: env.mail.from, to: [to], subject, html, text });
    }
    return true;
  } catch (err) {
    console.error('[mail] Gửi email thất bại:', err.message);
    return false;
  }
}
