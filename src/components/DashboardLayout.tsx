import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Clock, Receipt, Users, FolderKanban, SquareKanban, User, LogOut, Settings, Moon, Sun, Square, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTimer } from '@/hooks/useTimer';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationBell from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

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
  const { signOut, user } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', user.id).single();
      if (data) {
        setUserName(data.name || '');
        setAvatarUrl(data.avatar_url || null);
      } else {
        setUserName(user.user_metadata?.name || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (userName || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isActive = (path: string) =>
    path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === path;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <span className="text-sidebar-primary-foreground font-black text-sm">F</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-sidebar-foreground leading-tight">
                Freelaz
              </span>
              <span className="text-[10px] font-medium text-sidebar-foreground/50 leading-none">
                connect
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const label = labelMap[item.key](t);

          const btn = (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-200 group',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span className="text-sm truncate">{label}</span>}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </nav>

      {/* Timer indicator */}
      <TimerIndicator navigate={navigate} collapsed={collapsed} />

      {/* Bottom controls */}
      <div className="px-3 pb-4 pt-2 space-y-2 shrink-0 border-t border-sidebar-border">
        {/* Theme + Lang */}
        <div className={cn('flex items-center', collapsed ? 'justify-center gap-1' : 'gap-2 px-1')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Tema</TooltipContent>
          </Tooltip>
          {!collapsed && (
            <button
              onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
              className="text-[10px] font-semibold px-2 py-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              {lang === 'pt-BR' ? 'PT-BR' : 'EN'}
            </button>
          )}
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'w-full flex items-center gap-3 rounded-xl p-2 transition-all',
              'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              collapsed && 'justify-center'
            )}>
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-sidebar-accent/50 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-sidebar-foreground/70">{initials}</span>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">{userName || user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={collapsed ? 'right' : 'top'} align="start" className="w-48">
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
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 relative',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-30"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-xs">F</span>
            </div>
            <span className="font-bold text-sm text-foreground">Freelaz</span>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6 overflow-auto hero-gradient">
          <Outlet />
        </main>

        <footer className="h-9 flex items-center justify-center px-6 hero-gradient shrink-0">
          <span className="text-[11px] text-muted-foreground/40">{t.copyright}</span>
        </footer>
      </div>
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

const TimerIndicator = ({ navigate, collapsed }: { navigate: (path: string) => void; collapsed: boolean }) => {
  const { running, elapsed, stopTimer } = useTimer();

  if (!running) return null;

  return (
    <div className="px-3 pb-2">
      <button
        onClick={() => navigate('/dashboard/time')}
        className={cn(
          'w-full flex items-center gap-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all py-2',
          collapsed ? 'justify-center px-2' : 'px-3'
        )}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        {!collapsed && (
          <>
            <span className="text-xs font-mono font-bold text-sidebar-foreground tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <Square
              className="w-3.5 h-3.5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                stopTimer();
              }}
            />
          </>
        )}
      </button>
    </div>
  );
};

export default DashboardLayout;
