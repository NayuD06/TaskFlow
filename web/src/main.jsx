import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import { UIProvider } from './components/shell/UIContext.jsx';
import { ToastProvider } from './components/ui/Toasts.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20 * 1000,
      refetchOnWindowFocus: true,
      // Render free tier có thể mất ~30-50 giây để thức dậy
      retry: (count, err) => err?.status !== 404 && count < 2,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <UIProvider>
              <App />
            </UIProvider>
          </ToastProvider>
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
