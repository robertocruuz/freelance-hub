import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, AlertCircle, DollarSign, CalendarDays, ChevronLeft, ChevronRight, Wallet, UserPlus, Target, TrendingUp, Bell, BellOff, Check, CheckCheck, Trash2, Info, ListTodo, MoreHorizontal, ArrowUpRight } from 'lucide-react';
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
    return { totalReceivable, totalPayable, totalReceived, totalPaid, balance };
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
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-8 animate-pulse">
        <div className="h-12 bg-muted/50 rounded-xl w-64" />
        <div className="h-20 bg-muted/40 rounded-2xl w-full" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
           <div className="xl:col-span-8 flex flex-col gap-8"><div className="h-64 bg-muted/30 rounded-2xl" /><div className="h-80 bg-muted/30 rounded-2xl" /></div>
           <div className="xl:col-span-4 flex flex-col gap-8"><div className="h-96 bg-muted/30 rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
      {/* 1. Dashboard Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/40">
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

      {/* 2. Main Layout 8/4 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
        {/* === Left Column (Activities & Rich Metrics) === */}
        <div className="xl:col-span-8 flex flex-col gap-10">
          
          {/* A. Business Overview Panels */}
          <section className="col-span-1 md:col-span-3">
             <div className="flex items-center gap-2.5 mb-5">
               <TrendingUp className="w-5 h-5 text-primary" />
               <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Visão de Negócios' : 'Business Insights'}</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Finance Panel */}
                {isAdminUser && (
                  <div className="flex flex-col p-6 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/80 transition-shadow hover:shadow-md cursor-pointer" onClick={() => navigate('/dashboard/finance')}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><Wallet className="w-4 h-4 text-emerald-500" /></div>
                      <h3 className="font-semibold text-sm text-foreground">{isPt ? 'Financeiro' : 'Finance'}</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="flex flex-col gap-1.5">
                         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground font-medium">{isPt ? 'A receber' : 'Receivable'}</span><span className="font-bold text-emerald-500">{fmtCurrency(financeStats.totalReceivable)}</span></div>
                         <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width: financeStats.totalReceivable > 0 ? '70%' : '0%'}}></div></div>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground font-medium">{isPt ? 'A pagar' : 'Payable'}</span><span className="font-bold text-destructive">{fmtCurrency(financeStats.totalPayable)}</span></div>
                         <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden"><div className="h-full bg-destructive rounded-full transition-all" style={{width: financeStats.totalPayable > 0 ? '40%' : '0%'}}></div></div>
                       </div>
                    </div>
                  </div>
                )}
                
                {/* Leads Panel */}
                <div className="flex flex-col p-6 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/80 transition-shadow hover:shadow-md cursor-pointer" onClick={() => navigate('/dashboard/leads')}>
                   <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center"><Target className="w-4 h-4 text-rose-500" /></div>
                     <h3 className="font-semibold text-sm text-foreground">Leads</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col">
                         <span className="text-2xl font-black text-foreground">{leadStats.won}</span>
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Ganhos' : 'Won'}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-2xl font-black text-foreground">{leadStats.lost}</span>
                         <span className="text-[10px] uppercase font-bold text-muted-foreground">{isPt ? 'Perdidos' : 'Lost'}</span>
                      </div>
                   </div>
                   <div className="mt-auto pt-3 border-t border-border/40 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">{isPt ? 'Em aberto' : 'Open'}</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-muted/50">{leadStats.open}</span>
                   </div>
                </div>

                {/* Budgets Panel */}
                <div className="flex flex-col p-6 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/80 transition-shadow hover:shadow-md cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>
                   <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center"><FileText className="w-4 h-4 text-amber-500" /></div>
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
                   <div className="mt-auto pt-3 border-t border-border/40 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Conversão</span>
                      <span className="font-bold text-amber-500">
                        {budgetStats.sent > 0 ? Math.round((budgetStats.approved / budgetStats.sent) * 100) : 0}%
                      </span>
                   </div>
                </div>
             </div>
          </section>

          {/* B. Actionable Row: My Tasks & Time Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* My Tasks */}
             <section className="flex flex-col h-full">
               <div className="flex items-center justify-between mb-5">
                 <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                     <ListTodo className="w-4 h-4 text-primary" />
                   </div>
                   <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Minhas Tarefas' : 'My Tasks'}</h2>
                 </div>
                 <button onClick={() => navigate('/dashboard/kanban')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                    {isPt ? 'Ver todas' : 'View all'} <ArrowUpRight className="w-3 h-3" />
                 </button>
               </div>
               <div className="flex flex-col bg-card/30 border border-border/50 rounded-2xl flex-1 justify-between p-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                  {myTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 text-center opacity-60 m-auto">
                       <CheckCheck className="w-6 h-6 text-emerald-500 mb-3" />
                       <span className="text-sm font-medium text-muted-foreground">{isPt ? 'Tudo limpo! Nenhuma tarefa pendente.' : 'All clear! No pending tasks.'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {myTasks.slice(0, 5).map(t => {
                         const project = data.projects.find(p => p.id === t.project_id);
                         const client = project ? data.clients.find(c => c.id === project.client_id) : null;
                         const itemColor = client?.color || project?.color || 'hsl(var(--primary))';
                         const isLate = t.due_date && new Date(t.due_date) < now && t.status !== 'done';
                         const solidCol = itemColor.startsWith('#') ? itemColor : 'hsl(var(--primary))';
                         return (
                          <div 
                            key={t.id} 
                            className="group flex items-center gap-3 p-3.5 border-b border-border/30 last:border-0 cursor-pointer rounded-xl transition-all hover:-translate-y-0.5 hover:bg-[var(--hover-bg)] hover:border-transparent hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]" 
                            style={{ '--hover-bg': solidCol } as React.CSSProperties}
                            onClick={() => navigate('/dashboard/kanban')}
                          >
                             <div className="flex flex-col min-w-0 flex-1">
                               <p className="text-sm font-semibold text-foreground/90 truncate transition-colors group-hover:text-white">{t.title}</p>
                               {t.project_id && <span className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate transition-colors group-hover:text-white/80">{project?.name || 'Projeto'}</span>}
                             </div>
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors ${
                               isLate 
                               ? 'bg-destructive/10 text-destructive group-hover:bg-black/20 group-hover:text-white' 
                               : 'bg-background border border-border/50 text-muted-foreground group-hover:bg-black/20 group-hover:text-white group-hover:border-transparent'
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

             {/* Time Tracking Section */}
             <section className="flex flex-col h-full">
               <div className="flex items-center gap-2.5 mb-5">
                 <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                   <Clock className="w-4 h-4 text-cyan-500" />
                 </div>
                 <h2 className="font-semibold text-lg text-foreground">Time Tracking</h2>
                 {timeStats.activeTimer && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ml-2 ring-4 ring-green-500/20" />}
               </div>
               
               <div className="flex flex-col bg-card/30 border border-border/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-6 h-full justify-between gap-6 cursor-pointer hover:bg-card/60 transition-colors" onClick={() => navigate('/dashboard/time')}>
                 <div className="flex justify-between items-start">
                    <div className="flex gap-10">
                      <div>
                         <span className="text-[10px] text-muted-foreground font-bold mb-1 block uppercase tracking-wide">{isPt ? 'Hoje' : 'Today'}</span>
                         <div className="text-4xl font-black tracking-tighter text-foreground">{fmtTime(timeStats.todayMin)}</div>
                      </div>
                      <div>
                         <span className="text-[10px] text-muted-foreground font-bold mb-1 block uppercase tracking-wide">{isPt ? 'Semana' : 'Week'}</span>
                         <div className="text-xl font-bold tracking-tight text-muted-foreground mt-2">{fmtTime(timeStats.weekMin)}</div>
                      </div>
                    </div>
                    {timeStats.activeTimer && (
                      <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                        {isPt ? 'Ativo agora' : 'Active now'}
                      </div>
                    )}
                 </div>
                 <div className="w-full pt-4 border-t border-border/30">
                    <MiniBarChart data={timeStats.last7} />
                 </div>
               </div>
             </section>
          </div>

          {/* C. Operational Tracking: Projects & Clients */}
          <section className="flex flex-col mt-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
               
               {/* Latest Projects */}
               <div className="md:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                       <FolderKanban className="w-4 h-4 text-muted-foreground" />
                       <h3 className="font-semibold text-foreground">{isPt ? 'Últimos Projetos' : 'Latest Projects'}</h3>
                    </div>
                    <button onClick={() => navigate('/dashboard/projects')} className="text-xs text-muted-foreground hover:text-primary transition-colors">{isPt ? 'Ver todos' : 'View all'}</button>
                  </div>
                  <div className="flex flex-col bg-card/30 border border-border/50 rounded-2xl shadow-sm p-3">
                     <div className="flex flex-col gap-2.5">
                       {data.projects.slice(0, 5).map(p => {
                         const client = data.clients.find(c => c.id === p.client_id);
                         const projectColor = client?.color || p.color || 'hsl(var(--primary))';
                         const solidCol = projectColor.startsWith('#') ? projectColor : 'hsl(var(--primary))';
                         return (
                         <div 
                           key={p.id} 
                           className="group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-card border border-border/50 hover:bg-[var(--hover-bg)] hover:border-[var(--hover-bg)]" 
                           style={{ '--hover-bg': solidCol } as React.CSSProperties} 
                           onClick={() => navigate('/dashboard/projects')}
                         >
                            <div className="flex items-center gap-4">
                               <span className="text-sm font-bold opacity-95 transition-colors group-hover:text-white text-foreground/90">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block opacity-80 transition-colors group-hover:text-white/90 text-muted-foreground">
                                 {client?.name || ''}
                               </span>
                               {p.due_date && (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded-md opacity-95 w-14 text-center backdrop-blur-sm transition-colors group-hover:bg-black/20 group-hover:text-white group-hover:border-transparent bg-background border border-border/50 text-muted-foreground">
                                    {format(parseISO(p.due_date), 'dd/MM')}
                                  </span>
                               )}
                            </div>
                         </div>
                         );
                       })}
                       {data.projects.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground opacity-60">{isPt ? 'Nenhum projeto encontrado.' : 'No projects found.'}</div>}
                     </div>
                  </div>
               </div>

               {/* Active Clients */}
               <div className="md:col-span-5 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-muted-foreground" />
                       <h3 className="font-semibold text-foreground">{isPt ? 'Clientes Ativos' : 'Active Clients'}</h3>
                    </div>
                    <button onClick={() => navigate('/dashboard/clients')} className="text-xs text-muted-foreground hover:text-primary transition-colors">{isPt ? 'Ver todos' : 'View all'}</button>
                  </div>
                  <div className="flex flex-col bg-card/30 border border-border/50 rounded-2xl shadow-sm overflow-hidden p-2">
                     <div className="flex flex-col">
                        {data.clients.slice(0, 5).map(c => {
                           const clientProjectsCount = data.projects.filter(p => p.client_id === c.id).length;
                           const clientBudgetsCount = data.budgets.filter(b => b.client_id === c.id).length;
                           return (
                             <div key={c.id} className="group flex items-center gap-3 p-3.5 hover:bg-muted/40 rounded-xl cursor-pointer transition-colors" onClick={() => navigate('/dashboard/clients')}>
                               <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-background shrink-0 transition-transform group-hover:scale-105 overflow-hidden" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}>
                                 {c.logo_url ? (
                                   <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                                 ) : (
                                   c.name?.charAt(0).toUpperCase()
                                 )}
                               </div>
                               <div className="flex flex-col flex-1 min-w-0">
                                 <span className="text-sm font-semibold text-foreground/90 truncate group-hover:text-primary transition-colors">{c.name}</span>
                                 <div className="flex items-center gap-4 mt-1">
                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                                      <FolderKanban className="w-3 h-3 text-muted-foreground/70" /> {clientProjectsCount} <span className="hidden sm:inline">{isPt ? 'Projetos' : 'Projects'}</span>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                                      <FileText className="w-3 h-3 text-muted-foreground/70" /> {clientBudgetsCount} <span className="hidden sm:inline">{isPt ? 'Orçamentos' : 'Budgets'}</span>
                                    </span>
                                 </div>
                               </div>
                             </div>
                           );
                        })}
                        {data.clients.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground opacity-60">{isPt ? 'Nenhum cliente cadastrado.' : 'No clients registered.'}</div>}
                     </div>
                  </div>
               </div>

            </div>
          </section>

        </div>

        {/* === Right Column (Context Sidebar) === */}
        <div className="xl:col-span-4 flex flex-col gap-10">
          
          {/* Calendar Panel */}
          <section className="bg-card/40 p-6 rounded-2xl border border-border/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <TaskCalendarCard tasks={data.tasks} isPt={isPt} navigate={navigate} />
          </section>

          {/* Notifications Panel */}
          <section className="flex flex-col min-h-[300px] bg-card/40 p-6 rounded-2xl border border-border/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="font-semibold text-lg text-foreground">{isPt ? 'Notificações' : 'Notifications'}</h2>
                {data.notifications.filter(n => !n.read).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-500">
                    {data.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              {data.notifications.filter(n => !n.read).length > 0 && (
                <button onClick={markAllAsRead} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors" title={isPt ? 'Marcar lidas' : 'Mark all read'}>
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
            
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
                        ${!n.read ? 'bg-background border-primary/20 shadow-md shadow-primary/5' : 'bg-transparent border-transparent hover:bg-muted/40'}
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
                            <p className={`text-sm leading-snug truncate ${!n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}>{n.title}</p>
                          </div>
                          <span className={`text-[10px] font-medium ${!n.read ? 'text-primary/70 ml-4' : 'text-muted-foreground/80'}`}>
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
              <button onClick={deleteAllNotifications} className="mt-4 pt-4 border-t border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 transition-colors">
                <Trash2 className="w-3 h-3" />
                {isPt ? 'Limpar todas' : 'Clear all'}
              </button>
            )}
          </section>

          {/* Team Panel */}
          <section className="bg-card/40 p-6 rounded-2xl border border-border/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] mt-auto">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2.5">
                 <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                   <UserPlus className="w-4 h-4 text-violet-500" />
                 </div>
                 <h2 className="font-semibold text-lg text-foreground truncate max-w-[160px]">{orgName || (isPt ? 'Equipe' : 'Team')}</h2>
               </div>
               <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide bg-background border border-border/50 px-2 py-1 rounded-md">{teamStats.total} {isPt ? 'membros' : 'members'}</span>
            </div>
            
            <div className="flex flex-col gap-2">
              {teamStats.members.slice(0, 5).map((m: any, i: number) => {
                 const profile = m.profile;
                 const name = profile?.name || 'Membro';
                 const role = m.role === 'admin' ? 'Admin' : 'Member';
                 return (
                   <div key={m.id || i} className="flex items-center gap-3 cursor-pointer group hover:bg-muted/40 p-2 -mx-2 rounded-xl transition-colors" onClick={() => navigate('/dashboard/team')}>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden shadow-sm shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors truncate">{name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{role}</span>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                 );
              })}
              {teamStats.members.length > 5 && (
                <button onClick={() => navigate('/dashboard/team')} className="text-xs font-semibold text-primary hover:text-primary/80 mt-2 text-center py-2 transition-colors">
                  {isPt ? 'Ver equipe completa' : 'View full team'}
                </button>
              )}
            </div>
          </section>
          
        </div>
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
              className={`w-full max-w-[14px] rounded-lg transition-all duration-300 ${d.isToday ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-muted-foreground/20 hover:bg-primary/40'}`}
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
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">{isPt ? 'Calendário' : 'Calendar'}</span>
            <p className="text-[10px] font-medium text-muted-foreground capitalize mt-0.5">
              {format(currentMonth, 'MMMM yyyy', { locale: isPt ? ptBR : enUS })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-background border border-border/50 rounded-lg p-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="text-[10px] font-bold px-2 py-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors uppercase">
            {isPt ? 'Hoje' : 'Today'}
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground/60 py-2">{d.charAt(0)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-9" />
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
              className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all duration-200
                ${today ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20' : 'hover:bg-muted/60 text-foreground bg-background border border-transparent hover:border-border/60'}
                ${isSelected && !today ? 'bg-primary/5 ring-1 ring-primary/30 border-primary/20' : ''}
              `}
            >
              <span className={`text-xs leading-none ${today ? 'font-bold' : 'font-semibold'}`}>{format(day, 'd')}</span>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-1.5">
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <span key={i} className={`w-1 h-1 rounded-full ${today ? 'bg-primary-foreground/80' : (priorityColor[task.priority] || 'bg-primary')}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/40 animate-fade-in fill-mode-forwards">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
            {format(parseISO(selectedDay), isPt ? "dd 'de' MMMM" : 'MMMM dd', { locale: isPt ? ptBR : enUS })}
            {' · '}{selectedTasks.length} {isPt ? (selectedTasks.length === 1 ? 'tarefa' : 'tarefas') : (selectedTasks.length === 1 ? 'task' : 'tasks')}
          </span>
          <div className="space-y-2 max-h-[180px] overflow-y-auto minimal-scrollbar pr-1 -mr-1">
            {selectedTasks.map(task => (
              <button
                key={task.id}
                onClick={() => navigate('/dashboard/kanban')}
                className="w-full flex items-center gap-3 rounded-xl bg-background hover:bg-muted/50 p-3 transition-colors text-left border border-border/50 shadow-sm"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColor[task.priority] || 'bg-primary'}`} />
                <span className="text-xs font-semibold text-foreground/90 truncate flex-1">{task.title}</span>
                {task.status === 'done' && (
                  <span className="ml-auto text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 p-1 rounded shrink-0"><CheckCheck className="w-3.5 h-3.5" /></span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
