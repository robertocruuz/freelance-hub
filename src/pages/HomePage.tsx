import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, Clock, Receipt, SquareKanban, ArrowUpRight, Plus, TrendingUp, CheckCircle2, AlertCircle, Timer, DollarSign } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, parseISO, differenceInMinutes } from 'date-fns';
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
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Task stats
  const taskStats = useMemo(() => {
    const total = data.tasks.length;
    const done = data.tasks.filter(t => t.status === 'done').length;
    const inProgress = data.tasks.filter(t => t.status === 'in_progress' || t.status === 'doing').length;
    const todo = data.tasks.filter(t => t.status === 'todo').length;
    const overdue = data.tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;
    return { total, done, inProgress, todo, overdue };
  }, [data.tasks]);

  // Time stats
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
    const todayMin = calcMinutes(todayEntries);
    const weekMin = calcMinutes(weekEntries);
    const activeTimer = data.timeEntries.find(e => !e.end_time && !e.duration);
    return { todayMin, weekMin, activeTimer };
  }, [data.timeEntries]);

  // Invoice stats
  const invoiceStats = useMemo(() => {
    const pending = data.invoices.filter(i => i.status === 'pending');
    const paid = data.invoices.filter(i => i.status === 'paid');
    const overdue = data.invoices.filter(i => i.status === 'overdue');
    const totalPending = pending.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalPaid = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    return { pending: pending.length, paid: paid.length, overdue: overdue.length, totalPending, totalPaid };
  }, [data.invoices]);

  // Budget stats
  const budgetStats = useMemo(() => {
    const draft = data.budgets.filter(b => b.status === 'draft').length;
    const sent = data.budgets.filter(b => b.status === 'sent').length;
    const approved = data.budgets.filter(b => b.status === 'approved').length;
    const totalValue = data.budgets.reduce((s, b) => s + (Number(b.total) || 0), 0);
    return { draft, sent, approved, total: data.budgets.length, totalValue };
  }, [data.budgets]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isPt ? 'pt-BR' : 'en-US', {
      style: 'currency', currency: isPt ? 'BRL' : 'USD',
    }).format(value);
  };

  const SkeletonCard = () => (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="h-8 bg-muted rounded w-1/2 mb-3" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto relative z-10 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
            {isPt ? `Olá, ${firstName || 'Usuário'}` : `Hello, ${firstName || 'User'}`} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPt
              ? format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })
              : format(now, 'EEEE, MMMM dd')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Clientes */}
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="font-bold text-foreground">{isPt ? 'Clientes' : 'Clients'}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{data.clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {isPt ? 'clientes cadastrados' : 'registered clients'}
            </p>
            {data.clients.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {data.clients.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }} />
                    <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                  </div>
                ))}
                {data.clients.length > 3 && (
                  <span className="text-xs text-primary font-medium">+{data.clients.length - 3} {isPt ? 'mais' : 'more'}</span>
                )}
              </div>
            )}
          </button>

          {/* Orçamentos */}
          <button
            onClick={() => navigate('/dashboard/budgets')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-accent-foreground" />
                </div>
                <span className="font-bold text-foreground">{isPt ? 'Orçamentos' : 'Budgets'}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{budgetStats.total}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(budgetStats.totalValue)} {isPt ? 'total' : 'total'}</p>
            <div className="mt-3 pt-3 border-t border-border flex gap-3 flex-wrap">
              <StatusPill label={isPt ? 'Rascunho' : 'Draft'} count={budgetStats.draft} color="bg-muted text-muted-foreground" />
              <StatusPill label={isPt ? 'Enviado' : 'Sent'} count={budgetStats.sent} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <StatusPill label={isPt ? 'Aprovado' : 'Approved'} count={budgetStats.approved} color="bg-green-500/10 text-green-600 dark:text-green-400" />
            </div>
          </button>

          {/* Projetos */}
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <FolderKanban className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-bold text-foreground">{isPt ? 'Projetos' : 'Projects'}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{data.projects.length}</div>
            <p className="text-xs text-muted-foreground">{isPt ? 'projetos ativos' : 'active projects'}</p>
            {data.projects.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {data.projects.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">{p.name}</span>
                    {p.due_date && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(parseISO(p.due_date), 'dd/MM')}
                      </span>
                    )}
                  </div>
                ))}
                {data.projects.length > 3 && (
                  <span className="text-xs text-primary font-medium">+{data.projects.length - 3} {isPt ? 'mais' : 'more'}</span>
                )}
              </div>
            )}
          </button>

          {/* Tarefas */}
          <button
            onClick={() => navigate('/dashboard/kanban')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <SquareKanban className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-bold text-foreground">{isPt ? 'Tarefas' : 'Tasks'}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.done} {isPt ? 'concluídas' : 'completed'}
            </p>
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                {taskStats.total > 0 && (
                  <>
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />
                    <div className="h-full bg-muted-foreground/20 transition-all" style={{ width: `${(taskStats.todo / taskStats.total) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <StatusPill label={isPt ? 'A fazer' : 'To do'} count={taskStats.todo} color="bg-muted text-muted-foreground" />
                <StatusPill label={isPt ? 'Fazendo' : 'Doing'} count={taskStats.inProgress} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                <StatusPill label={isPt ? 'Feito' : 'Done'} count={taskStats.done} color="bg-green-500/10 text-green-600 dark:text-green-400" />
              </div>
              {taskStats.overdue > 0 && (
                <div className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{taskStats.overdue} {isPt ? 'atrasadas' : 'overdue'}</span>
                </div>
              )}
            </div>
          </button>

          {/* Time Tracking */}
          <button
            onClick={() => navigate('/dashboard/time')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="font-bold text-foreground">Time Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                {timeStats.activeTimer && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {isPt ? 'Ativo' : 'Active'}
                  </span>
                )}
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{formatTime(timeStats.todayMin)}</div>
            <p className="text-xs text-muted-foreground">{isPt ? 'trabalhado hoje' : 'worked today'}</p>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{isPt ? 'Esta semana' : 'This week'}</span>
                <span className="text-sm font-bold text-foreground">{formatTime(timeStats.weekMin)}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{isPt ? 'Registros totais' : 'Total entries'}</span>
                <span className="text-sm font-bold text-foreground">{data.timeEntries.length}</span>
              </div>
            </div>
          </button>

          {/* Faturas */}
          <button
            onClick={() => navigate('/dashboard/invoices')}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Receipt className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-bold text-foreground">{isPt ? 'Faturas' : 'Invoices'}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{data.invoices.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(invoiceStats.totalPaid)} {isPt ? 'recebido' : 'received'}</p>
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="flex gap-3 flex-wrap">
                <StatusPill label={isPt ? 'Pendente' : 'Pending'} count={invoiceStats.pending} color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" />
                <StatusPill label={isPt ? 'Pago' : 'Paid'} count={invoiceStats.paid} color="bg-green-500/10 text-green-600 dark:text-green-400" />
                {invoiceStats.overdue > 0 && (
                  <StatusPill label={isPt ? 'Atrasado' : 'Overdue'} count={invoiceStats.overdue} color="bg-red-500/10 text-red-600 dark:text-red-400" />
                )}
              </div>
              {invoiceStats.totalPending > 0 && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatCurrency(invoiceStats.totalPending)} {isPt ? 'a receber' : 'receivable'}
                  </span>
                </div>
              )}
            </div>
          </button>

        </div>
      )}
    </div>
  );
};

const StatusPill = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
    {count} {label}
  </span>
);

export default HomePage;
