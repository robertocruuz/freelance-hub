import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, AlertCircle, DollarSign, CalendarDays, ChevronLeft, ChevronRight, Wallet, UserPlus, Target, TrendingUp, Bell, BellOff, Check, CheckCheck, Trash2, Info, ListTodo } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, parseISO, differenceInMinutes, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

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
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').order('start_time', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('organization_members').select('id, user_id, role, status, organization_id').eq('status', 'accepted'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);

      // Fetch profiles for org members
      const memberUserIds = (orgMembers.data || []).map((m: any) => m.user_id);
      let memberProfiles: any[] = [];
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar_url').in('user_id', memberUserIds);
        memberProfiles = profiles || [];
      }

      // Fetch org name
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
      t.status !== 'done' && 
      (t.user_id === user?.id || (t.assigned_to && t.assigned_to.includes(user?.id)))
    ).sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [data.tasks, user]);

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

  const invoiceStats = useMemo(() => {
    const pending = data.invoices.filter(i => i.status === 'pending');
    const paid = data.invoices.filter(i => i.status === 'paid');
    const overdue = data.invoices.filter(i => i.status === 'overdue');
    return { pending: pending.length, paid: paid.length, overdue: overdue.length, totalPending: pending.reduce((s, i) => s + (Number(i.total) || 0), 0), totalPaid: paid.reduce((s, i) => s + (Number(i.total) || 0), 0) };
  }, [data.invoices]);

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
    const pendingExpenses = data.expenses.filter(e => e.status === 'pending').length;
    const overdueExpenses = data.expenses.filter(e => e.due_date && new Date(e.due_date) < now && e.status === 'pending').length;
    return { totalReceivable, totalPayable, totalReceived, totalPaid, balance, pendingExpenses, overdueExpenses };
  }, [data.invoices, data.expenses]);

  const teamStats = useMemo(() => {
    const members = data.orgMembers;
    return { total: members.length, members };
  }, [data.orgMembers]);

  const leadStats = useMemo(() => {
    const open = data.leads.filter(l => l.status === 'open');
    const won = data.leads.filter(l => l.status === 'won');
    const lost = data.leads.filter(l => l.status === 'lost');
    const totalValue = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const wonValue = won.reduce((s, l) => s + (Number(l.value) || 0), 0);
    return { total: data.leads.length, open: open.length, won: won.length, lost: lost.length, totalValue, wonValue };
  }, [data.leads]);

  const fmtTime = (min: number) => `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, '0')}m`;
  const fmtCurrency = (v: number) => new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: isPt ? 'BRL' : 'USD' }).format(v);

  const cardBase = "group rounded-[1.25rem] border border-border bg-card text-left transition-all duration-300 ease-out shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col h-full overflow-hidden animate-fade-in opacity-0 fill-mode-forwards";
  const cardHeader = "flex items-center justify-between pt-5 px-5 pb-2";
  const clickableItem = "cursor-pointer rounded-lg transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]";

  // Stagger animation delays for cards
  const stagger = (i: number) => ({ animationDelay: `${i * 80}ms` });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        <div className="h-10 bg-muted rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto relative z-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
          {isPt ? `Olá, ${firstName || 'Usuário'}` : `Hello, ${firstName || 'User'}`} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isPt ? format(now, "EEEE, dd 'de' MMMM", { locale: ptBR }) : format(now, 'EEEE, MMMM dd')}
        </p>
      </div>

      {/* Bento Grid Redesign - ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-[minmax(0,1fr)]">
        {/* 1. Tarefas Stats */}
        <div className={cardBase} style={stagger(0)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/kanban')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <SquareKanban className="w-4 h-4 text-orange-500" />
              </div>
              <span className="font-semibold text-sm text-foreground">{isPt ? 'Tarefas' : 'Tasks'}</span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between">
            <div className="mb-2">
              <span className="text-[11px] text-muted-foreground font-medium mb-1 block">{isPt ? 'Total de tarefas' : 'Total tasks'}</span>
              <span className="text-2xl font-bold tracking-tight text-foreground">{taskStats.total}</span>
            </div>
            
            <div className="space-y-1.5 mt-auto">
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'A fazer' : 'To do'}</span></div>
                <span className="text-xs font-bold text-foreground">{taskStats.todo}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Fazendo' : 'Doing'}</span></div>
                <span className="text-xs font-bold text-foreground">{taskStats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Concluídas' : 'Done'}</span></div>
                <span className="text-xs font-bold text-foreground">{taskStats.done}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-destructive"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Atrasadas' : 'Overdue'}</span></div>
                <span className={`text-xs font-bold ${taskStats.overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>{taskStats.overdue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Calendário */}
        <div className={cardBase} style={stagger(1)}>
          <div className="flex-1 p-3">
            <TaskCalendarCard tasks={data.tasks} isPt={isPt} navigate={navigate} />
          </div>
        </div>

        {/* 3. Notificações */}
        <div className={cardBase} style={stagger(2)}>
          <div className={cardHeader}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">{isPt ? 'Notificações' : 'Notifications'}</h3>
                {data.notifications.filter(n => !n.read).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {data.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
            </div>
            {/* Quick Actions (Mark all read) */}
            {data.notifications.filter(n => !n.read).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="h-6 px-2 rounded flex items-center gap-1 text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors ml-auto"
              >
                <CheckCheck className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-muted/5">
            <div className="flex-1 overflow-y-auto minimal-scrollbar p-1 max-h-[220px]">
              {data.notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-6">
                  <BellOff className="w-5 h-5 text-muted-foreground mb-1.5" />
                  <span className="text-xs text-muted-foreground">{isPt ? 'Nenhuma notificação' : 'No notifications'}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative flex items-start gap-2.5 p-2.5 rounded-lg transition-all duration-200 cursor-pointer border border-transparent
                        ${!n.read ? 'bg-primary/[0.04] hover:bg-primary/[0.08] border-primary/10' : 'bg-transparent hover:bg-muted/40'}
                      `}
                      onClick={() => { 
                        if (!n.read) markAsRead(n.id);
                        if (n.link) window.location.href = n.link; 
                      }}
                    >
                      {!n.read && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      <div className="min-w-0 flex-1 pl-1">
                         <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>{n.title}</p>
                         <span className="block text-[9px] text-muted-foreground/60 mt-1 font-medium">
                           {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: isPt ? ptBR : enUS })}
                         </span>
                      </div>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.read && <button onClick={(e) => markAsRead(n.id, e)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10"><Check className="w-3 h-3" /></button>}
                        <button onClick={(e) => deleteNotification(n.id, e)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {data.notifications.length > 0 && (
              <div className="shrink-0 p-2 border-t border-border/40 bg-card">
                <button onClick={deleteAllNotifications} className="w-full h-7 rounded text-[10px] font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3 h-3" />
                  {isPt ? 'Limpar todas' : 'Clear all'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Financeiro */}
        {isAdminUser ? (
          <div className={cardBase} style={stagger(3)}>
            <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/finance')}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-semibold text-sm text-foreground">{isPt ? 'Financeiro' : 'Finance'}</span>
              </div>
            </div>
            <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium mb-1 block">{isPt ? 'Saldo Atual' : 'Current Balance'}</span>
                <div className={`text-3xl font-bold tracking-tight ${financeStats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {fmtCurrency(financeStats.balance)}
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/10 bg-primary/5">
                  <span className="text-xs text-primary/70 font-medium">{isPt ? 'A receber' : 'Receivable'}</span>
                  <span className="text-sm font-bold text-primary">{fmtCurrency(financeStats.totalReceivable)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/10 bg-destructive/5">
                  <span className="text-xs text-destructive/70 font-medium">{isPt ? 'A pagar' : 'Payable'}</span>
                  <span className="text-sm font-bold text-destructive">{fmtCurrency(financeStats.totalPayable)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${cardBase} flex items-center justify-center bg-muted/5 opacity-50`}>
             <p className="text-xs text-muted-foreground font-medium flex items-center gap-2"><Wallet className="w-4 h-4" /> {isPt ? 'Módulo Financeiro' : 'Finance Module'}</p>
          </div>
        )}
      </div>

      {/* ROW 2: Leads, Clientes, Orçamentos, Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-[minmax(0,1fr)]">
        {/* 5. Leads */}
        <div className={cardBase} style={stagger(4)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/leads')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-rose-500" />
              </div>
              <span className="font-semibold text-sm text-foreground">Leads</span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between">
            {leadStats.total > 0 ? (
              <>
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium mb-1 block">{isPt ? 'Valor Estimado (Abertos)' : 'Estimated Value (Open)'}</span>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {fmtCurrency(leadStats.totalValue)}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Abertos' : 'Open'}</span></div>
                    <span className="text-xs font-bold text-foreground">{leadStats.open}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Ganhos' : 'Won'}</span></div>
                    <span className="text-xs font-bold text-foreground">{leadStats.won}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-destructive"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Perdidos' : 'Lost'}</span></div>
                    <span className="text-xs font-bold text-foreground">{leadStats.lost}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                <Target className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">{isPt ? 'Nenhum lead' : 'No leads'}</span>
              </div>
            )}
          </div>
        </div>

        {/* 6. Clientes */}
        <div className={cardBase} style={stagger(5)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/clients')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">{isPt ? 'Clientes' : 'Clients'}</span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col">
            <div className="mb-4">
              <span className="text-3xl font-bold tracking-tight text-foreground">{data.clients.length}</span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{isPt ? 'Clientes cadastrados' : 'Registered clients'}</p>
            </div>
            
            <div className="flex-1 mt-auto space-y-1.5 align-bottom">
              {data.clients.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/clients')}>
                   <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}>
                     {c.name?.charAt(0).toUpperCase()}
                   </div>
                   <span className="text-xs text-foreground font-medium truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Orçamentos */}
        <div className={cardBase} style={stagger(6)}>
           <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/budgets')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <span className="font-semibold text-sm text-foreground">{isPt ? 'Orçamentos' : 'Budgets'}</span>
            </div>
           </div>
           <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between">
              <div>
                 <span className="text-3xl font-bold tracking-tight text-foreground">{budgetStats.total}</span>
                 <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{fmtCurrency(budgetStats.totalValue)} {isPt ? 'gerados' : 'generated'}</p>
              </div>

              <div className="space-y-2 mt-4">
                 <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Rascunhos' : 'Draft'}</span></div>
                    <span className="text-xs font-bold text-foreground">{budgetStats.draft}</span>
                 </div>
                 <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Enviados' : 'Sent'}</span></div>
                    <span className="text-xs font-bold text-foreground">{budgetStats.sent}</span>
                 </div>
                 <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-xs text-muted-foreground font-medium">{isPt ? 'Aprovados' : 'Approved'}</span></div>
                    <span className="text-xs font-bold text-foreground">{budgetStats.approved}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* 8. Projetos */}
        <div className={cardBase} style={stagger(7)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/projects')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-purple-500" />
              </div>
              <span className="font-semibold text-sm text-foreground">{isPt ? 'Projetos' : 'Projects'}</span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col">
            <div className="mb-4">
              <span className="text-3xl font-bold tracking-tight text-foreground">{data.projects.length}</span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{isPt ? 'Projetos ativos' : 'Active projects'}</p>
            </div>
            
            <div className="flex-1 mt-auto space-y-1.5">
              {data.projects.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/dashboard/projects')}>
                   <span className="text-[11px] font-medium text-foreground truncate">{p.name}</span>
                   {p.due_date && <span className="text-[9px] text-muted-foreground ml-2 shrink-0">{format(parseISO(p.due_date), 'dd/MM')}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: Minhas Tarefas, Time Tracking, Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-[minmax(0,1fr)]">
        {/* 9. Minhas Tarefas */}
        <div className={cardBase} style={stagger(8)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/kanban')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">{isPt ? 'Minhas Tarefas' : 'My Tasks'}</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground font-medium">{myTasks.length} {isPt ? 'pendentes' : 'pending'}</div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto minimal-scrollbar max-h-[300px]">
             {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-8">
                   <ListTodo className="w-5 h-5 text-muted-foreground mb-1.5" />
                   <span className="text-xs text-muted-foreground">{isPt ? 'Tudo limpo!' : 'All clear!'}</span>
                </div>
             ) : (
                <div className="space-y-1">
                   {myTasks.slice(0, 8).map(t => {
                     const priorityColor: Record<string, string> = { high: 'bg-destructive', medium: 'bg-primary', low: 'bg-muted-foreground/40' };
                     return (
                      <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/kanban')}>
                         <span className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 shadow-sm ${priorityColor[t.priority] || 'bg-primary'}`} />
                         <div className="min-w-0 flex-1">
                           <p className="text-xs font-semibold text-foreground/90 truncate leading-tight">{t.title}</p>
                           {t.due_date && <p className={`text-[9px] mt-1 font-medium ${new Date(t.due_date) < now && t.status !== 'done' ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{format(parseISO(t.due_date), 'dd/MM/yyyy')}</p>}
                         </div>
                      </div>
                     );
                   })}
                </div>
             )}
          </div>
        </div>

        {/* 10. Time Tracking */}
        <div className={cardBase} style={stagger(9)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/time')}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="flex items-center gap-2">
                 <span className="font-semibold text-sm text-foreground">Time Tracking</span>
                 {timeStats.activeTimer && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between bg-gradient-to-b from-transparent to-muted/5">
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-lg border border-border/40 bg-card">
                   <span className="text-[10px] text-muted-foreground font-medium mb-1 block uppercase tracking-wide">{isPt ? 'Hoje' : 'Today'}</span>
                   <div className="text-2xl font-bold tracking-tight text-foreground">{fmtTime(timeStats.todayMin)}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-card">
                   <span className="text-[10px] text-muted-foreground font-medium mb-1 block uppercase tracking-wide">{isPt ? 'Semana' : 'Week'}</span>
                   <div className="text-2xl font-bold tracking-tight text-foreground">{fmtTime(timeStats.weekMin)}</div>
                </div>
             </div>
             
             <div className="mt-auto pt-2">
                <MiniBarChart data={timeStats.last7} />
             </div>
          </div>
        </div>

        {/* 11. Equipe */}
        <div className={cardBase} style={stagger(10)}>
          <div className={`${cardHeader} cursor-pointer hover:bg-muted/20`} onClick={() => navigate('/dashboard/team')}>
             <div className="flex items-center gap-2.5">
               <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                 <UserPlus className="w-4 h-4 text-violet-500" />
               </div>
               <span className="font-semibold text-sm text-foreground">{orgName || (isPt ? 'Equipe' : 'Team')}</span>
             </div>
             <div className="px-2 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground font-medium">{teamStats.total} {isPt ? 'membros' : 'members'}</div>
          </div>
          <div className="px-5 pb-5 pt-2 flex-1 flex flex-col">
             <div className="space-y-3">
                {teamStats.members.slice(0, 5).map((m: any, i: number) => {
                   const profile = m.profile;
                   const name = profile?.name || 'Membro';
                   const role = m.role === 'admin' ? 'Admin' : 'Member';
                   return (
                     <div key={m.id || i} className="flex items-center justify-between cursor-pointer hover:bg-muted/40 p-1.5 -mx-1.5 rounded-lg transition-colors" onClick={() => navigate('/dashboard/team')}>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shadow-sm border border-primary/20">
                             {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[11px] font-semibold text-foreground/90">{name}</span>
                             <span className="text-[9px] text-muted-foreground font-medium mt-0.5">{role}</span>
                           </div>
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ value, label, dotColor }: { value: number; label: string; dotColor: string }) => (
  <div className="rounded-xl bg-muted/50 p-3 text-center">
    <div className="flex items-center justify-center gap-1.5 mb-1">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-xl font-extrabold text-foreground">{value}</span>
    </div>
    <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
  </div>
);

const StatusRow = ({ label, count, dotColor }: { label: string; count: number; dotColor: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-sm font-bold text-foreground">{count}</span>
  </div>
);

const MiniBarChart = ({ data }: { data: { label: string; minutes: number; hours: number; isToday: boolean }[] }) => {
  const maxMin = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative flex items-end justify-center" style={{ height: '44px' }}>
            <div
              className={`w-full rounded-md transition-all duration-300 ${d.isToday ? 'bg-cyan-500' : 'bg-cyan-500/30'}`}
              style={{ height: `${Math.max((d.minutes / maxMin) * 44, d.minutes > 0 ? 4 : 2)}px` }}
              title={`${d.hours}h`}
            />
          </div>
          <span className={`text-[9px] font-medium ${d.isToday ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const TaskCalendarCard = ({ tasks, isPt, navigate }: { tasks: any[]; isPt: boolean; navigate: (path: string) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    tasks.forEach(task => {
      const dateStr = task.due_date;
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(task);
    });
    return map;
  }, [tasks]);

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

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedTasks = selectedDay ? tasksByDate[selectedDay] || [] : [];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <span className="font-bold text-foreground text-xs">{isPt ? 'Calendário' : 'Calendar'}</span>
            <p className="text-[9px] text-muted-foreground capitalize leading-none mt-0.5">
              {format(currentMonth, 'MMMM yyyy', { locale: isPt ? ptBR : enUS })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-5 h-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="text-[9px] font-semibold px-1 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {isPt ? 'Hoje' : 'Today'}
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-5 h-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[8px] font-semibold text-muted-foreground/50 py-0.5">{d.charAt(0)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-7" />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateStr] || [];
          const today = isToday(day);
          const isSelected = selectedDay === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              className={`h-7 rounded-full flex flex-col items-center justify-center relative transition-all
                ${today ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted text-foreground'}
                ${isSelected && !today ? 'bg-primary/10 ring-1 ring-primary' : ''}
              `}
            >
              <span className={`text-[10px] leading-none ${today ? 'font-bold' : 'font-medium'}`}>{format(day, 'd')}</span>
              {dayTasks.length > 0 && (
                <div className="flex gap-[2px] mt-[1px]">
                  {dayTasks.slice(0, 2).map((task, i) => (
                    <span key={i} className={`w-1 h-1 rounded-full ${today ? 'bg-primary-foreground/70' : (priorityColor[task.priority] || 'bg-primary')}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <span className="text-[10px] font-semibold text-muted-foreground mb-1 block">
            {format(parseISO(selectedDay), isPt ? "dd 'de' MMMM" : 'MMMM dd', { locale: isPt ? ptBR : enUS })}
            {' · '}{selectedTasks.length} {isPt ? (selectedTasks.length === 1 ? 'tarefa' : 'tarefas') : (selectedTasks.length === 1 ? 'task' : 'tasks')}
          </span>
          {selectedTasks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/60">{isPt ? 'Nenhuma tarefa neste dia' : 'No tasks on this day'}</p>
          ) : (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {selectedTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => navigate('/dashboard/kanban')}
                  className="w-full flex items-center gap-2 rounded bg-muted/50 hover:bg-muted px-2 py-1 transition-colors text-left"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColor[task.priority] || 'bg-primary'}`} />
                  <span className="text-[10px] font-medium text-foreground truncate">{task.title}</span>
                  {task.status === 'done' && (
                    <span className="ml-auto text-[9px] font-semibold text-green-600 dark:text-green-400 shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
