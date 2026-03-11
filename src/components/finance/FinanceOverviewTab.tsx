import { useMemo } from 'react';
import { format, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import type { FinanceInvoice } from '@/pages/FinancePage';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Users, Receipt,
  AlertTriangle, Target,
} from 'lucide-react';

const PIE_COLORS = [
  'hsl(225, 100%, 50%)', 'hsl(80, 85%, 45%)', 'hsl(0, 72%, 51%)',
  'hsl(45, 93%, 47%)', 'hsl(280, 60%, 55%)', 'hsl(170, 60%, 45%)', 'hsl(220, 15%, 60%)',
];

interface Props {
  invoices: FinanceInvoice[];
  selectedYear: number;
}

export default function FinanceOverviewTab({ invoices, selectedYear }: Props) {
  const { expenses } = useExpenses();

  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const yearStr = String(selectedYear);

  // Filter data to this year
  const yearInvoices = invoices.filter(i => i.due_date?.startsWith(yearStr));
  const yearExpenses = expenses.filter(e =>
    (e.due_date?.startsWith(yearStr)) || (e.paid_date?.startsWith(yearStr))
  );

  // === ANNUAL SUMMARY ===
  const totalReceived = yearInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalSpent = yearExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPending = yearInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalExpensesPending = yearExpenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const annualBalance = totalReceived - totalSpent;

  // === KPIs ===
  const paidInvoiceCount = yearInvoices.filter(i => i.status === 'paid').length;
  const avgTicket = paidInvoiceCount > 0 ? totalReceived / paidInvoiceCount : 0;

  const overdueInvoices = yearInvoices.filter(i => {
    if (i.status === 'paid' || !i.due_date) return false;
    return new Date(i.due_date + 'T23:59:59') < new Date();
  });
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.total, 0);
  const overdueRate = yearInvoices.length > 0
    ? (overdueInvoices.length / yearInvoices.length) * 100
    : 0;

  // Top client by revenue
  const clientRevenue: Record<string, number> = {};
  yearInvoices.filter(i => i.status === 'paid' && i.client_id).forEach(i => {
    clientRevenue[i.client_id!] = (clientRevenue[i.client_id!] || 0) + i.total;
  });
  const topClientId = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1])[0];

  // === MONTHLY COMPARISON ===
  const monthlyData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date?.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date?.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    return {
      name: format(month, 'MMM', { locale: ptBR }),
      Entradas: entradas,
      Saídas: saidas,
      Saldo: entradas - saidas,
    };
  });

  // Cumulative balance
  let cumulative = 0;
  const cumulativeData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date?.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date?.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    cumulative += entradas - saidas;
    return { name: format(month, 'MMM', { locale: ptBR }), Acumulado: cumulative };
  });

  // Category breakdown
  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = yearExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
    return { name: cat.label, value: total };
  }).filter(d => d.value > 0);

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
    { label: 'Saldo anual', value: annualBalance, icon: Wallet, color: annualBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bgColor: annualBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50' },
  ];

  const kpiItems = [
    { label: 'Ticket médio', value: formatCurrency(avgTicket), icon: Target, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Faturas pagas', value: String(paidInvoiceCount), icon: Receipt, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
    { label: 'Inadimplência', value: `${overdueRate.toFixed(1)}%`, subValue: formatCurrency(overdueAmount), icon: AlertTriangle, color: overdueRate > 20 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400', bgColor: overdueRate > 20 ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-900/50' },
    { label: 'A pagar', value: formatCurrency(totalExpensesPending), icon: PiggyBank, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/50' },
  ];

  return (
    <div className="space-y-5">
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
            <CardDescription className="text-xs">Entradas vs Saídas — {yearStr}</CardDescription>
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
            <CardDescription className="text-xs">Distribuição anual</CardDescription>
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
            <CardDescription className="text-xs">Saldo acumulado mês a mês — {yearStr}</CardDescription>
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
            <CardDescription className="text-xs">Resultado de cada mês — {yearStr}</CardDescription>
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
