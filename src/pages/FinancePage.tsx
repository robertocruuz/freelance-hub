import { useState, useEffect, useRef } from 'react';
import { addMonths, subMonths, addDays, isPast, isBefore, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';
import { useFinanceInvoices } from '@/hooks/useFinanceInvoices';
import FinanceSummaryCards from '@/components/finance/FinanceSummaryCards';
import ReceivablesTab from '@/components/finance/ReceivablesTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import CashFlowTab from '@/components/finance/CashFlowTab';
import FinanceCalendarTab from '@/components/finance/FinanceCalendarTab';
import FinanceOverviewTab from '@/components/finance/FinanceOverviewTab';
import { BarChart3, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, LayoutDashboard, Filter, CalendarIcon } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InvoicePrefillDraft } from '@/types/finance';

type ViewMode = 'month' | 'overview';
type AutoEditTarget = { type: 'receivable' | 'expense'; id: string; token: number } | null;

export default function FinancePage() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const { invoices, fetchInvoices } = useFinanceInvoices();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [autoEditTarget, setAutoEditTarget] = useState<AutoEditTarget>(null);
  const [invoicePrefillDraft, setInvoicePrefillDraft] = useState<InvoicePrefillDraft | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [overviewFiltersOpen, setOverviewFiltersOpen] = useState(false);
  const [overviewFilterCount, setOverviewFilterCount] = useState(0);

  const handleEventClick = (type: 'receivable' | 'expense', id: string) => {
    setAutoEditTarget({ type, id, token: Date.now() });
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    if (!user) return;
    const checkRole = async () => {
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();
      if (member && (member as any).role === 'collaborator') {
        setIsAdmin(false);
      }
      setRoleChecked(true);
    };
    checkRole();
  }, [user]);

  useEffect(() => {
    const fromTask = searchParams.get('from_task');
    if (!fromTask) return;

    const description = searchParams.get('desc') || '';
    const invoiceName = searchParams.get('name') || description || 'Nova Fatura';
    const value = parseFloat(searchParams.get('value') || '0');
    const clientId = searchParams.get('client') || '';
    const projectId = searchParams.get('project') || '';
    const dueDate = searchParams.get('due_date');

    setViewMode('month');
    setInvoicePrefillDraft({
      sourceTaskId: fromTask,
      invoiceName,
      clientId,
      projectId,
      dueDate,
      items: description
        ? [{ description, quantity: 1, unitPrice: Number.isFinite(value) ? value : 0 }]
        : [],
    });

    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  if (roleChecked && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const monthStr = format(selectedMonth, 'yyyy-MM');
  const monthLabel = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });
  const isCurrentMonth = format(new Date(), 'yyyy-MM') === monthStr;

  const receivedThisMonth = invoices
    .filter(i => i.status === 'paid' && i.due_date && i.due_date.startsWith(monthStr))
    .reduce((s, i) => s + i.total, 0);

  const paidThisMonth = expenses
    .filter(e => (e.due_date && e.due_date.startsWith(monthStr)) || (e.paid_date && e.paid_date.startsWith(monthStr)))
    .reduce((s, e) => s + e.amount, 0);

  const totalReceivable = invoices
    .filter(i => i.status !== 'paid' && i.due_date && i.due_date.startsWith(monthStr))
    .reduce((s, i) => s + i.total, 0);

  const allDueItems = [
    ...invoices.filter(i => i.status !== 'paid' && i.due_date && i.due_date.startsWith(monthStr)).map(i => i.due_date!),
    ...expenses.filter(e => e.status !== 'paid' && e.due_date && e.due_date.startsWith(monthStr)).map(e => e.due_date!),
  ];
  const now = new Date();
  const nextDueCount = allDueItems.filter(d =>
    isBefore(new Date(d + 'T12:00:00'), addDays(now, 7)) &&
    !isPast(new Date(d + 'T23:59:59'))
  ).length;

  const balance = receivedThisMonth - paidThisMonth;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
      {/* Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2">
            {viewMode === 'month' ? monthLabel : `Ano: ${selectedMonth.getFullYear()}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 xl:gap-6">
          {/* View mode toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="bg-card shadow-sm border border-border rounded-[12px] h-10 p-1">
              <TabsTrigger value="overview" className="gap-2 text-sm font-medium rounded-[8px] px-4">
                <LayoutDashboard className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2 text-sm font-medium rounded-[8px] px-4">
                <CalendarIcon className="w-4 h-4" />
                Visão Mensal
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Date navigation */}
          {viewMode === 'month' && (
            <div className="flex items-center h-10 p-1 rounded-[12px] bg-card shadow-sm border border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))} aria-label="Mês anterior">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <button
                onClick={() => setSelectedMonth(new Date())}
                className={`text-sm font-medium capitalize px-4 h-8 flex items-center justify-center transition-colors ${isCurrentMonth ? 'text-foreground hover:bg-muted/50 rounded-[8px]' : 'text-primary hover:bg-primary/10 rounded-[8px] cursor-pointer'}`}
                title={isCurrentMonth ? monthLabel : 'Voltar ao mês atual'}
              >
                {monthLabel}
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} aria-label="Próximo mês">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {viewMode === 'overview' && (
            <div className="flex items-center gap-3">
            <div className="flex items-center h-10 p-1 rounded-[12px] bg-card shadow-sm border border-border">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))} aria-label="Ano anterior">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => setSelectedMonth(new Date())}
                  className={`text-sm font-medium px-4 h-8 flex items-center justify-center transition-colors ${selectedMonth.getFullYear() === new Date().getFullYear() ? 'text-foreground hover:bg-muted/50 rounded-[8px]' : 'text-primary hover:bg-primary/10 rounded-[8px] cursor-pointer'}`}
                >
                  {selectedMonth.getFullYear()}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))} aria-label="Próximo ano">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant={overviewFiltersOpen ? 'default' : 'outline'}
                className="h-10 px-5 rounded-[8px] text-sm font-medium gap-2 shadow-sm border-border/50 transition-all hover:bg-muted hover:text-foreground"
                onClick={() => setOverviewFiltersOpen(prev => !prev)}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {overviewFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black shadow-sm">
                    {overviewFilterCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Overview mode */}
      {viewMode === 'overview' && (
        <FinanceOverviewTab invoices={invoices} selectedYear={selectedMonth.getFullYear()} onResetToMonthly={() => setViewMode('month')} filtersOpen={overviewFiltersOpen} onFiltersOpenChange={setOverviewFiltersOpen} onActiveFilterCountChange={setOverviewFilterCount} />
      )}

      {/* Month mode */}
      {viewMode === 'month' && (
        <>
          {/* Summary Cards */}
          <FinanceSummaryCards
            balance={balance}
            receivedThisMonth={receivedThisMonth}
            paidThisMonth={paidThisMonth}
            totalReceivable={totalReceivable}
            nextDueCount={nextDueCount}
          />

          {/* Calendar - always visible below cards */}
          <FinanceCalendarTab invoices={invoices} onRefresh={fetchInvoices} onEventClick={handleEventClick} />

          {/* 2 Columns: Receivables & Payables */}
          <div ref={tabsRef} className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
            {/* Receivables Column */}
            <div className="relative flex flex-col">
              <div className="flex items-center gap-2 mb-4 h-8">
                <div className="w-8 h-8 rounded-[8px] bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">A Receber</h2>
              </div>
              <div className="h-full flex flex-col">
                <ReceivablesTab
                  invoices={invoices}
                  onRefresh={fetchInvoices}
                  monthFilter={monthStr}
                  autoEditId={autoEditTarget?.type === 'receivable' ? `${autoEditTarget.id}:${autoEditTarget.token}` : null}
                  onAutoEditDone={() => setAutoEditTarget(null)}
                  prefillDraft={invoicePrefillDraft}
                  onPrefillApplied={() => setInvoicePrefillDraft(null)}
                />
              </div>
            </div>
            
            {/* Payables Column */}
            <div className="relative flex flex-col">
              <div className="flex items-center gap-2 mb-4 h-8">
                <div className="w-8 h-8 rounded-[8px] bg-red-500/10 flex items-center justify-center shrink-0">
                  <ArrowUpFromLine className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">A Pagar</h2>
              </div>
              <div className="h-full flex flex-col">
                <ExpensesTab monthFilter={monthStr} autoEditId={autoEditTarget?.type === 'expense' ? `${autoEditTarget.id}:${autoEditTarget.token}` : null} onAutoEditDone={() => setAutoEditTarget(null)} />
              </div>
            </div>
          </div>

          {/* Cash Flow */}
          <div className="flex flex-col gap-5 mt-8">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Fluxo de Caixa</h2>
             </div>
             <CashFlowTab invoices={invoices} monthFilter={monthStr} />
          </div>
        </>
      )}
    </div>
  );
}

