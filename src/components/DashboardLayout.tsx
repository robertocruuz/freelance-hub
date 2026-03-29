import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Clock, Users, FolderKanban, SquareKanban, UsersRound, User, LogOut, Settings, Moon, Sun, Square, Menu, X, Bell, ChevronsUpDown, Globe, Wallet, Target, MessageCircle, Star } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTimer } from '@/hooks/useTimer';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationBell from '@/components/NotificationBell';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    group: '',
    items: [
      { key: 'home', icon: Home, path: '/dashboard' },
      { key: 'projects', icon: FolderKanban, path: '/dashboard/projects' },
      { key: 'kanban', icon: SquareKanban, path: '/dashboard/kanban' },
      { key: 'time', icon: Clock, path: '/dashboard/time' },
      { key: 'chat', icon: MessageCircle, path: '/dashboard/chat' },
    ]
  },
  {
    group: 'Meu negócio',
    items: [
      { key: 'leads', icon: Target, path: '/dashboard/leads' },
      { key: 'clients', icon: Users, path: '/dashboard/clients' },
      { key: 'budgets', icon: FileText, path: '/dashboard/budgets' },
      { key: 'finance', icon: Wallet, path: '/dashboard/finance' },
      { key: 'team', icon: UsersRound, path: '/dashboard/team' },
    ]
  }
];

const labelMap: Record<string, (t: any) => string> = {
  home: () => 'Home',
  clients: (t) => t.clients,
  budgets: (t) => t.budgets,
  projects: (t) => t.projects,
  kanban: (t) => t.tasks || 'Tarefas',
  time: (t) => t.timeTracking,
  leads: () => 'Leads',
  finance: () => 'Financeiro',
  team: (t) => t.team || 'Equipe',
  chat: (t) => t.chat || 'Chat',
};

/* ─── Helpers ─── */
const formatElapsed = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* ─── Sidebar Notification Item ─── */
const SidebarNotificationItem = ({ collapsed }: { collapsed: boolean }) => {
  const { lang } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const isPt = lang === 'pt-BR';

  const label = isPt ? 'Notificações' : 'Notifications';

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center">
            <NotificationBell onUnreadChange={setUnreadCount} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NotificationBell
      onUnreadChange={setUnreadCount}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          className={cn(
            'w-full flex items-center gap-3 rounded-[8px] transition-all duration-150 px-3 py-2.5',
            'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          <div className="relative shrink-0">
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[13px]">{label}</span>
        </button>
      )}
    />
  );
};

