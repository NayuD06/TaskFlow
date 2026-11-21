// Nạp đầu tiên trong mọi file test: đặt biến môi trường riêng cho test TRƯỚC khi đọc file .env,
// để test không bao giờ đụng vào database thật (Atlas) hay gửi email thật.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/taskflow_test_placeholder';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-taskflow-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.APP_URL = 'http://localhost:5173';
process.env.MAIL_FROM = '';
process.env.BREVO_API_KEY = '';
process.env.RESEND_API_KEY = '';
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
// Chỉ một biến như trên Render; các biến lẻ để trống cho chắc không lấy nhầm từ .env
process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@taskflow-test';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_UPLOAD_PRESET = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
process.env.ADMIN_EMAILS = 'boss@example.com, Boss2@Example.com';
process.env.SENTRY_DSN = '';
