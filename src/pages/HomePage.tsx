import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, ArrowUpRight, AlertCircle, DollarSign, CalendarDays, ChevronLeft, ChevronRight, Wallet, UserPlus } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, parseISO, differenceInMinutes, subDays, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth } from 'date-fns';
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
}

const HomePage = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPt = lang === 'pt-BR';
  const [firstName, setFirstName] = useState('');
  const [data, setData] = useState<DashboardData>({
    clients: [], budgets: [], projects: [], tasks: [], timeEntries: [], invoices: [], expenses: [], orgMembers: [],
  });
  const [loading, setLoading] = useState(true);

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
    const fetchAll = async () => {
      if (!user) return;
      setLoading(true);
      const [clients, budgets, projects, tasks, timeEntries, invoices, expenses, orgMembers] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('budgets').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').order('start_time', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('organization_members').select('id, user_id, role, status').eq('status', 'accepted'),
      ]);

      // Fetch profiles for org members
      const memberUserIds = (orgMembers.data || []).map((m: any) => m.user_id);
      let memberProfiles: any[] = [];
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar_url').in('user_id', memberUserIds);
        memberProfiles = profiles || [];
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
      });
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

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

  const fmtTime = (min: number) => `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, '0')}m`;
  const fmtCurrency = (v: number) => new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: isPt ? 'BRL' : 'USD' }).format(v);

  const cardBase = "group rounded-2xl border border-border bg-card text-left transition-all duration-200 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer";

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

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 auto-rows-min">

        {/* ═══ Time Tracking — hero card ═══ */}
        <div onClick={() => navigate('/dashboard/time')} className={`${cardBase} md:col-span-6 xl:col-span-8 p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base">Time Tracking</span>
                {timeStats.activeTimer && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">{isPt ? 'Timer ativo' : 'Timer active'}</span>
                  </div>
                )}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-extrabold text-foreground">{fmtTime(timeStats.todayMin)}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Hoje' : 'Today'}</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-extrabold text-foreground">{fmtTime(timeStats.weekMin)}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Semana' : 'Week'}</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-extrabold text-foreground">{data.timeEntries.length}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Registros' : 'Entries'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <span className="text-[11px] text-muted-foreground font-medium mb-3 block">{isPt ? 'Últimos 7 dias' : 'Last 7 days'}</span>
            <MiniBarChart data={timeStats.last7} />
          </div>
        </div>

        {/* ═══ Calendário de Tarefas ═══ */}
        <div className={`${cardBase} md:col-span-3 xl:col-span-4 p-3 cursor-default`} onClick={undefined}>
          <TaskCalendarCard tasks={data.tasks} isPt={isPt} navigate={navigate} />
        </div>

        {/* ═══ Financeiro — destaque ═══ */}
        <div onClick={() => navigate('/dashboard/finance')} className={`${cardBase} md:col-span-6 xl:col-span-5 p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base">{isPt ? 'Financeiro' : 'Finance'}</span>
                <p className="text-[10px] text-muted-foreground">{isPt ? 'Visão geral' : 'Overview'}</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Balance */}
          <div className="rounded-xl bg-muted/50 p-4 mb-4">
            <span className="text-[11px] text-muted-foreground font-medium block mb-1">{isPt ? 'Saldo' : 'Balance'}</span>
            <div className={`text-2xl font-extrabold ${financeStats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {fmtCurrency(financeStats.balance)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
              <span className="text-[11px] text-primary/70 font-medium block mb-0.5">{isPt ? 'A receber' : 'Receivable'}</span>
              <span className="text-sm font-extrabold text-primary">{fmtCurrency(financeStats.totalReceivable)}</span>
            </div>
            <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-3">
              <span className="text-[11px] text-destructive/70 font-medium block mb-0.5">{isPt ? 'A pagar' : 'Payable'}</span>
              <span className="text-sm font-extrabold text-destructive">{fmtCurrency(financeStats.totalPayable)}</span>
            </div>
          </div>

          {financeStats.overdueExpenses > 0 && (
            <div className="flex items-center gap-1.5 text-destructive bg-destructive/5 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{financeStats.overdueExpenses} {isPt ? 'despesas atrasadas' : 'overdue expenses'}</span>
            </div>
          )}
        </div>

        {/* ═══ Tarefas ═══ */}
        <div onClick={() => navigate('/dashboard/kanban')} className={`${cardBase} md:col-span-3 xl:col-span-4 p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <SquareKanban className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm">{isPt ? 'Tarefas' : 'Tasks'}</span>
                <p className="text-[10px] text-muted-foreground">{taskStats.total} total</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mb-3">
            {taskStats.total > 0 && (
              <>
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat value={taskStats.todo} label={isPt ? 'A fazer' : 'To do'} dotColor="bg-muted-foreground/40" />
            <MiniStat value={taskStats.inProgress} label={isPt ? 'Fazendo' : 'Doing'} dotColor="bg-blue-500" />
            <MiniStat value={taskStats.done} label={isPt ? 'Feito' : 'Done'} dotColor="bg-green-500" />
          </div>

          {taskStats.overdue > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-destructive bg-destructive/5 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{taskStats.overdue} {isPt ? 'atrasadas' : 'overdue'}</span>
            </div>
          )}
        </div>

        {/* ═══ Equipe ═══ */}
        <div onClick={() => navigate('/dashboard/team')} className={`${cardBase} md:col-span-3 xl:col-span-3 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <UserPlus className="w-4.5 h-4.5 text-violet-500" />
              </div>
              <span className="font-bold text-foreground">{isPt ? 'Equipe' : 'Team'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{teamStats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{isPt ? 'membros' : 'members'}</p>

          {teamStats.members.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              {/* Avatar stack */}
              <div className="flex items-center -space-x-2">
                {teamStats.members.slice(0, 5).map((m: any, i: number) => {
                  const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                  const name = profile?.name || '?';
                  const avatarUrl = profile?.avatar_url;
                  return (
                    <div key={m.id || i} className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary shrink-0 overflow-hidden" title={name}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                  );
                })}
                {teamStats.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-muted shrink-0">
                    +{teamStats.members.length - 5}
                  </div>
                )}
              </div>
              {teamStats.members.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {teamStats.members.slice(0, 2).map((m: any) => {
                    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return profile?.name?.split(' ')[0] || '';
                  }).filter(Boolean).join(', ')}
                  {teamStats.members.length > 2 ? ` ${isPt ? 'e mais' : 'and'} ${teamStats.members.length - 2}` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ═══ Clientes ═══ */}
        <div onClick={() => navigate('/dashboard/clients')} className={`${cardBase} md:col-span-3 xl:col-span-3 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="font-bold text-foreground">{isPt ? 'Clientes' : 'Clients'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{data.clients.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{isPt ? 'cadastrados' : 'registered'}</p>
          {data.clients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              {data.clients.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground truncate font-medium">{c.name}</span>
                </div>
              ))}
              {data.clients.length > 3 && (
                <span className="text-[11px] text-primary font-semibold">+{data.clients.length - 3} {isPt ? 'mais' : 'more'}</span>
              )}
            </div>
          )}
        </div>

        {/* ═══ Projetos ═══ */}
        <div onClick={() => navigate('/dashboard/projects')} className={`${cardBase} md:col-span-3 xl:col-span-3 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5 text-purple-500" />
              </div>
              <div>
                <span className="font-bold text-foreground">{isPt ? 'Projetos' : 'Projects'}</span>
                <p className="text-[10px] text-muted-foreground">{data.projects.length} {isPt ? 'ativos' : 'active'}</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {data.projects.length > 0 ? (
            <div className="space-y-2">
              {data.projects.slice(0, 3).map(p => (
                <div key={p.id} className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground line-clamp-1">{p.name}</span>
                  {p.due_date && (
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
                      <CalendarDays className="w-3 h-3" />
                      <span className="text-[10px]">{format(parseISO(p.due_date), 'dd/MM')}</span>
                    </div>
                  )}
                </div>
              ))}
              {data.projects.length > 3 && (
                <span className="text-[11px] text-primary font-semibold">+{data.projects.length - 3} {isPt ? 'mais' : 'more'}</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{isPt ? 'Nenhum projeto ainda' : 'No projects yet'}</p>
          )}
        </div>

        {/* ═══ Orçamentos ═══ */}
        <div onClick={() => navigate('/dashboard/budgets')} className={`${cardBase} md:col-span-3 xl:col-span-3 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <span className="font-bold text-foreground">{isPt ? 'Orçamentos' : 'Budgets'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{budgetStats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{fmtCurrency(budgetStats.totalValue)}</p>
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <StatusRow label={isPt ? 'Rascunho' : 'Draft'} count={budgetStats.draft} dotColor="bg-muted-foreground/40" />
            <StatusRow label={isPt ? 'Enviado' : 'Sent'} count={budgetStats.sent} dotColor="bg-blue-500" />
            <StatusRow label={isPt ? 'Aprovado' : 'Approved'} count={budgetStats.approved} dotColor="bg-green-500" />
          </div>
        </div>

        {/* ═══ Faturas ═══ */}
        <div onClick={() => navigate('/dashboard/finance')} className={`${cardBase} md:col-span-3 xl:col-span-3 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Receipt className="w-4.5 h-4.5 text-teal-500" />
              </div>
              <span className="font-bold text-foreground">{isPt ? 'Faturas' : 'Invoices'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{data.invoices.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{isPt ? 'faturas criadas' : 'invoices created'}</p>

          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <StatusRow label={isPt ? 'Pendente' : 'Pending'} count={invoiceStats.pending} dotColor="bg-yellow-500" />
            <StatusRow label={isPt ? 'Pago' : 'Paid'} count={invoiceStats.paid} dotColor="bg-green-500" />
            {invoiceStats.overdue > 0 && <StatusRow label={isPt ? 'Atrasado' : 'Overdue'} count={invoiceStats.overdue} dotColor="bg-destructive" />}
          </div>

          {(invoiceStats.totalPaid > 0 || invoiceStats.totalPending > 0) && (
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              {invoiceStats.totalPaid > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{isPt ? 'Recebido' : 'Received'}</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(invoiceStats.totalPaid)}</span>
                </div>
              )}
              {invoiceStats.totalPending > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{isPt ? 'A receber' : 'Receivable'}</span>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{fmtCurrency(invoiceStats.totalPending)}</span>
                </div>
              )}
            </div>
          )}
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
