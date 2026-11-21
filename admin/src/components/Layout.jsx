import { ExternalLink, FileJson, Image, LayoutDashboard, LogOut, Menu, Moon, Sun, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth.jsx';
import { API_URL, WEB_URL } from '../lib/api.js';
import { useTheme } from '../lib/theme.js';
import { AdminMark, AdminWordmark } from './Logo.jsx';
import { Avatar, Button } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Người dùng', icon: Users },
  { to: '/images', label: 'Ảnh Cloudinary', icon: Image },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const link = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors';
  return (
    <nav aria-label="Trang quản trị" className="flex h-full w-64 flex-col rounded-[22px] border border-line bg-surface p-3">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <AdminMark />
        <AdminWordmark />
      </div>
      <ul className="mt-5 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-accent text-white shadow-[0_10px_24px_-14px_var(--accent)]' : 'text-muted hover:bg-surface-3 hover:text-ink'}`
              }
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="mt-7 px-3 text-[11px] font-semibold tracking-wide text-faint uppercase">Liên kết</p>
      <ul className="mt-1.5 space-y-1">
        {WEB_URL && (
          <li>
            <a href={WEB_URL} target="_blank" rel="noreferrer" className={`${link} text-muted hover:bg-surface-3 hover:text-ink`}>
              <ExternalLink className="size-[18px]" aria-hidden="true" />
              Mở TaskFlow
            </a>
          </li>
        )}
        <li>
          <a href={`${API_URL}/api/docs`} target="_blank" rel="noreferrer" className={`${link} text-muted hover:bg-surface-3 hover:text-ink`}>
            <FileJson className="size-[18px]" aria-hidden="true" />
            Tài liệu API
          </a>
        </li>
      </ul>
      <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-surface-2 p-2 ring-1 ring-line">
        <Avatar user={user} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold">{user?.name}</p>
          <p className="truncate text-[11px] text-muted">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Đăng xuất" title="Đăng xuất">
          <LogOut className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export default function Layout() {
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
    document.title = `${current?.label || 'Quản trị'} · TaskFlow Admin`;
  }, [location.pathname]);

  return (
    <div className="min-h-dvh p-2.5 sm:p-3.5 lg:flex lg:items-start lg:gap-5">
      <div className="sticky top-3.5 hidden h-[calc(100dvh-28px)] self-start lg:block">
        <Sidebar />
      </div>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="rise absolute inset-y-2 left-2">
            <Sidebar onNavigate={() => setDrawer(false)} />
            <Button variant="secondary" size="icon" className="absolute top-3 -right-12" onClick={() => setDrawer(false)} aria-label="Đóng menu">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-2 rounded-[18px] border border-line bg-surface px-3 py-2.5 sm:px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Mở menu">
            <Menu className="size-5" aria-hidden="true" />
          </Button>
          <span className="flex items-center gap-2 lg:hidden">
            <AdminMark size={28} />
            <AdminWordmark />
          </span>
          <p className="hidden text-[13px] text-muted lg:block">Chỉ quản trị viên mới thấy trang này. Mọi thao tác ảnh hưởng tới dữ liệu thật.</p>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" aria-hidden="true" /> : <Moon className="size-[18px]" aria-hidden="true" />}
          </Button>
        </header>
        <main className="mt-3.5 pb-24">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
