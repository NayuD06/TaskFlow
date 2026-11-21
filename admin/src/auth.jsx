import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api, setUnauthorizedHandler, tokenStore } from './lib/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function notAdmin() {
  return new ApiError('Tài khoản này không có quyền quản trị. Hãy đặt email của bạn vào ADMIN_EMAILS trên máy chủ, hoặc chạy npm run make-admin.', {
    status: 403,
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'guest'));
  const [notice, setNotice] = useState('');

  const logout = useCallback((message = '') => {
    tokenStore.set('');
    setUser(null);
    setStatus('guest');
    setNotice(message);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((message) => logout(message || 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.'));
    const token = tokenStore.get();
    if (!token) return;
    api
      .me(token)
      .then((me) => {
        if (me.role !== 'admin') return logout(notAdmin().message);
        setUser(me);
        setStatus('ready');
      })
      .catch((err) => {
        // Máy chủ đang khởi động: giữ token, cho thử lại thay vì đăng xuất
        if (err.status === 0) setStatus('offline');
        else logout(err.message);
      });
  }, [logout]);

  const accept = useCallback(async ({ user: me, token }) => {
    if (me.role !== 'admin') throw notAdmin();
    tokenStore.set(token);
    setUser(me);
    setNotice('');
    setStatus('ready');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      notice,
      login: async (email, password) => accept(await api.login(email, password)),
      logout,
      retry: () => window.location.reload(),
    }),
    [user, status, notice, accept, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
