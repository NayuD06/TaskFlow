import { CloudOff } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import { Button, Spinner } from './components/ui.jsx';
import Images from './pages/Images.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Users from './pages/Users.jsx';

export default function App() {
  const { status, retry, logout } = useAuth();
  if (status === 'checking') return <Spinner className="min-h-dvh" label="Đang kiểm tra phiên đăng nhập" />;
  if (status === 'offline') {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <CloudOff className="mx-auto size-10 text-muted" aria-hidden="true" />
          <h1 className="mt-4 font-display text-lg font-bold">Chưa kết nối được máy chủ</h1>
          <p className="mt-2 text-[13px] text-muted">Máy chủ miễn phí trên Render ngủ khi không ai dùng, lần đầu mở có thể mất khoảng 30 giây.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={retry}>
              Thử lại
            </Button>
            <Button onClick={() => logout()}>Đăng nhập lại</Button>
          </div>
        </div>
      </main>
    );
  }
  if (status === 'guest') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="images" element={<Images />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
