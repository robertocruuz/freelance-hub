import { useState } from 'react';
import { format, startOfMonth, subMonths, eachMonthOfInterval, endOfMonth } from 'date-fns';
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
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CalendarIcon } from 'lucide-react';

const PIE_COLORS = [
  'hsl(225, 100%, 50%)',
  'hsl(80, 85%, 45%)',
  'hsl(0, 72%, 51%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 60%, 55%)',
  'hsl(170, 60%, 45%)',
  'hsl(220, 15%, 60%)',
];

interface Props {
  invoices: FinanceInvoice[];
}

export default function CashFlowTab({ invoices }: Props) {
  const { expenses } = useExpenses();
  const now = new Date();

  const [barRange, setBarRange] = useState<DateRange>({
    from: subMonths(startOfMonth(now), 5),
    to: endOfMonth(now),
  });
  const [saldoRange, setSaldoRange] = useState<DateRange>({
    from: subMonths(startOfMonth(now), 5),
    to: endOfMonth(now),
  });

  const startDate = barRange.from ?? subMonths(startOfMonth(now), 5);
  const endDate = barRange.to ?? endOfMonth(now);
  const saldoStartDate = saldoRange.from ?? subMonths(startOfMonth(now), 5);
  const saldoEndDate = saldoRange.to ?? endOfMonth(now);

  const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
  const saldoMonths = eachMonthOfInterval({ start: startOfMonth(saldoStartDate), end: endOfMonth(saldoEndDate) });

  const totalReceivable = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalPayable = expenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const projectedBalance = totalReceivable - totalPayable;
  const currentBalance = totalReceived - totalPaid;

  const barData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date && i.due_date.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date && e.paid_date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    return { name: format(month, 'MMM/yy', { locale: ptBR }), Entradas: entradas, Saídas: saidas, Saldo: entradas - saidas };
  });


  const saldoData = saldoMonths.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date && i.due_date.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date && e.paid_date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    return { name: format(month, 'MMM/yy', { locale: ptBR }), Saldo: entradas - saidas };
  });

  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
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

  const quickRanges = [
    { label: '3M', monthsBack: 2 },
    { label: '6M', monthsBack: 5 },
    { label: '12M', monthsBack: 11 },
  ];

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
                <CardDescription className="text-xs capitalize">
                  {format(startDate, "MMM/yyyy", { locale: ptBR })} — {format(endDate, "MMM/yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {quickRanges.map(r => {
                  const isActive = months.length === r.monthsBack + 1;
                  return (
                    <Button
                      key={r.label}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2.5 text-[11px] font-medium"
                      onClick={() => {
                        setBarRange({ from: subMonths(startOfMonth(now), r.monthsBack), to: endOfMonth(now) });
                      }}
                    >
                      {r.label}
                    </Button>
                  );
                })}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                      <CalendarIcon className="w-3 h-3" />
                      <span className="capitalize">
                        {format(startDate, "dd MMM", { locale: ptBR })} – {format(endDate, "dd MMM yy", { locale: ptBR })}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={barRange}
                      onSelect={(range: DateRange | undefined) => setBarRange(range ?? { from: undefined, to: undefined })}
                      numberOfMonths={2}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} className="capitalize" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Entradas" fill="hsl(225, 100%, 50%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Saídas" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} maxBarSize={32} opacity={0.75} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Despesas por Categoria</CardTitle>
            <CardDescription className="text-xs">Distribuição geral</CardDescription>
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
              <CardDescription className="text-xs capitalize">
                {format(saldoStartDate, "MMM/yyyy", { locale: ptBR })} — {format(saldoEndDate, "MMM/yyyy", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickRanges.map(r => {
                const isActive = saldoMonths.length === r.monthsBack + 1;
                return (
                  <Button
                    key={r.label}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-[11px] font-medium"
                    onClick={() => {
                      setSaldoRange({ from: subMonths(startOfMonth(now), r.monthsBack), to: endOfMonth(now) });
                    }}
                  >
                    {r.label}
                  </Button>
                );
              })}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="capitalize">
                      {format(saldoStartDate, "dd MMM", { locale: ptBR })} – {format(saldoEndDate, "dd MMM yy", { locale: ptBR })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={saldoRange}
                    onSelect={(range: DateRange | undefined) => setSaldoRange(range ?? { from: undefined, to: undefined })}
                    onDayClick={(day) => {
                      if (saldoRange.from && saldoRange.to) {
                        setSaldoRange({ from: day, to: undefined });
                      }
                    }}
                    numberOfMonths={2}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={saldoData}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(225, 100%, 50%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(225, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Saldo" stroke="hsl(225, 100%, 50%)" fill="url(#saldoGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(225, 100%, 50%)', strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}