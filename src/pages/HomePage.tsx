import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, ArrowUpRight, AlertCircle, DollarSign, CalendarDays } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, parseISO, differenceInMinutes, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  clients: any[];
  budgets: any[];
  projects: any[];
  tasks: any[];
  timeEntries: any[];
  invoices: any[];
}

const HomePage = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPt = lang === 'pt-BR';
  const [firstName, setFirstName] = useState('');
  const [data, setData] = useState<DashboardData>({
    clients: [], budgets: [], projects: [], tasks: [], timeEntries: [], invoices: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchName = async () => {
      const metaName = user?.user_metadata?.name;
      if (metaName) { setFirstName(metaName.split(' ')[0]); return; }
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle();
        if (data?.name) setFirstName(data.name.split(' ')[0]);
      }
    };
    if (user) fetchName();
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setLoading(true);
      const [clients, budgets, projects, tasks, timeEntries, invoices] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('budgets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').eq('user_id', user.id).order('start_time', { ascending: false }),
        supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setData({
        clients: clients.data || [],
        budgets: budgets.data || [],
        projects: projects.data || [],
        tasks: tasks.data || [],
        timeEntries: timeEntries.data || [],
        invoices: invoices.data || [],
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

    // Last 7 days chart data
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

  const fmtTime = (min: number) => `${Math.floor(min / 60)}h ${(min % 60).toString().padStart(2, '0')}m`;
  const fmtCurrency = (v: number) => new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', { style: 'currency', currency: isPt ? 'BRL' : 'USD' }).format(v);

  const cardBase = "group rounded-2xl border border-border bg-card text-left transition-all duration-200 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer";

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        <div className="h-10 bg-muted rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-min">

        {/* ═══ Tarefas — wide card ═══ */}
        <div onClick={() => navigate('/dashboard/kanban')} className={`${cardBase} xl:col-span-2 p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <SquareKanban className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base">{isPt ? 'Tarefas' : 'Tasks'}</span>
                <p className="text-xs text-muted-foreground">{taskStats.total} {isPt ? 'total' : 'total'}</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex mb-4">
            {taskStats.total > 0 && (
              <>
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat value={taskStats.todo} label={isPt ? 'A fazer' : 'To do'} dotColor="bg-muted-foreground/40" />
            <MiniStat value={taskStats.inProgress} label={isPt ? 'Fazendo' : 'Doing'} dotColor="bg-blue-500" />
            <MiniStat value={taskStats.done} label={isPt ? 'Feito' : 'Done'} dotColor="bg-green-500" />
          </div>

          {taskStats.overdue > 0 && (
            <div className="mt-4 flex items-center gap-1.5 text-destructive bg-destructive/5 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{taskStats.overdue} {isPt ? 'atrasadas' : 'overdue'}</span>
            </div>
          )}
        </div>

        {/* ═══ Time Tracking ═══ */}
        <div onClick={() => navigate('/dashboard/time')} className={`${cardBase} xl:col-span-2 p-6`}>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-muted/50 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-foreground">{fmtTime(timeStats.todayMin)}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Hoje' : 'Today'}</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-foreground">{fmtTime(timeStats.weekMin)}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Semana' : 'Week'}</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-foreground">{data.timeEntries.length}</div>
              <span className="text-[11px] text-muted-foreground font-medium">{isPt ? 'Registros' : 'Entries'}</span>
            </div>
          </div>
        </div>

        {/* ═══ Faturas — tall card ═══ */}
        <div onClick={() => navigate('/dashboard/invoices')} className={`${cardBase} xl:row-span-2 p-6 flex flex-col`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="font-bold text-foreground text-base">{isPt ? 'Faturas' : 'Invoices'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="text-3xl font-extrabold text-foreground">{data.invoices.length}</div>
          <p className="text-xs text-muted-foreground mt-1 mb-5">{isPt ? 'faturas criadas' : 'invoices created'}</p>

          <div className="space-y-3 flex-1">
            <StatusRow label={isPt ? 'Pendente' : 'Pending'} count={invoiceStats.pending} dotColor="bg-yellow-500" />
            <StatusRow label={isPt ? 'Pago' : 'Paid'} count={invoiceStats.paid} dotColor="bg-green-500" />
            {invoiceStats.overdue > 0 && <StatusRow label={isPt ? 'Atrasado' : 'Overdue'} count={invoiceStats.overdue} dotColor="bg-destructive" />}
          </div>

          <div className="mt-auto pt-4 border-t border-border space-y-2">
            {invoiceStats.totalPaid > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{isPt ? 'Recebido' : 'Received'}</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmtCurrency(invoiceStats.totalPaid)}</span>
              </div>
            )}
            {invoiceStats.totalPending > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{isPt ? 'A receber' : 'Receivable'}</span>
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{fmtCurrency(invoiceStats.totalPending)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Clientes ═══ */}
        <div onClick={() => navigate('/dashboard/clients')} className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-foreground text-base">{isPt ? 'Clientes' : 'Clients'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{data.clients.length}</div>
          <p className="text-xs text-muted-foreground mt-1">{isPt ? 'cadastrados' : 'registered'}</p>
          {data.clients.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              {data.clients.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground truncate font-medium">{c.name}</span>
                </div>
              ))}
              {data.clients.length > 4 && (
                <span className="text-[11px] text-primary font-semibold">+{data.clients.length - 4} {isPt ? 'mais' : 'more'}</span>
              )}
            </div>
          )}
        </div>

        {/* ═══ Orçamentos ═══ */}
        <div onClick={() => navigate('/dashboard/budgets')} className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-foreground text-base">{isPt ? 'Orçamentos' : 'Budgets'}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{budgetStats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(budgetStats.totalValue)}</p>
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <StatusRow label={isPt ? 'Rascunho' : 'Draft'} count={budgetStats.draft} dotColor="bg-muted-foreground/40" />
            <StatusRow label={isPt ? 'Enviado' : 'Sent'} count={budgetStats.sent} dotColor="bg-blue-500" />
            <StatusRow label={isPt ? 'Aprovado' : 'Approved'} count={budgetStats.approved} dotColor="bg-green-500" />
          </div>
        </div>

        {/* ═══ Projetos ═══ */}
        <div onClick={() => navigate('/dashboard/projects')} className={`${cardBase} xl:col-span-2 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base">{isPt ? 'Projetos' : 'Projects'}</span>
                <p className="text-xs text-muted-foreground">{data.projects.length} {isPt ? 'ativos' : 'active'}</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {data.projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.projects.slice(0, 4).map(p => (
                <div key={p.id} className="rounded-xl bg-muted/50 p-3.5 space-y-1">
                  <span className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</span>
                  {p.due_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      <span className="text-[11px]">{format(parseISO(p.due_date), isPt ? 'dd/MM/yyyy' : 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{isPt ? 'Nenhum projeto ainda' : 'No projects yet'}</p>
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

export default HomePage;
