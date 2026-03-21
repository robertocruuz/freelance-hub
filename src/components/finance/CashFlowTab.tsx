import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, cn } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import type { FinanceInvoice } from '@/pages/FinancePage';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CalendarIcon, X } from 'lucide-react';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(346, 87%, 60%)',
  'hsl(43, 96%, 56%)',
  'hsl(283, 39%, 53%)',
  'hsl(199, 89%, 48%)',
  'hsl(var(--muted-foreground))',
];

type QuickFilter = '3d' | '7d' | '15d' | 'custom' | 'full';

interface Props {
  invoices: FinanceInvoice[];
  monthFilter?: string;
}

export default function CashFlowTab({ invoices, monthFilter }: Props) {
  const { expenses } = useExpenses();

  // Derive the selected month boundaries
  const selectedMonth = monthFilter ? parseISO(monthFilter + '-01') : new Date();
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('full');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  

  // Compute the active date range based on the quick filter
  const activeRange = useMemo((): { from: Date; to: Date } => {
    const today = new Date();
    // Use today if within selected month, otherwise use month end
    const anchor = isWithinInterval(today, { start: monthStart, end: monthEnd }) ? today : monthEnd;

    if (quickFilter === '3d') {
      const from = subDays(anchor, 2);
      return { from: from < monthStart ? monthStart : from, to: anchor > monthEnd ? monthEnd : anchor };
    }
    if (quickFilter === '7d') {
      const from = subDays(anchor, 6);
      return { from: from < monthStart ? monthStart : from, to: anchor > monthEnd ? monthEnd : anchor };
    }
    if (quickFilter === '15d') {
      const from = subDays(anchor, 14);
      return { from: from < monthStart ? monthStart : from, to: anchor > monthEnd ? monthEnd : anchor };
    }
    if (quickFilter === 'custom' && customRange?.from && customRange?.to) {
      return { from: customRange.from, to: customRange.to };
    }
    // 'full' — entire month
    return { from: monthStart, to: monthEnd };
  }, [quickFilter, customRange, monthStart, monthEnd]);

  const days = eachDayOfInterval({ start: activeRange.from, end: activeRange.to });

  // Filter data to the selected month
  const monthInvoices = invoices.filter(i => i.due_date && i.due_date.startsWith(monthFilter || ''));
  const monthExpenses = expenses.filter(e =>
    (e.due_date && e.due_date.startsWith(monthFilter || '')) ||
    (e.paid_date && e.paid_date.startsWith(monthFilter || ''))
  );

  const totalReceivable = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalPayable = monthExpenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);

  // Accumulated balance up to end of selected month
  const endOfSelectedMonth = monthFilter ? monthFilter + '-31' : '9999-12-31';
  const accumulatedReceived = invoices
    .filter(i => i.status === 'paid' && i.due_date && i.due_date <= endOfSelectedMonth)
    .reduce((s, i) => s + i.total, 0);
  const accumulatedPaid = expenses
    .filter(e => e.status === 'paid' && e.paid_date && e.paid_date <= endOfSelectedMonth)
    .reduce((s, e) => s + e.amount, 0);

  const projectedBalance = totalReceivable - totalPayable;
  const currentBalance = accumulatedReceived - accumulatedPaid;

  // Daily bar chart data within the active range
  const barData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date === dayStr)
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date === dayStr)
      .reduce((s, e) => s + e.amount, 0);
    return {
      name: format(day, days.length > 15 ? 'dd' : 'dd/MM', { locale: ptBR }),
      fullDate: dayStr,
      Entradas: entradas,
      Saídas: saidas,
      Saldo: entradas - saidas,
    };
  });

  // Cumulative balance line for the active range
  let cumulative = 0;
  const saldoData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date === dayStr)
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date === dayStr)
      .reduce((s, e) => s + e.amount, 0);
    cumulative += entradas - saidas;
    return {
      name: format(day, days.length > 15 ? 'dd' : 'dd/MM', { locale: ptBR }),
      Saldo: cumulative,
    };
  });

  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = monthExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
    return { name: cat.label, value: total };
  }).filter(d => d.value > 0);

  const summaryItems = [
    { label: 'A receber', value: totalReceivable, icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'A pagar', value: totalPayable, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'Saldo previsto', value: projectedBalance, icon: Wallet, color: projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bgColor: projectedBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50' },
    { label: 'Saldo atual', value: currentBalance, icon: PiggyBank, color: currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bgColor: currentBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50' },
  ];

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

  const filterButtons: { label: string; value: QuickFilter }[] = [
    { label: '3 dias', value: '3d' },
    { label: '7 dias', value: '7d' },
    { label: '15 dias', value: '15d' },
    { label: 'Mês', value: 'full' },
  ];

  const handleQuickFilter = (f: QuickFilter) => {
    setQuickFilter(f);
    if (f !== 'custom') setCustomRange(undefined);
  };

  const rangeLabel = format(activeRange.from, "dd MMM", { locale: ptBR }) + ' – ' + format(activeRange.to, "dd MMM", { locale: ptBR });

  const filterBar = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filterButtons.map(f => (
        <Button
          key={f.value}
          variant={quickFilter === f.value ? "default" : "outline"}
          size="sm"
          className="h-7 px-2.5 text-[11px] font-medium"
          onClick={() => handleQuickFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={quickFilter === 'custom' ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-[11px] gap-1.5"
          >
            <CalendarIcon className="w-3 h-3" />
            <span className="capitalize">{quickFilter === 'custom' ? rangeLabel : 'Personalizado'}</span>
            {quickFilter === 'custom' && customRange?.from && customRange?.to && (
              <span
                role="button"
                className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickFilter('full');
                }}
                title="Limpar filtro"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={(range: DateRange | undefined) => {
              if (customRange?.from && customRange?.to) {
                if (range?.from && range?.to) {
                  const prevFromStr = format(customRange.from, 'yyyy-MM-dd');
                  const newFromStr = format(range.from, 'yyyy-MM-dd');
                  const prevToStr = format(customRange.to, 'yyyy-MM-dd');
                  const newToStr = format(range.to, 'yyyy-MM-dd');
                  if (newFromStr !== prevFromStr) {
                    setCustomRange({ from: range.from, to: undefined });
                  } else if (newToStr !== prevToStr) {
                    setCustomRange({ from: range.to, to: undefined });
                  } else {
                    setCustomRange({ from: range.from, to: undefined });
                  }
                  return;
                }
              }
              setCustomRange(range);
              if (range?.from && range?.to) {
                setQuickFilter('custom');
              }
            }}
            fromDate={monthStart}
            toDate={monthEnd}
            numberOfMonths={1}
            defaultMonth={selectedMonth}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Balance summary strip */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main bar chart */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">Entradas vs Saídas</CardTitle>
                <CardDescription className="text-xs capitalize">{rangeLabel}</CardDescription>
              </div>
              {filterBar}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.9} />
                <Bar dataKey="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Despesas por Categoria</CardTitle>
            <CardDescription className="text-xs">Distribuição do mês</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <PiggyBank className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma despesa</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Registre despesas para ver o gráfico</p>
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

      {/* Trend line */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold">Evolução do Saldo</CardTitle>
              <CardDescription className="text-xs capitalize">{rangeLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={saldoData}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" fill="url(#saldoGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
