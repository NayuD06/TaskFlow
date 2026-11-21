// Nội dung các email (HTML đơn giản, dùng được trên Gmail và điện thoại).
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ title, intro, button, link, outro }) {
  return `<!doctype html><html><body style="margin:0;background:#edf1f7;font-family:Arial,Helvetica,sans-serif;color:#0a1222">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="font-size:20px;font-weight:700;color:#1f5bff;margin-bottom:16px">TaskFlow</div>
    <div style="background:#ffffff;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>
      <p style="font-size:15px;line-height:1.6;color:#36415a;margin:0 0 22px">${intro}</p>
      <a href="${escape(link)}" style="display:inline-block;background:#1f5bff;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${escape(button)}</a>
      <p style="font-size:13px;line-height:1.6;color:#55627d;margin:22px 0 0">${outro}</p>
      <p style="font-size:12px;line-height:1.6;color:#636e86;margin:16px 0 0;word-break:break-all">${escape(link)}</p>
    </div>
  </div></body></html>`;
}

export function resetPasswordEmail({ name, link }) {
  const subject = 'Đặt lại mật khẩu TaskFlow';
  return {
    subject,
    html: layout({
      title: 'Đặt lại mật khẩu',
      intro: `Chào ${escape(name)}, bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản TaskFlow. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết dùng được trong 30 phút.`,
      button: 'Đặt mật khẩu mới',
      link,
      outro: 'Nếu bạn không yêu cầu, cứ bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.',
    }),
    text: `Chào ${name},\n\nMở liên kết sau để đặt mật khẩu mới (dùng được trong 30 phút):\n${link}\n\nNếu bạn không yêu cầu, cứ bỏ qua email này.`,
  };
}

export function projectInviteEmail({ inviterName, projectName, link, hasAccount }) {
  const subject = `${inviterName} mời bạn vào dự án “${projectName}” trên TaskFlow`;
  const intro = `${escape(inviterName)} vừa mời bạn cùng làm dự án <b>${escape(projectName)}</b>. ${
    hasAccount ? 'Dự án đã có trong danh sách của bạn.' : 'Tạo tài khoản bằng chính email này, dự án sẽ tự xuất hiện.'
  }`;
  return {
    subject,
    html: layout({
      title: 'Bạn có lời mời vào dự án',
      intro,
      button: hasAccount ? 'Mở dự án' : 'Tạo tài khoản',
      link,
      outro: 'TaskFlow là ứng dụng quản lý dự án và công việc miễn phí.',
    }),
    text: `${inviterName} mời bạn vào dự án "${projectName}" trên TaskFlow.\n${link}`,
  };
}
