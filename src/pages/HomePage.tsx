import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, AlertCircle, DollarSign, CalendarDays, ChevronLeft, ChevronRight, Wallet, UserPlus, Target, TrendingUp, Bell, BellOff, Check, CheckCheck, Trash2, Info, ListTodo, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { UserChecklist } from '@/components/UserChecklist';
import { getContrastYIQ } from '@/pages/ProjectsPage';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, parseISO, differenceInMinutes, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardData {
  clients: any[];
  budgets: any[];
  projects: any[];
  tasks: any[];
  timeEntries: any[];
  invoices: any[];
  expenses: any[];
  orgMembers: any[];
  leads: any[];
  notifications: any[];
}

const HomePage = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPt = lang === 'pt-BR';
  const [firstName, setFirstName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    clients: [], budgets: [], projects: [], tasks: [], timeEntries: [], invoices: [], expenses: [], orgMembers: [], leads: [], notifications: [],
  });
  const [loading, setLoading] = useState(true);

  const isAdminUser = userOrgRole === 'admin' || userOrgRole === null;

  useEffect(() => {
    const fetchName = async () => {
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle();
        if (data?.name) { setFirstName(data.name.split(' ')[0]); return; }
      }
      const metaName = user?.user_metadata?.name;
      if (metaName) setFirstName(metaName.split(' ')[0]);
    };
    if (user) fetchName();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchOrgRole = async () => {
      const { data: member } = await supabase.from('organization_members').select('role').eq('user_id', user.id).eq('status', 'accepted').single();
      if (member) {
        setUserOrgRole((member as any).role);
      } else {
        const { data: ownOrg } = await supabase.from('organizations').select('id').eq('user_id', user.id).single();
        if (ownOrg) setUserOrgRole('admin');
      }
    };
    fetchOrgRole();
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setLoading(true);
      const [clients, budgets, projects, tasks, timeEntries, invoices, expenses, orgMembers, leads, notifications] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('budgets').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').order('start_time', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('organization_members').select('id, user_id, role, status, organization_id').eq('status', 'accepted'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);

      const memberUserIds = (orgMembers.data || []).map((m: any) => m.user_id);
      let memberProfiles: any[] = [];
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar_url').in('user_id', memberUserIds);
        memberProfiles = profiles || [];
      }

      const orgId = (orgMembers.data || [])[0]?.organization_id;
      if (orgId) {
        const { data: org } = await supabase.from('organizations').select('company_name, trade_name').eq('id', orgId).maybeSingle();
        if (org) {
          setOrgName(org.trade_name || org.company_name || '');
        }
      }

      const enrichedMembers = (orgMembers.data || []).map((m: any) => {
        const profile = memberProfiles.find((p: any) => p.user_id === m.user_id);
        return { ...m, profile };
      });

      setData({
        clients: clients.data || [],
        budgets: budgets.data || [],
        projects: projects.data || [],
        tasks: tasks.data || [],
        timeEntries: timeEntries.data || [],
        invoices: invoices.data || [],
        expenses: expenses.data || [],
        orgMembers: enrichedMembers,
        leads: leads.data || [],
        notifications: notifications.data || [],
      });
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.id).eq('read', false);
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) }));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id);
    setData(prev => ({ ...prev, notifications: prev.notifications.filter(n => n.id !== id) }));
  };

  const deleteAllNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setData(prev => ({ ...prev, notifications: [] }));
  };

  const myTasks = useMemo(() => {
    return data.tasks.filter(t =>
      t.status !== 'done'
    ).sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [data.tasks]);

  const taskStats = useMemo(() => {
    const total = data.tasks.length;
    const done = data.tasks.filter(t => t.status === 'done').length;
    const inProgress = data.tasks.filter(t => t.status === 'in_progress' || t.status === 'doing').length;
    const todo = data.tasks.filter(t => t.status === 'todo').length;
    const overdue = data.tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
    return { total, done, inProgress, todo, overdue };
  }, [data.tasks]);

  const timeStats = useMemo(() => {
    const todayEntries = data.timeEntries.filter(e => e.start_time && isToday(parseISO(e.start_time)));
    const weekEntries = data.timeEntries.filter(e => {
      if (!e.start_time) return false;
      const d = parseISO(e.start_time);
      return d >= weekStart && d <= weekEnd;
    });
    const calcMinutes = (entries: any[]) => entries.reduce((sum, e) => {
      if (e.duration) return sum + Math.round(e.duration / 60);
      if (e.end_time) return sum + differenceInMinutes(parseISO(e.end_time), parseISO(e.start_time));
      return sum;
    }, 0);

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      const dayEntries = data.timeEntries.filter(e => e.start_time && isSameDay(parseISO(e.start_time), day));
      const minutes = calcMinutes(dayEntries);
      return {
        label: format(day, 'EEE', { locale: isPt ? ptBR : undefined }),
        minutes,
        hours: +(minutes / 60).toFixed(1),
        isToday: isToday(day),
      };
    });

    return { todayMin: calcMinutes(todayEntries), weekMin: calcMinutes(weekEntries), activeTimer: data.timeEntries.find(e => !e.end_time && !e.duration), last7 };
  }, [data.timeEntries]);

  const budgetStats = useMemo(() => {
    const draft = data.budgets.filter(b => b.status === 'draft').length;
    const sent = data.budgets.filter(b => b.status === 'sent').length;
    const approved = data.budgets.filter(b => b.status === 'approved').length;
    return { draft, sent, approved, total: data.budgets.length, totalValue: data.budgets.reduce((s, b) => s + (Number(b.total) || 0), 0) };
  }, [data.budgets]);

  const financeStats = useMemo(() => {
    const totalReceivable = data.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalPayable = data.expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalReceived = data.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalPaid = data.expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const balance = totalReceived - totalPaid;

    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const receivedThisMonth = data.invoices
      .filter(i => i.status === 'paid' && i.due_date?.startsWith(currentMonthStr))
      .reduce((s, i) => s + (Number(i.total) || 0), 0);
    const paidThisMonth = data.expenses
      .filter(e => e.status === 'paid' && (e.due_date?.startsWith(currentMonthStr) || e.paid_date?.startsWith(currentMonthStr)))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthBalance = receivedThisMonth - paidThisMonth;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dueOrOverdueInvoices = data.invoices.filter(i => i.status !== 'paid' && i.due_date && i.due_date <= todayStr).length;
    const dueOrOverdueExpenses = data.expenses.filter(e => e.status !== 'paid' && e.due_date && e.due_date <= todayStr).length;
    const pendingDueItems = dueOrOverdueInvoices + dueOrOverdueExpenses;

    return { totalReceivable, totalPayable, totalReceived, totalPaid, balance, monthBalance, pendingDueItems };
  }, [data.invoices, data.expenses]);

  const leadStats = useMemo(() => {
    const open = data.leads.filter(l => l.status === 'open');
    const won = data.leads.filter(l => l.status === 'won');
    const lost = data.leads.filter(l => l.status === 'lost');
    const totalValue = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
    return { total: data.leads.length, open: open.length, won: won.length, lost: lost.length, totalValue };
  }, [data.leads]);

  const teamStats = useMemo(() => {
    return { total: data.orgMembers.length, members: data.orgMembers };
  }, [data.orgMembers]);

  const fmtTime = (min: number) => `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, '0')}m`;
  const fmtCurrency = (v: number) => new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: isPt ? 'BRL' : 'USD' }).format(v);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-8 animate-pulse">
        <div className="h-12 bg-muted/50 rounded-xl w-64" />
        <div className="h-20 bg-muted/40 rounded-2xl w-full" />
        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-8 flex flex-col gap-8"><div className="h-64 bg-muted/30 rounded-2xl" /><div className="h-80 bg-muted/30 rounded-2xl" /></div>
           <div className="col-span-4 flex flex-col gap-8"><div className="h-96 bg-muted/30 rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
      {/* 1. Dashboard Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">
            {isPt ? 'Olá, ' : 'Hello, '}
            <span className="text-primary">{firstName || (isPt ? 'Usuário' : 'User')}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2">
            {isPt ? format(now, "EEEE, dd 'de' MMMM", { locale: ptBR }) : format(now, 'EEEE, MMMM dd')}
          </p>
        </div>

        {/* Executive KPI Overview */}
        <div className="flex flex-wrap items-center gap-6 xl:gap-10">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{isPt ? 'Tarefas Pendentes' : 'Pending Tasks'}</span>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-2xl font-black text-foreground leading-none">{taskStats.todo}</span>
               {taskStats.overdue > 0 && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">{taskStats.overdue} {isPt ? 'atrasadas' : 'overdue'}</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-border/50 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{isPt ? 'Projetos Ativos' : 'Active Projects'}</span>
            <span className="text-2xl font-black text-foreground leading-none mt-1">{data.projects.length}</span>
          </div>
          <div className="w-px h-8 bg-border/50 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{isPt ? 'Valor Estimado (Leads)' : 'Estimated Leads Value'}</span>
            <span className="text-2xl font-black text-foreground leading-none mt-1">{fmtCurrency(leadStats.totalValue)}</span>
          </div>
          {isAdminUser && (
            <>
              <div className="w-px h-8 bg-border/50 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{isPt ? 'Saldo Atual' : 'Current Balance'}</span>
                <span className={`text-2xl font-black leading-none mt-1 ${financeStats.balance >= 0 ? 'text-primary' : 'text-foreground'}`}>
                  {fmtCurrency(financeStats.balance)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Bento Grid Workspace */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* ROW 1: (3 CARDS) */}
        {/* 1. Minhas Tarefas */}
        <section className="col-span-12 xl:col-span-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <ListTodo className="w-5 h-5 text-foreground" />
              <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Minhas Tarefas' : 'My Tasks'}</h2>
            </div>
            <button onClick={() => navigate('/dashboard/kanban')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
               {isPt ? 'Ver todas' : 'View all'} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col bg-card border border-border rounded-2xl flex-1 justify-between p-2">
             {myTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-10 text-center opacity-60 m-auto">
                  <CheckCheck className="w-6 h-6 text-emerald-500 mb-3" />
                  <span className="text-sm font-medium text-muted-foreground">{isPt ? 'Tudo limpo! Nenhuma tarefa pendente.' : 'All clear! No pending tasks.'}</span>
               </div>
             ) : (
               <div className="flex flex-col">
                 {myTasks.slice(0, 5).map(t => {
                    const project = data.projects.find(p => p.id === t.project_id);
                    const client = t.client_id
                      ? data.clients.find(c => c.id === t.client_id)
                      : project
                        ? data.clients.find(c => c.id === project.client_id)
                        : null;
                     const hasLinkedColor = Boolean(client?.color || project?.color);
                     const itemColor = client?.color || project?.color || '#FFFFFF';
                     const isLate = t.due_date && new Date(t.due_date) < now && t.status !== 'done';
                     const solidCol = itemColor.startsWith('#') ? itemColor : '#FFFFFF';
                     const contrast = hasLinkedColor ? getContrastYIQ(solidCol) : 'light';
                     const useLightHoverText = contrast === 'light';
                     const hoverTitleColor = hasLinkedColor
                       ? useLightHoverText
                         ? 'group-hover:text-white'
                         : 'group-hover:text-slate-900'
                       : 'group-hover:text-white dark:group-hover:text-black';
                     const hoverMetaColor = hasLinkedColor
                       ? useLightHoverText
                         ? 'group-hover:text-white/80'
                         : 'group-hover:text-slate-700'
                       : 'group-hover:text-white/80 dark:group-hover:text-black/70';
                     const hoverBadgeColor = hasLinkedColor
                       ? useLightHoverText
                         ? 'group-hover:bg-black/20 group-hover:text-white'
                         : 'group-hover:bg-slate-900/10 group-hover:text-slate-900'
                       : 'group-hover:bg-white/20 group-hover:text-white dark:group-hover:bg-black/10 dark:group-hover:text-black';
                    return (
                     <div 
                       key={t.id} 
                       className={`group flex items-center gap-3 p-3.5 border-b border-border/60 last:border-0 cursor-pointer rounded-xl transition-all hover:-translate-y-0.5 hover:border-transparent ${hasLinkedColor ? 'hover:bg-[var(--hover-bg)]' : 'hover:bg-black dark:hover:bg-white'}`}
                       style={hasLinkedColor ? { '--hover-bg': solidCol } as React.CSSProperties : undefined}
                       onClick={() => navigate('/dashboard/kanban', { state: { taskId: t.id } })}
                     >
                        <div className="flex flex-col min-w-0 flex-1">
                          <p className={`text-sm font-semibold text-foreground/90 truncate transition-colors ${hoverTitleColor}`}>{t.title}</p>
                          {t.project_id && <span className={`text-[10px] text-muted-foreground font-medium mt-0.5 truncate transition-colors ${hoverMetaColor}`}>{project?.name || 'Projeto'}</span>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors ${
                          isLate 
                          ? `bg-destructive/10 text-destructive ${hoverBadgeColor}` 
                          : `bg-background border border-border text-muted-foreground ${hoverBadgeColor} group-hover:border-transparent`
                        }`}>
                          {t.due_date ? format(parseISO(t.due_date), 'dd/MM') : '-'}
                        </span>
                     </div>
                    );
                 })}
               </div>
             )}
          </div>
        </section>

        {/* 2. Calendário */}
        <section className="col-span-12 xl:col-span-8 flex flex-col h-full">
          <TaskCalendarCard tasks={data.tasks} invoices={data.invoices} expenses={data.expenses} isPt={isPt} navigate={navigate} headerOutside />
        </section>

        {/* 3. Personal Checklist */}
        <div className="col-span-12 xl:col-span-4 flex flex-col pt-0.5 h-full">
          <div className="flex items-center gap-2.5 mb-6">
            <ListTodo className="w-5 h-5 text-foreground" />
            <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Checklist' : 'Checklist'}</h2>
          </div>
          <UserChecklist className="h-full" hideHeader />
        </div>

        {/* ROW 2: (3 CARDS) */}
        {/* 4. Notificações */}
        <section className="col-span-12 xl:col-span-4 flex flex-col min-h-[300px] h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-foreground" />
              <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Notificações' : 'Notifications'}</h2>
              {data.notifications.filter(n => !n.read).length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-500">
                  {data.notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            {data.notifications.filter(n => !n.read).length > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors" title={isPt ? 'Marcar lidas' : 'Mark all read'}>
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-[300px] bg-card p-6 rounded-2xl border border-border">
          <div className="flex-1 overflow-y-auto minimal-scrollbar max-h-[400px] pr-1 -mr-1">
            {data.notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-12">
                <BellOff className="w-8 h-8 text-muted-foreground/60 mb-3" />
                <span className="text-sm font-medium text-muted-foreground">{isPt ? 'Nenhuma notificação' : 'No notifications'}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {data.notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`group relative flex flex-col gap-1.5 p-3.5 rounded-xl transition-all duration-200 cursor-pointer border
                      ${!n.read ? 'bg-background border-primary/20  ' : 'bg-transparent border-transparent hover:bg-muted/40'}
                    `}
                    onClick={() => { 
                      if (!n.read) markAsRead(n.id);
                      if (n.link) window.location.href = n.link; 
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5 min-w-0 pr-1">
                        <div className="flex items-center gap-2">
                          {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <p className={`text-sm leading-snug truncate ${!n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'}`}>{n.title}</p>
                        </div>
                        <span className={`text-[10px] font-medium ${!n.read ? 'text-muted-foreground ml-4' : 'text-muted-foreground/80'}`}>
                          {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: isPt ? ptBR : enUS })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 translate-y-1">
                        {!n.read && <button onClick={(e) => markAsRead(n.id, e)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Check className="w-3.5 h-3.5" /></button>}
                        <button onClick={(e) => deleteNotification(n.id, e)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {data.notifications.length > 0 && (
            <button onClick={deleteAllNotifications} className="mt-4 pt-4 border-t border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 transition-colors">
              <Trash2 className="w-3 h-3" />
              {isPt ? 'Limpar todas' : 'Clear all'}
            </button>
          )}
          </div>
        </section>

        {/* 5. Time Tracking */}
        <section className="col-span-12 xl:col-span-4 flex flex-col h-full">
          <div className="flex items-center gap-2.5 mb-6">
            <Clock className="w-5 h-5 text-foreground" />
            <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Gestão de tempo' : 'Time Tracking'}</h2>
            {timeStats.activeTimer && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ml-2 ring-4 ring-green-500/20" />}
          </div>
          
          <div className="flex flex-col bg-card border border-border rounded-2xl p-6 h-full justify-between gap-6 cursor-pointer hover:bg-card transition-colors" onClick={() => navigate('/dashboard/time')}>
            <div className="flex justify-between items-start">
               <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold mb-1 block uppercase tracking-wide">{isPt ? 'Hoje' : 'Today'}</span>
                  <div className="text-4xl font-black tracking-tighter text-foreground">{fmtTime(timeStats.todayMin)}</div>
               </div>
               {timeStats.activeTimer && (
                 <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-[8px] font-bold uppercase tracking-wider animate-pulse">
                   {isPt ? 'Ativo' : 'Active'}
                 </div>
               )}
            </div>
            <div className="w-full pt-4 border-t border-border/60">
               <MiniBarChart data={timeStats.last7} />
            </div>
          </div>
        </section>

        {/* 6. Projetos */}
        <section className="col-span-12 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
               <FolderKanban className="w-5 h-5 text-foreground" />
               <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Projetos' : 'Projects'}</h2>
            </div>
            <button onClick={() => navigate('/dashboard/projects')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              {isPt ? 'Ver todos' : 'View all'} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3">
            {data.projects.slice(0, 5).map(p => {
              const client = data.clients.find(c => c.id === p.client_id);
              const projectColor = client?.color || p.color || 'hsl(var(--muted))';
              const isHexColor = projectColor.startsWith('#');
              const solidCol = isHexColor ? projectColor : 'hsl(var(--muted))';
              const contrast = isHexColor ? getContrastYIQ(solidCol) : 'dark';
              const useLightText = contrast === 'light';
              const tColor = isHexColor
                ? `text-foreground/90 transition-colors duration-300 ${useLightText ? 'group-hover:text-white' : 'group-hover:text-slate-900'}`
                : 'text-foreground/90 transition-colors duration-300 group-hover:text-foreground';
              const mColor = isHexColor
                ? `text-muted-foreground transition-colors duration-300 ${useLightText ? 'group-hover:text-white/80' : 'group-hover:text-slate-700'}`
                : 'text-muted-foreground transition-colors duration-300 group-hover:text-muted-foreground';
              const topMeta = client?.name || (isPt ? 'Sem cliente' : 'No client');
              const bottomMeta = p.due_date
                ? `${isPt ? 'Entrega' : 'Due'} ${format(parseISO(p.due_date), 'dd/MM')}`
                : undefined;

              return (
              <div key={p.id} className="flex justify-center first:justify-start last:justify-end">
                <ProjectFolderCard
                  title={p.name}
                  topMeta={topMeta}
                  bottomMeta={bottomMeta}
                  solidCol={solidCol}
                  titleClassName={tColor}
                  metaClassName={mColor}
                  onClick={() => navigate('/dashboard/projects')}
                />
              </div>
              );
            })}
            {data.projects.length === 0 && <div className="col-span-full p-8 text-center text-sm text-muted-foreground opacity-60 m-auto">{isPt ? 'Nenhum projeto.' : 'No projects.'}</div>}
          </div>
        </section>

        {/* ROW 3+: REMAINING */}
        {/* 7. Clientes */}
        <section className="col-span-12 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
               <Users className="w-5 h-5 text-foreground" />
               <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Clientes Ativos' : 'Active Clients'}</h2>
            </div>
            <button onClick={() => navigate('/dashboard/clients')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              {isPt ? 'Ver todos' : 'View all'} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            {data.clients.slice(0, 4).map(c => {
              const clientProjectsCount = data.projects.filter(p => p.client_id === c.id).length;
              const solidCol = c.color?.startsWith('#') ? c.color : 'hsl(var(--primary))';
              const contrast = solidCol.startsWith('#') ? getContrastYIQ(solidCol) : 'dark';
              const isLight = contrast === 'light';
              const tColor = `text-foreground/90 transition-colors duration-300 ${isLight ? 'group-hover:text-white' : 'group-hover:text-slate-900'}`;
              const mColor = `text-muted-foreground transition-colors duration-300 ${isLight ? 'group-hover:text-white/80' : 'group-hover:text-slate-700'}`;

              return (
              <div 
                key={c.id} 
                className="group flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 bg-card border border-border hover:bg-[var(--hover-bg)] hover:border-[var(--hover-bg)]" 
                style={{ '--hover-bg': solidCol } as React.CSSProperties}
                onClick={() => navigate('/dashboard/clients', { state: { clientId: c.id } })}
              >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}>
                          {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover rounded-full" /> : c.name?.charAt(0).toUpperCase()}
                        </div>
                 <div className="flex flex-col flex-1 min-w-0">
                   <span className={`text-sm font-bold opacity-95 truncate ${tColor}`}>{c.name}</span>
                   <span className={`text-[10px] font-bold uppercase tracking-wider opacity-80 ${mColor}`}>
                     {clientProjectsCount} {isPt ? 'Projetos' : 'Projects'}
                   </span>
                 </div>
              </div>
              );
            })}
            {data.clients.length === 0 && <div className="col-span-full p-8 text-center text-sm text-muted-foreground opacity-60 m-auto">{isPt ? 'Nenhum cliente.' : 'No clients.'}</div>}
          </div>
        </section>

        {/* ROW 4: BUSINESS INSIGHTS */}
        {/* 8. Financeiro (Visão de Negócios) */}
        <section className="col-span-12 mt-4">
           <div className="flex items-center gap-2.5 mb-6">
             <TrendingUp className="w-5 h-5 text-foreground" />
             <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Visão de Negócios' : 'Business Insights'}</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Finance Panel */}
              {isAdminUser && (
                <div className="flex flex-col p-6 rounded-2xl border border-border bg-card hover:bg-card transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/finance')}>
                  <div className="flex items-center gap-3 mb-6">
                    <Wallet className="w-5 h-5 text-foreground" />
                    <h3 className="font-semibold text-sm text-foreground">{isPt ? 'Financeiro' : 'Finance'}</h3>
                  </div>
                  <div className="flex flex-col mb-4">
                     <span className={`text-2xl font-black leading-tight ${financeStats.monthBalance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                       {fmtCurrency(financeStats.monthBalance)}
                     </span>
                     <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 mb-4">
                       {isPt ? 'Balanço do Mês' : 'Monthly Balance'}
                     </span>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-emerald-500">{fmtCurrency(financeStats.totalReceivable)}</span>
                           <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'A receber' : 'Receivable'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-destructive">{fmtCurrency(financeStats.totalPayable)}</span>
                           <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'A pagar' : 'Payable'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border/80 flex justify-between items-center text-xs">
                     <div className="flex items-center gap-1.5">
                       <AlertCircle className={`w-3.5 h-3.5 ${financeStats.pendingDueItems > 0 ? 'text-amber-500' : 'text-muted-foreground/60'}`} />
                       <span className="text-muted-foreground font-medium">{isPt ? 'Vencem hoje/atrasados' : 'Due today/overdue'}</span>
                     </div>
                     <span className={`font-bold px-2 py-0.5 rounded ${financeStats.pendingDueItems > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted/50 text-foreground'}`}>
                       {financeStats.pendingDueItems}
                     </span>
                  </div>
                </div>
              )}
              
              {/* Leads Panel */}
              <div className="flex flex-col p-6 rounded-2xl border border-border bg-card hover:bg-card transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/leads')}>
                 <div className="flex items-center gap-3 mb-6">
                   <Target className="w-5 h-5 text-foreground" />
                   <h3 className="font-semibold text-sm text-foreground">Leads</h3>
                 </div>
                 <div className="flex flex-col mb-4">
                    <span className="text-2xl font-black leading-tight text-primary">
                      {leadStats.open}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 mb-4">
                      {isPt ? 'Em andamento' : 'Active'}
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{leadStats.won}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Ganhos' : 'Won'}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{leadStats.lost}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Perdidos' : 'Lost'}</span>
                       </div>
                    </div>
                 </div>
                 <div className="mt-auto pt-3 border-t border-border/80 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">{isPt ? 'Taxa de conversão' : 'Conversion'}</span>
                    <span className="font-bold text-rose-500">
                      {(leadStats.won + leadStats.lost) > 0 ? Math.round((leadStats.won / (leadStats.won + leadStats.lost)) * 100) : 0}%
                    </span>
                 </div>
              </div>

              {/* Budgets Panel */}
              <div className="flex flex-col p-6 rounded-2xl border border-border bg-card hover:bg-card transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>
                 <div className="flex items-center gap-3 mb-6">
                   <FileText className="w-5 h-5 text-foreground" />
                   <h3 className="font-semibold text-sm text-foreground">{isPt ? 'Orçamentos' : 'Budgets'}</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col">
                       <span className="text-2xl font-black text-foreground">{budgetStats.sent}</span>
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Enviados' : 'Sent'}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-2xl font-black text-foreground">{budgetStats.approved}</span>
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Aprovados' : 'Approved'}</span>
                    </div>
                 </div>
                 <div className="mt-auto pt-3 border-t border-border/80 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">{isPt ? 'Conversão' : 'Conversion'}</span>
                    <span className="font-bold text-amber-500">
                      {budgetStats.sent > 0 ? Math.round((budgetStats.approved / budgetStats.sent) * 100) : 0}%
                    </span>
                 </div>
              </div>
           </div>
        </section>

        {/* ROW 5: COLLABORATION */}
        {/* 9. Equipe */}
        <section className="col-span-12 bg-card p-6 rounded-2xl border border-border mt-4 mb-20">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2.5">
               <UserPlus className="w-5 h-5 text-foreground" />
               <h2 className="font-semibold text-lg text-foreground truncate">{orgName || (isPt ? 'Equipe' : 'Team')}</h2>
             </div>
             <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide bg-background border border-border px-2 py-1 rounded-md">{teamStats.total} {isPt ? 'membros' : 'members'}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {teamStats.members.slice(0, 10).map((m: any, i: number) => {
               const profile = m.profile;
               const name = profile?.name || 'Membro';
               const role = m.role === 'admin' ? 'Admin' : 'Member';
               return (
                 <div key={m.id || i} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl transition-colors border border-transparent hover:bg-muted/40 hover:border-border/60 dark:hover:bg-white dark:hover:border-white/50" onClick={() => navigate('/dashboard/team')}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                      {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground/90 group-hover:text-primary dark:group-hover:text-black transition-colors truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium dark:group-hover:text-black/70 transition-colors">{role}</span>
                    </div>
                 </div>
               );
            })}
          </div>
          {teamStats.members.length > 10 && (
            <button onClick={() => navigate('/dashboard/team')} className="text-xs font-semibold text-primary hover:text-primary/80 mt-6 w-full text-center py-2 transition-colors border-t border-border/60">
              {isPt ? 'Ver equipe completa' : 'View full team'}
            </button>
          )}
        </section>

      </div>
    </div>
  );
};

const MiniBarChart = ({ data }: { data: { label: string; minutes: number; hours: number; isToday: boolean }[] }) => {
  const maxMin = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="flex items-end justify-between h-20 w-full mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full relative flex items-end justify-center" style={{ height: '54px' }}>
            <div
              className={`w-full max-w-[14px] rounded-lg transition-all duration-300 ${d.isToday ? 'bg-primary' : 'bg-muted-foreground/20 hover:bg-primary/40'}`}
              style={{ height: `${Math.max((d.minutes / maxMin) * 54, d.minutes > 0 ? 6 : 4)}px` }}
              title={`${d.hours}h`}
            />
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${d.isToday ? 'text-primary' : 'text-muted-foreground/70'}`}>
            {d.label.charAt(0)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProjectFolderCard = ({
  title,
  topMeta,
  bottomMeta,
  solidCol,
  titleClassName,
  metaClassName,
  onClick,
}: {
  title: string;
  topMeta: string;
  bottomMeta?: string;
  solidCol: string;
  titleClassName: string;
  metaClassName: string;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-[637.6/480] w-full max-w-[96%] cursor-pointer text-left transition-all hover:-translate-y-0.5"
    >
      <svg
        viewBox="0 0 637.6 480"
        preserveAspectRatio="xMinYMin meet"
        aria-hidden="true"
        className="absolute inset-y-0 left-0 h-full w-[calc(100%+1px)] max-w-none"
      >
        <path
          d="M594.6 466.6H43C19.5 466.6.5 447.6.5 424.1V43C.5 19.5 19.5.5 43 .5h164.1c15.3 0 29.8 3 47.2 22.9 20.2 23.2 35.8 21.5 48 21.5h292.3c23.5 0 42.5 19 42.5 42.5v336.6c0 23.5-19 42.5-42.5 42.5Z"
          fill="hsl(var(--muted) / 0.65)"
        />
        <path
          d="M594.6 466.6H43C19.5 466.6.5 447.6.5 424.1V43C.5 19.5 19.5.5 43 .5h164.1c15.3 0 29.8 3 47.2 22.9 20.2 23.2 35.8 21.5 48 21.5h292.3c23.5 0 42.5 19 42.5 42.5v336.6c0 23.5-19 42.5-42.5 42.5Z"
          fill={solidCol}
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ filter: 'brightness(0.9)' }}
        />
        <rect
          x=".5"
          y="106.4"
          width="636.6"
          height="360.1"
          rx="42.5"
          ry="42.5"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          className="transition-opacity duration-300 group-hover:opacity-0"
        />
        <rect
          x=".5"
          y="106.4"
          width="636.6"
          height="360.1"
          rx="42.5"
          ry="42.5"
          fill={solidCol}
          stroke={solidCol}
          strokeWidth="1.5"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </svg>

      <div className="absolute left-[11%] top-[41%] w-[70%] flex flex-col gap-1.5">
        <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${metaClassName}`}>{topMeta}</div>
        <div className={`max-w-[78%] text-[16px] leading-[1.08] font-black ${titleClassName}`}>{title}</div>
        {bottomMeta ? <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${metaClassName}`}>{bottomMeta}</div> : null}
      </div>
    </button>
  );
};

type HomeCalendarEvent =
  | { id: string; kind: 'task'; date: string; title: string; status: string; priority?: string | null }
  | { id: string; kind: 'invoice'; date: string; title: string; status: string; amount: number }
  | { id: string; kind: 'expense'; date: string; title: string; status: string; amount: number };

const TaskCalendarCard = ({
  tasks,
  invoices,
  expenses,
  isPt,
  navigate,
  headerOutside = false,
}: {
  tasks: any[];
  invoices: any[];
  expenses: any[];
  isPt: boolean;
  navigate: (path: string, options?: any) => void;
  headerOutside?: boolean;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsByDate = useMemo(() => {
    const map: Record<string, HomeCalendarEvent[]> = {};

    tasks.forEach(task => {
      const dateStr = task.due_date;
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({
        id: task.id,
        kind: 'task',
        date: dateStr,
        title: task.title,
        status: task.status,
        priority: task.priority,
      });
    });

    invoices.forEach(invoice => {
      const dateStr = invoice.due_date;
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({
        id: invoice.id,
        kind: 'invoice',
        date: dateStr,
        title: invoice.name || (isPt ? 'Recebimento sem nome' : 'Untitled receivable'),
        status: invoice.status,
        amount: Number(invoice.total) || 0,
      });
    });

    expenses.forEach(expense => {
      const dateStr = expense.due_date;
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({
        id: expense.id,
        kind: 'expense',
        date: dateStr,
        title: expense.description || (isPt ? 'Despesa sem nome' : 'Untitled expense'),
        status: expense.status,
        amount: Number(expense.amount) || 0,
      });
    });

    return map;
  }, [tasks, invoices, expenses, isPt]);

  const eventCountsByDate = useMemo(() => {
    const map: Record<string, { tasks: number; receivables: number; payables: number }> = {};

    Object.entries(eventsByDate).forEach(([dateStr, events]) => {
      map[dateStr] = events.reduce(
        (acc, event) => {
          if (event.kind === 'task') acc.tasks += 1;
          if (event.kind === 'invoice') acc.receivables += 1;
          if (event.kind === 'expense') acc.payables += 1;
          return acc;
        },
        { tasks: 0, receivables: 0, payables: 0 }
      );
    });

    return map;
  }, [eventsByDate]);

  const startDay = getDay(monthStart);
  const leadingBlanks = startDay === 0 ? 6 : startDay - 1;

  const weekDays = isPt
    ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const priorityColor: Record<string, string> = {
    high: 'bg-destructive',
    medium: 'bg-primary',
    low: 'bg-muted-foreground/40',
  };

  const selectedEvents = eventsByDate[selectedDay] || [];
  const selectedTaskCount = selectedEvents.filter(event => event.kind === 'task').length;
  const selectedReceivableCount = selectedEvents.filter(event => event.kind === 'invoice').length;
  const selectedPayableCount = selectedEvents.filter(event => event.kind === 'expense').length;
  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: isPt ? 'BRL' : 'USD' }).format(value);

  const selectedSummary = !isPt
    ? `${selectedEvents.length} ${selectedEvents.length === 1 ? 'event' : 'events'}`
    : [
        selectedTaskCount > 0 ? `${selectedTaskCount} ${selectedTaskCount === 1 ? 'tarefa' : 'tarefas'}` : null,
        selectedReceivableCount > 0 ? `${selectedReceivableCount} a receber` : null,
        selectedPayableCount > 0 ? `${selectedPayableCount} a pagar` : null,
      ].filter(Boolean).join(' • ') || '0 eventos';

  const handleEventClick = (event: HomeCalendarEvent) => {
    if (event.kind === 'task') {
      navigate('/dashboard/kanban', { state: { taskId: event.id } });
      return;
    }

    navigate('/dashboard/finance');
  };

  const renderEventRow = (event: HomeCalendarEvent, compact = false) => {
    const markerClassName =
      event.kind === 'task'
        ? priorityColor[event.priority || ''] || 'bg-primary'
        : event.kind === 'invoice'
          ? 'bg-primary'
          : 'bg-destructive';

    const subtitle =
      event.kind === 'task'
        ? event.status === 'done'
          ? (isPt ? 'Concluída' : 'Done')
          : event.status === 'in_progress'
            ? (isPt ? 'Em andamento' : 'In progress')
            : (isPt ? 'Pendente' : 'Pending')
        : event.kind === 'invoice'
          ? `${isPt ? 'A receber' : 'Receivable'} • ${fmtCurrency(event.amount)}`
          : `${isPt ? 'A pagar' : 'Payable'} • ${fmtCurrency(event.amount)}`;

    return (
      <button
        key={`${event.kind}-${event.id}`}
        onClick={() => handleEventClick(event)}
        className={`w-full flex items-start gap-3 text-left transition-colors ${
          compact
            ? 'rounded-xl bg-background hover:bg-muted/50 p-3 border border-border'
            : 'py-3 hover:bg-transparent first:pt-0 border-b border-border/60 last:border-b-0'
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground/90 block truncate">{event.title}</span>
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        </div>
        {event.kind === 'task' && event.status === 'done' && (
          <span className="ml-auto text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 p-1 rounded shrink-0">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {headerOutside && (
        <div className="mb-6 flex w-full flex-col gap-6 xl:flex-row">
          <div className="min-w-0 flex items-center justify-between gap-4 xl:w-[348px] xl:flex-none">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-foreground" />
              <h2 className="font-semibold text-lg text-foreground leading-none">{isPt ? 'Calendário' : 'Calendar'}</h2>
            </div>
            <div className="flex items-center gap-0.5 bg-background border border-border rounded-[8px] p-0.5">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-6 h-6 rounded-[6px] hover:bg-muted flex items-center justify-center text-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { const today = new Date(); setCurrentMonth(today); setSelectedDay(format(today, 'yyyy-MM-dd')); }} className="h-6 text-[10px] font-bold px-2 rounded-[6px] hover:bg-muted text-foreground hover:text-foreground transition-colors uppercase min-w-[72px] flex items-center justify-center">
                {format(currentMonth, 'MMMM', { locale: isPt ? ptBR : enUS })}
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-6 h-6 rounded-[6px] hover:bg-muted flex items-center justify-center text-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="hidden xl:block xl:flex-1" />
        </div>
      )}

      <div className={`flex h-full w-full flex-col gap-6 xl:flex-row ${headerOutside ? 'rounded-2xl border border-border bg-card p-6' : ''}`}>
      <div className="min-w-0 xl:w-[300px] xl:flex-none">
        {!headerOutside && (
        <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-foreground" />
                <h2 className="font-semibold text-lg text-foreground leading-none">{isPt ? 'Calendário' : 'Calendar'}</h2>
              </div>
              <div className="flex items-center gap-1 bg-background border border-border rounded-[8px] p-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-6 h-6 rounded-[6px] hover:bg-muted flex items-center justify-center text-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { const today = new Date(); setCurrentMonth(today); setSelectedDay(format(today, 'yyyy-MM-dd')); }} className="h-6 text-[10px] font-bold px-2 rounded-[6px] hover:bg-muted text-foreground hover:text-foreground transition-colors uppercase min-w-[92px] flex items-center justify-center">
                  {format(currentMonth, 'MMMM', { locale: isPt ? ptBR : enUS })}
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-6 h-6 rounded-[6px] hover:bg-muted flex items-center justify-center text-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
        </div>
        )}

        <div className="grid grid-cols-7 gap-x-1.5 gap-y-2">
          {weekDays.map(d => (
            <div key={d} className="py-1.5 text-center text-[10px] font-bold text-muted-foreground/60">{d.charAt(0)}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-x-1.5 gap-y-2">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="h-10" />
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const counts = eventCountsByDate[dateStr] || { tasks: 0, receivables: 0, payables: 0 };
            const today = isToday(day);
            const isSelected = selectedDay === dateStr;

            return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`relative flex h-10 w-full flex-col items-center justify-center rounded-[9px] transition-all duration-200
                    ${today ? 'bg-primary text-primary-foreground font-bold dark:bg-white dark:text-black' : 'hover:bg-muted/40 text-foreground bg-transparent border border-transparent hover:border-border/60'}
                    ${isSelected && !today ? 'bg-primary/5 ring-1 ring-primary/30 border-primary/20' : ''}
                  `}
                >
                <span className={`text-xs leading-none ${today ? 'font-bold' : 'font-semibold'}`}>{format(day, 'd')}</span>
                {(counts.tasks > 0 || counts.receivables > 0 || counts.payables > 0) && (
                  <div className="mt-1 flex gap-0.5">
                    {counts.tasks > 0 && <span className={`h-1 w-1 rounded-full ${today ? 'bg-primary-foreground/80 dark:bg-black/70' : 'bg-foreground/70'}`} />}
                    {counts.receivables > 0 && <span className={`h-1 w-1 rounded-full ${today ? 'bg-primary-foreground/80 dark:bg-black/70' : 'bg-primary'}`} />}
                    {counts.payables > 0 && <span className={`h-1 w-1 rounded-full ${today ? 'bg-primary-foreground/80 dark:bg-black/70' : 'bg-destructive'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/80 animate-fade-in fill-mode-forwards xl:hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
            {format(parseISO(selectedDay), isPt ? "dd 'de' MMMM" : 'MMMM dd', { locale: isPt ? ptBR : enUS })}
            {' • '}{selectedSummary}
          </span>
          <div className="space-y-2 max-h-[180px] overflow-y-auto minimal-scrollbar pr-1 -mr-1">
            {selectedEvents.map(event => renderEventRow(event, true))}
          </div>
        </div>
      )}

      <div className="min-w-0 xl:flex-1 xl:border-l xl:border-border/80 xl:pl-6">
        <div className="h-full flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
            {format(parseISO(selectedDay), isPt ? "dd 'de' MMMM" : 'MMMM dd', { locale: isPt ? ptBR : enUS })}
            {' • '}{selectedSummary}
          </span>
            <div className="overflow-y-auto minimal-scrollbar pr-1 -mr-1 flex-1">
            {selectedEvents.length > 0 ? selectedEvents.map(event => renderEventRow(event)) : (
              <div className="h-full min-h-[220px] flex items-center justify-center p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isPt ? 'Nenhum evento agendado para este dia.' : 'No events scheduled for this day.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
export default HomePage;


