import { useState, useEffect, useMemo } from 'react';
import { startOfMonth, endOfMonth, addDays, isPast, isToday, isBefore, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';
import FinanceSummaryCards from '@/components/finance/FinanceSummaryCards';
import ReceivablesTab from '@/components/finance/ReceivablesTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import CashFlowTab from '@/components/finance/CashFlowTab';
import FinanceCalendarTab from '@/components/finance/FinanceCalendarTab';

interface Invoice {
  id: string;
  total: number;
  status: string;
  due_date: string | null;
}

export default function FinancePage() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('invoices').select('id, total, status, due_date').then(({ data }) => {
      setInvoices((data as Invoice[]) || []);
    });
  }, [user]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthStr = format(now, 'yyyy-MM');

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Controle seu fluxo de caixa, despesas e recebimentos.</p>
      </div>

      <FinanceSummaryCards
        receivedThisMonth={receivedThisMonth}
        paidThisMonth={paidThisMonth}
        totalReceivable={totalReceivable}
        nextDueCount={nextDueCount}
      />

      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="receivables">A Receber</TabsTrigger>
          <TabsTrigger value="payables">A Pagar</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>
        <TabsContent value="cashflow"><CashFlowTab /></TabsContent>
        <TabsContent value="receivables"><ReceivablesTab /></TabsContent>
        <TabsContent value="payables"><ExpensesTab /></TabsContent>
        <TabsContent value="calendar"><FinanceCalendarTab /></TabsContent>
      </Tabs>
    </div>
  );
}