/* ─── Timer Indicator ─── */
const TimerIndicator = ({ navigate, collapsed }: { navigate: (path: string) => void; collapsed: boolean }) => {
  const { running, elapsed, stopTimer } = useTimer();

  if (!running) return null;

  return (
    <div className={cn('px-3 pb-2', collapsed && 'px-2')}>
      <button
        onClick={() => navigate('/dashboard/time')}
        className={cn(
          'w-full flex items-center gap-2 rounded-[8px] bg-destructive/10 hover:bg-destructive/15 transition-all py-2.5',
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

const getContrastYIQ = (hexcolor: string) => {
  if (!hexcolor) return 'dark';
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? 'dark' : 'light';
};

interface SidebarNavProps {
  isMobile?: boolean;
  collapsed: boolean;
  setMobileOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  location: any;
  t: any;
  filteredNavGroups: any[];
  user: any;
  userName: string;
  avatarUrl: string | null;
  initials: string;
  userExpanded: boolean;
  setUserExpanded: (expanded: boolean) => void;
  orgName: string;
  handleLogout: () => Promise<void>;
  isActive: (path: string) => boolean;
  hasUnreadChat: boolean;
}

const SidebarNav = ({ 
  isMobile = false, 
  collapsed, 
  setMobileOpen, 
  navigate, 
  location, 
  t, 
  filteredNavGroups,
  user,
  userName,
  avatarUrl,
  initials,
  userExpanded,
  setUserExpanded,
  orgName,
  handleLogout,
  isActive,
  hasUnreadChat
}: SidebarNavProps) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className={cn('flex items-center shrink-0', collapsed && !isMobile ? 'justify-center h-20' : 'gap-3 px-5 h-20')}>
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

    {/* Nav items */}
    <nav className={cn('flex-1 px-3 pt-6 pb-2 space-y-6 overflow-y-auto scrollbar-thin minimal-scrollbar', collapsed && !isMobile && 'px-2 pt-4')}>
      {filteredNavGroups.map((group, groupIdx) => (
        <div key={group.group || groupIdx} className={cn("flex flex-col gap-1", group.group === 'Favoritos' && "pb-2")}>
          {(!collapsed || isMobile) && group.group && (
            <div className="px-3 mb-1 text-[10px] font-bold tracking-widest text-sidebar-foreground/40 uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              {group.group}
            </div>
          )}
          {group.items.map((item: any) => {
            const active = isActive(item.path);
            const label = item.label || (labelMap[item.key] ? labelMap[item.key](t) : '');
            const isFav = item.bgColor !== undefined;
            const contrast = isFav && item.bgColor ? getContrastYIQ(item.bgColor) : null;
            const favHoverColor = contrast === 'light' ? '#ffffff' : '#0f172a';

            const btn = (
              <button
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-[8px] transition-all duration-150 hover:shadow-sm',
                  collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2.5',
                  isFav && item.bgColor 
                    ? (active 
                        ? 'font-bold shadow-sm' 
                        : 'text-sidebar-foreground/75 hover:bg-[var(--fav-bg)] hover:text-[var(--fav-color)] font-medium')
                    : (active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium')
                )}
                style={isFav && item.bgColor ? { 
                  '--fav-bg': item.bgColor,
                  '--fav-color': favHoverColor,
                  ...(active ? { backgroundColor: item.bgColor, color: favHoverColor } : {})
                } as React.CSSProperties : {}}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                  {item.key === 'chat' && hasUnreadChat && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-card" />
                  )}
                </div>
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
          {groupIdx < filteredNavGroups.length - 1 && collapsed && !isMobile && (
            <div className="mt-3 mb-2 border-t border-sidebar-border/50 mx-2" />
          )}
        </div>
      ))}
    </nav>

    {/* Timer */}
    <TimerIndicator navigate={(path) => { navigate(path); if (isMobile) setMobileOpen(false); }} collapsed={collapsed && !isMobile} />

    {/* Bottom section */}
    <div className="shrink-0">
      {/* Notifications & Settings links */}
      <div className={cn('px-3 space-y-0.5', collapsed && !isMobile && 'px-2')}>
        <SidebarNotificationItem collapsed={collapsed && !isMobile} />

        {(() => {
          const settingsActive = location.pathname === '/dashboard/settings';
          const settingsBtn = (
            <button
              onClick={() => { navigate('/dashboard/settings'); if (isMobile) setMobileOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 rounded-[8px] transition-all duration-150',
                collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2.5',
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
      </div>

      {/* User profile */}
      <div className={cn('px-3 py-3', collapsed && !isMobile && 'px-2 py-2')}>
        <button
          onClick={() => {
            if (collapsed && !isMobile) {
              navigate('/dashboard/profile');
            } else {
              setUserExpanded(!userExpanded);
            }
          }}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl p-2.5 transition-all',
            'hover:bg-sidebar-accent/50',
            collapsed && !isMobile && 'justify-center',
            userExpanded && (!collapsed || isMobile) && 'bg-sidebar-accent/40'
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
                <p className="text-[13px] font-semibold text-sidebar-foreground truncate">{userName || user?.email}</p>
              </div>
              <ChevronsUpDown className={cn('w-4 h-4 text-sidebar-foreground/30 shrink-0 transition-transform', userExpanded && 'rotate-180')} />
            </>
          )}
        </button>

        {/* Expanded user info */}
        {userExpanded && (!collapsed || isMobile) && (
          <div className="mt-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border overflow-hidden animate-accordion-down">
            <div className="px-4 py-3 space-y-2.5">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">Email</p>
                <p className="text-[12px] text-sidebar-foreground/80 truncate">{user?.email}</p>
              </div>
              {orgName && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">Empresa</p>
                  <p className="text-[12px] text-sidebar-foreground/80 truncate">{orgName}</p>
                </div>
              )}
            </div>
            <Separator className="bg-sidebar-border" />
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => { navigate('/dashboard/profile'); if (isMobile) setMobileOpen(false); setUserExpanded(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <User className="w-4 h-4" /> {t.profile}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
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
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [favoriteProjects, setFavoriteProjects] = useState<any[]>([]);
  const hasUnreadChat = useUnreadChat();

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', user.id).single();
    if (data) {
      setUserName(data.name || '');
      setAvatarUrl(data.avatar_url || null);
    } else {
      setUserName(user.user_metadata?.name || '');
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
        .from('project_favorites')
        .select(`
          project_id,
          projects (
            id,
            name,
            is_archived,
            color,
            clients ( color )
          )
        `)
        .eq('user_id', user.id);
    
    if (data) {
      const projects = data.map((f: any) => f.projects).filter((p: any) => p && !p.is_archived);
      setFavoriteProjects(projects);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchFavorites();

    const fetchOrg = async () => {
      const { data: member } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id).eq('status', 'accepted').single();
      if (member) {
        setUserOrgRole((member as any).role);
        const { data: org } = await supabase.from('organizations').select('trade_name, company_name').eq('id', member.organization_id).single();
        if (org) setOrgName(org.trade_name || org.company_name || '');
      } else {
        // User owns an org → they are admin
        const { data: ownOrg } = await supabase.from('organizations').select('id').eq('user_id', user.id).single();
        if (ownOrg) setUserOrgRole('admin');
      }
    };
    fetchOrg();

    // Listen for profile changes to update avatar in real-time
    const channel = supabase
      .channel('sidebar-events')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => {
        fetchProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, () => {
        // We still listen to projects in case a project name/color changes
        fetchFavorites();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_favorites', filter: `user_id=eq.${user.id}` }, () => {
        fetchFavorites();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const isAdminUser = userOrgRole === 'admin' || userOrgRole === null; // null = no org, show all
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.key === 'finance' && !isAdminUser) return false;
      return true;
    })
  })).filter(group => group.items.length > 0);

  if (favoriteProjects.length > 0) {
    filteredNavGroups.splice(1, 0, {
      group: 'Favoritos',
      items: favoriteProjects.map((p: any) => ({
        key: `fav-${p.id}`,
        icon: FolderKanban,
        path: `/dashboard/projects/${p.id}`,
        label: p.name,
        bgColor: p.clients?.color || p.color
      }))
    });
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0 relative h-full',
          collapsed ? 'w-[60px]' : 'w-[250px]'
        )}
      >
        <SidebarNav 
          collapsed={collapsed}
          setMobileOpen={setMobileOpen}
          navigate={navigate}
          location={location}
          t={t}
          filteredNavGroups={filteredNavGroups}
          user={user}
          userName={userName}
          avatarUrl={avatarUrl}
          initials={initials}
          userExpanded={userExpanded}
          setUserExpanded={setUserExpanded}
          orgName={orgName}
          handleLogout={handleLogout}
          isActive={isActive}
          hasUnreadChat={hasUnreadChat}
        />

        {/* Collapse toggle - subtle pill on border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[64px] w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all z-30"
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
          <div className="absolute inset-0 bg-background/80" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-card flex flex-col z-50 shadow-xl border-r border-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarNav 
              isMobile 
              collapsed={collapsed}
              setMobileOpen={setMobileOpen}
              navigate={navigate}
              location={location}
              t={t}
              filteredNavGroups={filteredNavGroups}
              user={user}
              userName={userName}
              avatarUrl={avatarUrl}
              initials={initials}
              userExpanded={userExpanded}
              setUserExpanded={setUserExpanded}
              orgName={orgName}
              handleLogout={handleLogout}
              isActive={isActive}
              hasUnreadChat={hasUnreadChat}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
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

        <main className="flex-1 p-5 md:p-6 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
