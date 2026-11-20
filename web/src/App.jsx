import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth, Splash } from './components/auth/Guards.jsx';
import Shell from './components/shell/Shell.jsx';
import { PageFallback } from './components/ui/Overlay.jsx';

// Mỗi trang là một file JS riêng, chỉ tải khi mở tới (trang đầu mở nhanh hơn)
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const MyTasks = lazy(() => import('./pages/MyTasks.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const ProjectPage = lazy(() => import('./pages/ProjectPage.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const page = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={page(Dashboard)} />
          <Route path="projects" element={page(Projects)} />
          <Route path="projects/:id" element={page(ProjectPage)} />
          <Route path="my-tasks" element={page(MyTasks)} />
          <Route path="settings" element={page(Settings)} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
