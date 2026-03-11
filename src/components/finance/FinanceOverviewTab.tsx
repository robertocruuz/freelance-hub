import { useState, useMemo, useEffect } from 'react';
import { format, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency, cn } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/hooks/useExpenses';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import type { FinanceInvoice } from '@/pages/FinancePage';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt,
  AlertTriangle, Target, CalendarIcon, Filter, X, ChevronDown,
  ArrowDownToLine, ArrowUpFromLine, Users, FolderKanban,
} from 'lucide-react';

const PIE_COLORS = [
  'hsl(225, 100%, 50%)', 'hsl(80, 85%, 45%)', 'hsl(0, 72%, 51%)',
  'hsl(45, 93%, 47%)', 'hsl(280, 60%, 55%)', 'hsl(170, 60%, 45%)', 'hsl(220, 15%, 60%)',
];

type PeriodFilter = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'S1' | 'S2' | 'custom';

interface Props {
  invoices: FinanceInvoice[];
  selectedYear: number;
  onResetToMonthly?: () => void;
}

function getMonthRange(year: number, period: PeriodFilter): { startMonth: number; endMonth: number } {
  switch (period) {
    case 'Q1': return { startMonth: 0, endMonth: 2 };
    case 'Q2': return { startMonth: 3, endMonth: 5 };
    case 'Q3': return { startMonth: 6, endMonth: 8 };
    case 'Q4': return { startMonth: 9, endMonth: 11 };
    case 'S1': return { startMonth: 0, endMonth: 5 };
    case 'S2': return { startMonth: 6, endMonth: 11 };
    default: return { startMonth: 0, endMonth: 11 };
  }
}

