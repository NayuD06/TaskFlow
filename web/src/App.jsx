import { Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './components/auth/Guards.jsx';
import Shell from './components/shell/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import MyTasks from './pages/MyTasks.jsx';
import NotFound from './pages/NotFound.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import Projects from './pages/Projects.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
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
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
