import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import { AuthProvider } from './components/auth/AuthContext.jsx';
import { UIProvider } from './components/shell/UIContext.jsx';
import { ToastProvider } from './components/ui/Toasts.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20 * 1000,
      refetchOnWindowFocus: true,
      // Render free tier có thể mất ~30-50 giây để thức dậy
      retry: (count, err) => ![400, 401, 403, 404].includes(err?.status) && count < 2,
    },
  },
});

// Service worker cho PWA (chỉ bật ở bản build, khi chạy dev thì bỏ qua để khỏi bị cache)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <AuthProvider>
              <UIProvider>
                <App />
              </UIProvider>
            </AuthProvider>
          </ToastProvider>
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
