import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun, SquareKanban, Menu } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { key: 'home', icon: Home, path: '/dashboard' },
  { key: 'clients', icon: Users, path: '/dashboard/clients' },
  { key: 'budgets', icon: FileText, path: '/dashboard/budgets' },
  { key: 'projects', icon: FolderKanban, path: '/dashboard/projects' },
  { key: 'kanban', icon: SquareKanban, path: '/dashboard/kanban' },
  { key: 'time', icon: Clock, path: '/dashboard/time' },
  { key: 'invoices', icon: Receipt, path: '/dashboard/invoices' },
] as const;

const labelMap: Record<string, (t: any) => string> = {
  home: () => 'Home',
  clients: (t) => t.clients,
  budgets: (t) => t.budgets,
  projects: (t) => t.projects,
  kanban: () => 'Kanban',
  time: (t) => t.timeTracking,
  invoices: (t) => t.invoices,
};

const DashboardLayout = () => {
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="relative z-20 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-5 h-14">
          {/* Logo */}
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold tracking-tight">
              Logo<span className="text-accent">*</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 bg-white/[0.08] rounded-xl px-1.5 py-1">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname === item.path;
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <item.icon className="w-[17px] h-[17px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{labelMap[item.key](t)}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.08] hover:bg-white/15 transition text-white/70 hover:text-white"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="h-8 px-2.5 rounded-lg bg-white/[0.08] hover:bg-white/15 transition text-[11px] font-bold text-white/70 hover:text-white tracking-wide"
            >
              {lang === 'pt-BR' ? 'PT' : 'EN'}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 transition flex items-center justify-center text-white/70 hover:text-white">
                  <User className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" /> {t.profile}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" /> {t.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 transition flex items-center justify-center text-white/70 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3">
            <div className="grid grid-cols-4 gap-2">
              {navItems.map((item) => {
                const isActive = item.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname === item.path;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {labelMap[item.key](t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 p-5 md:p-6 overflow-auto hero-gradient">
        <Outlet />
      </main>

      <footer className="relative z-20 h-9 flex items-center justify-center px-6 hero-gradient">
        <span className="text-[11px] text-muted-foreground/40">{t.copyright}</span>
      </footer>
    </div>
  );
};

export default DashboardLayout;
