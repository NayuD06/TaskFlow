import mongoose from 'mongoose';
import { isProd } from '../config/env.js';

export function notFoundRoute(req, res) {
  res.status(404).json({ error: { message: `Không có route ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Lỗi validate của Mongoose -> 400 kèm chi tiết từng trường
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(
      Object.entries(err.errors).map(([key, e]) => [key, e.message])
    );
    return res.status(400).json({
      error: { message: Object.values(fields)[0] || 'Dữ liệu không hợp lệ', fields },
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: `Giá trị không hợp lệ cho ${err.path}` } });
  }

  // Trùng giá trị unique (vd 2 người đăng ký cùng email một lúc)
  if (err?.code === 11000) {
    const key = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    const message = key === 'email' ? 'Email này đã được đăng ký' : 'Giá trị đã tồn tại';
    return res.status(409).json({ error: { message, fields: { [key]: message } } });
  }

  // JSON body sai cú pháp
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Body JSON không hợp lệ' } });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Dữ liệu gửi lên quá lớn' } });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]}`, err);

  res.status(status).json({
    error: {
      message: status >= 500 && isProd ? 'Lỗi máy chủ' : err.message,
      ...(err.fields && status < 500 ? { fields: err.fields } : {}),
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
