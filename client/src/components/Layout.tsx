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
  Cpu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
  // Mobile: overlay sidebar, Desktop: collapsible sidebar
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    // Persist preference
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(desktopCollapsed));
  }, [desktopCollapsed]);

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar - always fixed */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 h-screen
        bg-[#0a0a0f] border-r border-white/10
        transition-all duration-200 flex flex-col
        ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${desktopCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-4 mt-10 lg:mt-0">
          <div className={`flex items-center gap-3 ${desktopCollapsed ? 'lg:justify-center' : ''}`}>
            <img src="/lmf-logo.svg" alt="LMF" className="w-8 h-8 flex-shrink-0" />
            <h1 className={`text-xl font-bold text-primary font-heading uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-200
              ${mobileOpen ? 'opacity-100 w-auto' : 'lg:opacity-0 lg:w-0 opacity-100'}
              ${desktopCollapsed ? 'lg:hidden' : 'lg:opacity-100 lg:w-auto'}
            `}>
              LMF Admin
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 mt-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              title={desktopCollapsed ? label : undefined}
              className={({ isActive }) => `
                flex items-center gap-3 py-3 px-3 rounded-lg transition-all font-heading font-bold uppercase tracking-wide
                ${desktopCollapsed ? 'lg:justify-center' : ''}
                ${isActive 
                  ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                  : 'border-l-4 border-transparent text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-200
                ${mobileOpen ? 'opacity-100 w-auto' : ''}
                ${desktopCollapsed ? 'lg:hidden' : 'lg:opacity-100 lg:w-auto'}
              `}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-2 space-y-1">
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className={`hidden lg:flex items-center gap-3 py-3 px-3 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors
              ${desktopCollapsed ? 'justify-center' : ''}
            `}
            title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {desktopCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-200
              ${desktopCollapsed ? 'lg:hidden' : ''}
            `}>
              Collapse
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={desktopCollapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 py-3 px-3 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors
              ${desktopCollapsed ? 'lg:justify-center' : ''}
            `}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-200
              ${mobileOpen ? 'opacity-100 w-auto' : ''}
              ${desktopCollapsed ? 'lg:hidden' : ''}
            `}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content - offset for fixed sidebar */}
      <main className={`flex-1 min-h-screen p-6 lg:p-8 transition-all duration-200
        ${desktopCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
      `}>
        <Outlet />
      </main>
    </div>
  );
}
