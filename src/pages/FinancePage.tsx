import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, addDays, isPast, isToday, isBefore, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';
import FinanceSummaryCards from '@/components/finance/FinanceSummaryCards';
import ReceivablesTab from '@/components/finance/ReceivablesTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import CashFlowTab from '@/components/finance/CashFlowTab';
import FinanceCalendarTab from '@/components/finance/FinanceCalendarTab';
import { BarChart3, ArrowDownToLine, ArrowUpFromLine, CalendarDays } from 'lucide-react';

export interface FinanceInvoice {
  id: string;
  name: string | null;
  client_id: string | null;
  total: number;
  status: string;
  due_date: string | null;
  payment_method: string | null;
  created_at: string;
}

export default function FinancePage() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('invoices')
      .select('id, name, client_id, total, status, due_date, payment_method, created_at')
      .order('due_date', { ascending: true, nullsFirst: false });
    setInvoices((data as FinanceInvoice[]) || []);
  }, [user]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const now = new Date();
  const monthStr = format(now, 'yyyy-MM');
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  const receivedThisMonth = invoices
    .filter(i => i.status === 'paid' && i.due_date && i.due_date.startsWith(monthStr))
    .reduce((s, i) => s + i.total, 0);

  const paidThisMonth = expenses
    .filter(e => e.status === 'paid' && e.paid_date && e.paid_date.startsWith(monthStr))
    .reduce((s, e) => s + e.amount, 0);

  const totalReceivable = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + i.total, 0);

  const allDueItems = [
    ...invoices.filter(i => i.status !== 'paid' && i.due_date).map(i => i.due_date!),
    ...expenses.filter(e => e.status !== 'paid' && e.due_date).map(e => e.due_date!),
  ];
  const nextDueCount = allDueItems.filter(d =>
    isBefore(new Date(d + 'T12:00:00'), addDays(now, 7)) &&
    !isPast(new Date(d + 'T23:59:59'))
  ).length;

  const balance = receivedThisMonth - paidThisMonth;

  const tabItems = [
    { value: 'cashflow', label: 'Fluxo de Caixa', icon: BarChart3 },
    { value: 'receivables', label: 'A Receber', icon: ArrowDownToLine },
    { value: 'payables', label: 'A Pagar', icon: ArrowUpFromLine },
    { value: 'calendar', label: 'Calendário', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Balanço do mês:</span>
          <span className={`font-bold text-base ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <FinanceSummaryCards
        receivedThisMonth={receivedThisMonth}
        paidThisMonth={paidThisMonth}
        totalReceivable={totalReceivable}
        nextDueCount={nextDueCount}
      />

      {/* Tabs */}
      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/60 backdrop-blur-sm rounded-xl gap-1">
          {tabItems.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 gap-2 py-2.5 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="cashflow" className="mt-5"><CashFlowTab invoices={invoices} /></TabsContent>
        <TabsContent value="receivables" className="mt-5"><ReceivablesTab invoices={invoices} onRefresh={fetchInvoices} /></TabsContent>
        <TabsContent value="payables" className="mt-5"><ExpensesTab /></TabsContent>
        <TabsContent value="calendar" className="mt-5"><FinanceCalendarTab invoices={invoices} /></TabsContent>
      </Tabs>
    </div>
  );
}