export default function FinanceOverviewTab({ invoices, selectedYear, onResetToMonthly }: Props) {
  const { expenses } = useExpenses();
  const { clients } = useClients();
  const { user } = useAuth();

  // Fetch projects
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, [user]);

  // Filter states
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('year');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilterInvoice, setStatusFilterInvoice] = useState<string>('all');
  const [statusFilterExpense, setStatusFilterExpense] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const yearStr = String(selectedYear);

  // Compute active date range
  const activeRange = useMemo(() => {
    if (periodFilter === 'custom' && customRange?.from && customRange?.to) {
      return { from: customRange.from, to: customRange.to };
    }
    const { startMonth, endMonth } = getMonthRange(selectedYear, periodFilter);
    return {
      from: new Date(selectedYear, startMonth, 1),
      to: endOfMonth(new Date(selectedYear, endMonth, 1)),
    };
  }, [periodFilter, customRange, selectedYear]);

  const months = eachMonthOfInterval({ start: startOfMonth(activeRange.from), end: endOfMonth(activeRange.to) });

  // Check if date falls within active range
  const isInRange = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T12:00:00');
    return isWithinInterval(d, { start: activeRange.from, end: activeRange.to });
  };

  // Apply all filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (!isInRange(i.due_date)) return false;
      if (clientFilter !== 'all' && i.client_id !== clientFilter) return false;
      if (paymentFilter !== 'all' && i.payment_method !== paymentFilter) return false;
      if (statusFilterInvoice !== 'all' && i.status !== statusFilterInvoice) return false;
      return true;
    });
  }, [invoices, activeRange, clientFilter, paymentFilter, statusFilterInvoice]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const dateMatch = isInRange(e.due_date) || isInRange(e.paid_date);
      if (!dateMatch) return false;
      if (clientFilter !== 'all' && e.client_id !== clientFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (paymentFilter !== 'all' && e.payment_method !== paymentFilter) return false;
      if (statusFilterExpense !== 'all' && e.status !== statusFilterExpense) return false;
      return true;
    });
  }, [expenses, activeRange, clientFilter, categoryFilter, paymentFilter, statusFilterExpense]);

  // === COMPUTATIONS ===
  const totalReceived = filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalSpent = filteredExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPending = filteredInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalExpensesPending = filteredExpenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const annualBalance = totalReceived - totalSpent;

  const paidInvoiceCount = filteredInvoices.filter(i => i.status === 'paid').length;
  const avgTicket = paidInvoiceCount > 0 ? totalReceived / paidInvoiceCount : 0;

  const overdueInvoices = filteredInvoices.filter(i => {
    if (i.status === 'paid' || !i.due_date) return false;
    return new Date(i.due_date + 'T23:59:59') < new Date();
  });
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.total, 0);
  const overdueRate = filteredInvoices.length > 0
    ? (overdueInvoices.length / filteredInvoices.length) * 100
    : 0;

  // Monthly data for charts
  const monthlyData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = filteredInvoices
      .filter(i => i.status === 'paid' && i.due_date?.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = filteredExpenses
      .filter(e => e.status === 'paid' && e.paid_date?.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    return {
      name: format(month, 'MMM', { locale: ptBR }),
      Entradas: entradas,
      Saídas: saidas,
      Saldo: entradas - saidas,
    };
  });

  let cumulative = 0;
  const cumulativeData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = filteredInvoices
      .filter(i => i.status === 'paid' && i.due_date?.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = filteredExpenses
      .filter(e => e.status === 'paid' && e.paid_date?.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    cumulative += entradas - saidas;
    return { name: format(month, 'MMM', { locale: ptBR }), Acumulado: cumulative };
  });

  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = filteredExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
    return { name: cat.label, value: total };
  }).filter(d => d.value > 0);

  // Active filter count
  const activeFilterCount = [
    clientFilter !== 'all',
    categoryFilter !== 'all',
    paymentFilter !== 'all',
    periodFilter !== 'year',
    
    statusFilterInvoice !== 'all',
    statusFilterExpense !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setPeriodFilter('year');
    setClientFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
    
    setStatusFilterInvoice('all');
    setStatusFilterExpense('all');
    setCustomRange(undefined);
  };

  const periodLabel = useMemo(() => {
    if (periodFilter === 'custom' && customRange?.from && customRange?.to) {
      return format(customRange.from, 'dd MMM', { locale: ptBR }) + ' – ' + format(customRange.to, 'dd MMM', { locale: ptBR });
    }
    const labels: Record<PeriodFilter, string> = {
      year: 'Ano completo',
      Q1: '1º Trimestre',
      Q2: '2º Trimestre',
      Q3: '3º Trimestre',
      Q4: '4º Trimestre',
      S1: '1º Semestre',
      S2: '2º Semestre',
      custom: 'Personalizado',
    };
    return labels[periodFilter];
  }, [periodFilter, customRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-xs font-semibold text-foreground mb-1.5 capitalize">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const summaryItems = [
    { label: 'Total recebido', value: totalReceived, icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Total gasto', value: totalSpent, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'A receber', value: totalPending, icon: Receipt, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
    { label: 'Saldo do período', value: annualBalance, icon: Wallet, color: annualBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bgColor: annualBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50' },
  ];

  const kpiItems = [
    { label: 'Ticket médio', value: formatCurrency(avgTicket), icon: Target, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Faturas pagas', value: String(paidInvoiceCount), icon: Receipt, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
    { label: 'Inadimplência', value: `${overdueRate.toFixed(1)}%`, subValue: formatCurrency(overdueAmount), icon: AlertTriangle, color: overdueRate > 20 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400', bgColor: overdueRate > 20 ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-900/50' },
    { label: 'A pagar', value: formatCurrency(totalExpensesPending), icon: PiggyBank, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/50' },
  ];

  const periodOptions = [
    { value: 'year', label: 'Ano completo' },
    { value: 'Q1', label: '1º Trimestre (Jan-Mar)' },
    { value: 'Q2', label: '2º Trimestre (Abr-Jun)' },
    { value: 'Q3', label: '3º Trimestre (Jul-Set)' },
    { value: 'Q4', label: '4º Trimestre (Out-Dez)' },
    { value: 'S1', label: '1º Semestre (Jan-Jun)' },
    { value: 'S2', label: '2º Semestre (Jul-Dez)' },
  ];

  return (
    <div className="space-y-5">
      {/* Collapsible Filter bar */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Filtros</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {/* Active filter chips when collapsed */}
                {activeFilterCount > 0 && !filtersOpen && (
                  <div className="hidden sm:flex items-center gap-1.5 ml-1">
                    {periodFilter !== 'year' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                        <CalendarIcon className="w-2.5 h-2.5" />
                        {periodLabel}
                      </span>
                    )}
                    {clientFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                        <Users className="w-2.5 h-2.5" />
                        {clients.find(c => c.id === clientFilter)?.name || 'Cliente'}
                      </span>
                    )}
                    {categoryFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                        Categoria
                      </span>
                    )}
                    {(statusFilterInvoice !== 'all' || statusFilterExpense !== 'all' || paymentFilter !== 'all') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                        +{[statusFilterInvoice !== 'all', statusFilterExpense !== 'all', paymentFilter !== 'all'].filter(Boolean).length}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-300 group-hover:text-foreground",
                filtersOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 border-t border-border">
              {/* PERÍODO - full width row */}
              <div className="py-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Período</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {periodOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setPeriodFilter(opt.value as PeriodFilter); setCustomRange(undefined); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        periodFilter === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                          periodFilter === 'custom'
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <CalendarIcon className="w-3 h-3" />
                        {periodFilter === 'custom' && customRange?.from && customRange?.to
                          ? format(customRange.from, 'dd/MM', { locale: ptBR }) + ' – ' + format(customRange.to, 'dd/MM', { locale: ptBR })
                          : 'Personalizado'
                        }
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customRange}
                        onSelect={(range: DateRange | undefined) => {
                          setCustomRange(range);
                          if (range?.from && range?.to) {
                            setPeriodFilter('custom');
                          }
                        }}
                        fromDate={new Date(selectedYear, 0, 1)}
                        toDate={new Date(selectedYear, 11, 31)}
                        numberOfMonths={2}
                        defaultMonth={new Date(selectedYear, 0, 1)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Filter groups grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-3.5">
                {/* ENTRADAS */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Entradas</span>
                  </div>
                  <Select value={statusFilterInvoice} onValueChange={setStatusFilterInvoice}>
                    <SelectTrigger className={cn(
                      "h-8 text-xs transition-colors",
                      statusFilterInvoice !== 'all' ? "border-primary/50 bg-primary/5" : "border-dashed"
                    )}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
                      <SelectItem value="paid" className="text-xs">Pagas</SelectItem>
                      <SelectItem value="pending" className="text-xs">Pendentes</SelectItem>
                      <SelectItem value="overdue" className="text-xs">Atrasadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SAÍDAS */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Saídas</span>
                  </div>
                  <div className="space-y-2">
                    <Select value={statusFilterExpense} onValueChange={setStatusFilterExpense}>
                      <SelectTrigger className={cn(
                        "h-8 text-xs transition-colors",
                        statusFilterExpense !== 'all' ? "border-destructive/50 bg-destructive/5" : "border-dashed"
                      )}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
                        <SelectItem value="paid" className="text-xs">Pagas</SelectItem>
                        <SelectItem value="pending" className="text-xs">Pendentes</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className={cn(
                        "h-8 text-xs transition-colors",
                        categoryFilter !== 'all' ? "border-destructive/50 bg-destructive/5" : "border-dashed"
                      )}>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todas categorias</SelectItem>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CLIENTES */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Cliente</span>
                  </div>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className={cn(
                      "h-8 text-xs transition-colors",
                      clientFilter !== 'all' ? "border-amber-500/50 bg-amber-500/5" : "border-dashed"
                    )}>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os clientes</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PAGAMENTO */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Pagamento</span>
                  </div>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className={cn(
                      "h-8 text-xs transition-colors",
                      paymentFilter !== 'all' ? "border-emerald-500/50 bg-emerald-500/5" : "border-dashed"
                    )}>
                      <SelectValue placeholder="Todas formas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas formas</SelectItem>
                      {PAYMENT_METHODS.map(pm => (
                        <SelectItem key={pm.value} value={pm.value} className="text-xs">{pm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear button */}
              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-3 mt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 gap-1.5"
                    onClick={clearAllFilters}
                  >
                    <X className="w-3 h-3" />
                    Limpar filtros ({activeFilterCount})
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>


      {/* Annual summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryItems.map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.bgColor}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`text-sm font-bold truncate ${item.color}`}>{formatCurrency(item.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiItems.map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.bgColor}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`text-sm font-bold truncate ${item.color}`}>{item.value}</p>
              {'subValue' in item && item.subValue && (
                <p className="text-[10px] text-muted-foreground">{item.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly comparison chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Comparativo Mensal</CardTitle>
            <CardDescription className="text-xs">Entradas vs Saídas — {periodLabel} {yearStr}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} className="capitalize" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Entradas" fill="hsl(225, 100%, 50%)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Saídas" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} maxBarSize={28} opacity={0.75} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Despesas por Categoria</CardTitle>
            <CardDescription className="text-xs">Distribuição do período</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <PiggyBank className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma despesa</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75} innerRadius={45} strokeWidth={2} stroke="hsl(var(--card))" paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-[11px] text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cumulative balance + Monthly balance bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Evolução Acumulada</CardTitle>
            <CardDescription className="text-xs">Saldo acumulado — {periodLabel} {yearStr}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(225, 100%, 50%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(225, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Acumulado" stroke="hsl(225, 100%, 50%)" fill="url(#overviewGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(225, 100%, 50%)', strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Saldo Mensal</CardTitle>
            <CardDescription className="text-xs">Resultado de cada mês — {periodLabel} {yearStr}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Saldo" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.Saldo >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
