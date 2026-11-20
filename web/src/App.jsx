import { Route, Routes } from 'react-router';
import Shell from './components/shell/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyTasks from './pages/MyTasks.jsx';
import NotFound from './pages/NotFound.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import Projects from './pages/Projects.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
