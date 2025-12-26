import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Box, 
  Globe, 
  Terminal, 
  Settings, 
  LogOut,
  Menu,
  X,
  Cpu
} from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apps', icon: Box, label: 'Apps' },
  { to: '/processes', icon: Cpu, label: 'Processes' },
  { to: '/dns', icon: Globe, label: 'DNS' },
  { to: '/sessions', icon: Terminal, label: 'Sessions' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-[#0a0a0f] border-r border-white/10
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary flex items-center gap-3 font-heading uppercase tracking-wider">
            <img src="/lmf-logo.svg" alt="LMF" className="w-8 h-8" />
            LMF VPS Admin
          </h1>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 border-l-4 transition-all font-heading font-bold uppercase tracking-wide
                ${isActive 
                  ? 'border-primary bg-white/5 text-primary' 
                  : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
