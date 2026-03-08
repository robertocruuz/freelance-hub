import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Clock, Receipt, User, LogOut, Settings, Users, FolderKanban, Moon, Sun, SquareKanban, Menu, Play, Square } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTimer } from '@/hooks/useTimer';
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
      <header className="relative z-20 bg-primary text-primary-foreground overflow-hidden">
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'linear-gradient(135deg, hsl(225 100% 60%) 0%, hsl(225 100% 45%) 50%, hsl(260 80% 50%) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}
        />
        <div className="relative flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span className="text-accent-foreground font-black text-sm">F</span>
            </div>
            <span className="text-base font-extrabold tracking-tight hidden sm:inline">
              Freelaz
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname === item.path;
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-md shadow-accent/30'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.12]'
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent shadow-sm shadow-accent/50" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-medium">{labelMap[item.key](t)}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Timer indicator + Right controls */}
          <div className="flex items-center gap-2">
            <TimerIndicator navigate={navigate} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] backdrop-blur-sm border border-white/[0.08] transition-all flex items-center justify-center text-white/70 hover:text-white">
                  <User className="w-[18px] h-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <User className="w-4 h-4 mr-2" /> {t.profile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="w-4 h-4 mr-2" /> {t.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] backdrop-blur-sm border border-white/[0.08] transition-all flex items-center justify-center text-white/70 hover:text-white"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="relative md:hidden border-t border-white/10 px-5 py-3">
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
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-semibold transition-all ${
                      isActive
                        ? 'bg-accent text-accent-foreground shadow-md shadow-accent/30'
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

const formatElapsed = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TimerIndicator = ({ navigate }: { navigate: (path: string) => void }) => {
  const { running, elapsed, stopTimer } = useTimer();

  if (!running) return null;

  return (
    <button
      onClick={() => navigate('/dashboard/time')}
      className="flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] backdrop-blur-sm border border-white/[0.08] transition-all group"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <span className="text-xs font-mono font-bold text-white tabular-nums">
        {formatElapsed(elapsed)}
      </span>
      <Square
        className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition"
        onClick={(e) => {
          e.stopPropagation();
          stopTimer();
        }}
      />
    </button>
  );
};

export default DashboardLayout;
