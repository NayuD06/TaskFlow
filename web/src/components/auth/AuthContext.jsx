import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { applyAccent } from '../../lib/accent.js';
import { api, getToken, setToken, setUnauthorizedHandler } from '../../lib/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Tên gọi thân mật: chữ cuối của họ tên ("Nguyễn Duy An" -> "An"). */
export const firstName = (name = '') => name.trim().split(/\s+/).pop() || '';

/**
 * status: 'loading' (đang kiểm tra token) | 'authed' | 'guest' | 'offline' (không gọi được API)
 * reason: 'expired' khi bị đăng xuất vì token hết hạn, 'logout' khi tự đăng xuất
 */
export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState(() => ({ user: null, status: getToken() ? 'loading' : 'guest', reason: null }));
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  // Kiểm tra token đã lưu. Render bản miễn phí có thể đang ngủ nên thử lại vài lần.
  useEffect(() => {
    if (state.status !== 'loading') return undefined;
    let cancelled = false;
    let timer;
    const check = (n) =>
      api.auth
        .me()
        .then((user) => !cancelled && setState({ user, status: 'authed', reason: null }))
        .catch((err) => {
          if (cancelled) return;
          if (err.status === 401) {
            setToken(null);
            setState({ user: null, status: 'guest', reason: 'expired' });
          } else if (n < 5) {
            timer = setTimeout(() => check(n + 1), 2000 + n * 2000);
          } else {
            setState((s) => ({ ...s, status: 'offline' }));
          }
        });
    check(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.status, attempt]);

  // Bất kỳ request nào trả 401 khi đang đăng nhập -> đăng xuất
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (statusRef.current !== 'authed') return;
      setToken(null);
      setState({ user: null, status: 'guest', reason: 'expired' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Màu nhấn theo tài khoản; khách (trang giới thiệu, đăng nhập) luôn dùng xanh dương
  const accent = state.user?.accentColor;
  useEffect(() => {
    if (state.status === 'authed') applyAccent(accent);
    else if (state.status === 'guest') applyAccent(null);
  }, [accent, state.status]);

  // Rời tài khoản thì xoá sạch dữ liệu đã cache để người sau không thấy
  useEffect(() => {
    if (state.status === 'guest') qc.clear();
  }, [state.status, qc]);

  const signIn = useCallback(
    ({ user, token }) => {
      qc.clear();
      setToken(token);
      setState({ user, status: 'authed', reason: null });
      return user;
    },
    [qc],
  );

  const login = useCallback((email, password) => api.auth.login({ email, password }).then(signIn), [signIn]);
  const register = useCallback((data) => api.auth.register(data).then(signIn), [signIn]);

  // reason 'logout': tự bấm đăng xuất, về thẳng trang đăng nhập (không kèm ?next=)
  const logout = useCallback(() => {
    setToken(null);
    setState({ user: null, status: 'guest', reason: 'logout' });
  }, []);

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), []);
  /** Sau khi đổi mật khẩu, server cấp token mới (các token cũ bị vô hiệu). */
  const replaceToken = useCallback((token) => setToken(token), []);
  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, setUser, replaceToken, retry }),
    [state, login, register, logout, setUser, replaceToken, retry],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
