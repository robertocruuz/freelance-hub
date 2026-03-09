import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Clock, Receipt, Users, FolderKanban, SquareKanban, User, LogOut, Settings, Moon, Sun, Square, Menu, X, Bell, ChevronsUpDown, Globe } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationBell from '@/components/NotificationBell';
import { Separator } from '@/components/ui/separator';
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
  const [userExpanded, setUserExpanded] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [orgName, setOrgName] = useState('');

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
    const fetchOrg = async () => {
      const { data: member } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('status', 'accepted').single();
      if (member) {
        const { data: org } = await supabase.from('organizations').select('trade_name, company_name').eq('id', member.organization_id).single();
        if (org) setOrgName(org.trade_name || org.company_name || '');
      }
    };
    fetchProfile();
    fetchOrg();
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

  const SidebarNav = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center shrink-0 border-b border-sidebar-border', collapsed && !isMobile ? 'justify-center h-16' : 'gap-3 px-5 h-16')}>
        <button onClick={() => { navigate('/dashboard'); if (isMobile) setMobileOpen(false); }} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <span className="text-primary-foreground font-black text-sm">F</span>
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold tracking-tight text-sidebar-foreground leading-tight">
                Freelaz
              </span>
              <span className="text-[10px] font-medium text-sidebar-foreground/40 leading-none tracking-wide">
                connect
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Notifications row */}
      <div className={cn('px-3 pt-3 pb-1', collapsed && !isMobile && 'px-2')}>
        <SidebarNotificationItem collapsed={collapsed && !isMobile} />
      </div>

      <Separator className="mx-3 my-2 bg-sidebar-border" />

      {/* Menu label */}
      {(!collapsed || isMobile) && (
        <div className="px-5 pt-1 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Menu</span>
        </div>
      )}

      {/* Nav items */}
      <nav className={cn('flex-1 px-3 py-1 space-y-0.5 overflow-y-auto', collapsed && !isMobile && 'px-2')}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const label = labelMap[item.key](t);

          const btn = (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg transition-all duration-150',
                collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2.5',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {(!collapsed || isMobile) && <span className="text-[13px] truncate">{label}</span>}
            </button>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.key}>{btn}</div>;
        })}
      </nav>

      {/* Timer */}
      <TimerIndicator navigate={(path) => { navigate(path); if (isMobile) setMobileOpen(false); }} collapsed={collapsed && !isMobile} />

      {/* Bottom section */}
      <div className="shrink-0 border-t border-sidebar-border">
        {/* Settings row */}
        <div className={cn('px-3 pt-2 space-y-0.5', collapsed && !isMobile && 'px-2')}>
          {/* Preferences / Settings */}
          {(() => {
            const settingsActive = location.pathname === '/dashboard/settings';
            const settingsBtn = (
              <button
                onClick={() => { navigate('/dashboard/settings'); if (isMobile) setMobileOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg transition-all duration-150',
                  collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2',
                  settingsActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                {(!collapsed || isMobile) && <span className="text-[13px]">{t.settings}</span>}
              </button>
            );
            if (collapsed && !isMobile) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{settingsBtn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">{t.settings}</TooltipContent>
                </Tooltip>
              );
            }
            return settingsBtn;
          })()}

          {/* Dark mode toggle */}
          {(() => {
            const themeBtn = (
              <button
                onClick={toggle}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                  collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2'
                )}
              >
                {isDark ? <Sun className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} /> : <Moon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />}
                {(!collapsed || isMobile) && <span className="text-[13px]">{isDark ? 'Light mode' : 'Dark mode'}</span>}
              </button>
            );
            if (collapsed && !isMobile) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{themeBtn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">{isDark ? 'Light mode' : 'Dark mode'}</TooltipContent>
                </Tooltip>
              );
            }
            return themeBtn;
          })()}

          {/* Language toggle */}
          {(() => {
            const langBtn = (
              <button
                onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                  collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2'
                )}
              >
                <Globe className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                {(!collapsed || isMobile) && <span className="text-[13px]">{lang === 'pt-BR' ? 'Português' : 'English'}</span>}
              </button>
            );
            if (collapsed && !isMobile) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{langBtn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">{lang === 'pt-BR' ? 'Português' : 'English'}</TooltipContent>
                </Tooltip>
              );
            }
            return langBtn;
          })()}
        </div>

        <Separator className="mx-3 my-2 bg-sidebar-border" />

        {/* User profile */}
        <div className={cn('px-3 pb-3', collapsed && !isMobile && 'px-2')}>
          {/* User button */}
          <button
            onClick={() => {
              if (collapsed && !isMobile) {
                navigate('/dashboard/profile');
              } else {
                setUserExpanded(!userExpanded);
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg p-2 transition-all',
              'text-sidebar-foreground hover:bg-sidebar-accent/50',
              collapsed && !isMobile && 'justify-center',
              userExpanded && (!collapsed || isMobile) && 'bg-sidebar-accent/30'
            )}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-2 ring-sidebar-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{initials}</span>
              )}
            </div>
            {(!collapsed || isMobile) && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-semibold truncate">{userName || user?.email}</p>
                </div>
                <ChevronsUpDown className={cn('w-4 h-4 text-sidebar-foreground/30 shrink-0 transition-transform', userExpanded && 'rotate-180')} />
              </>
            )}
          </button>

          {/* Expanded info panel */}
          {userExpanded && (!collapsed || isMobile) && (
            <div className="mt-1 mx-1 rounded-lg bg-sidebar-accent/30 border border-sidebar-border overflow-hidden animate-accordion-down">
              <div className="px-3 py-3 space-y-2">
                {/* Email */}
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">Email</p>
                  <p className="text-[12px] text-sidebar-foreground/80 truncate">{user?.email}</p>
                </div>
                {/* Company */}
                {orgName && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">Empresa</p>
                    <p className="text-[12px] text-sidebar-foreground/80 truncate">{orgName}</p>
                  </div>
                )}
              </div>
              <Separator className="bg-sidebar-border" />
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { navigate('/dashboard/profile'); if (isMobile) setMobileOpen(false); setUserExpanded(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <User className="w-4 h-4" /> {t.profile}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> {t.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0 relative',
          collapsed ? 'w-[60px]' : 'w-[250px]'
        )}
      >
        <SidebarNav />

        {/* Collapse toggle - subtle pill on border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all z-30"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn('transition-transform duration-300', collapsed && 'rotate-180')}>
            <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-card flex flex-col z-50 shadow-xl border-r border-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarNav isMobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-black text-xs">F</span>
              </div>
              <span className="font-bold text-sm text-foreground">Freelaz</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 p-5 md:p-6 overflow-auto hero-gradient">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/* ─── Sidebar Notification Item ─── */
const SidebarNotificationItem = ({ collapsed }: { collapsed: boolean }) => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const isPt = lang === 'pt-BR';

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    fetch();

    const channel = supabase
      .channel('sidebar-notif-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const content = (
    <div className="relative">
      <NotificationBell />
      {/* Badge is handled inside NotificationBell */}
    </div>
  );

  // In collapsed mode, just show the bell
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <NotificationBell />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <NotificationBell />
    </div>
  );
};

/* ─── Timer Indicator ─── */
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
    <div className={cn('px-3 pb-2', collapsed && 'px-2')}>
      <button
        onClick={() => navigate('/dashboard/time')}
        className={cn(
          'w-full flex items-center gap-2 rounded-lg bg-destructive/10 hover:bg-destructive/15 transition-all py-2.5',
          collapsed ? 'justify-center px-2' : 'px-3'
        )}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
        </span>
        {!collapsed && (
          <>
            <span className="text-xs font-mono font-bold text-foreground tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <Square
              className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition ml-auto"
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
