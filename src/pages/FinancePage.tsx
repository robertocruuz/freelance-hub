import { useState, useEffect, useCallback, useRef } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths, addDays, isPast, isBefore, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';
import FinanceSummaryCards from '@/components/finance/FinanceSummaryCards';
import ReceivablesTab from '@/components/finance/ReceivablesTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import CashFlowTab from '@/components/finance/CashFlowTab';
import FinanceCalendarTab from '@/components/finance/FinanceCalendarTab';
import FinanceOverviewTab from '@/components/finance/FinanceOverviewTab';
import { BarChart3, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, LayoutDashboard, Filter, CalendarIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export interface FinanceInvoice {
  id: string;
  name: string | null;
  client_id: string | null;
  project_id: string | null;
  total: number;
  status: string;
  due_date: string | null;
  payment_method: string | null;
  created_at: string;
}

type ViewMode = 'month' | 'overview';

export default function FinancePage() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('cashflow');
  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [overviewFiltersOpen, setOverviewFiltersOpen] = useState(false);
  const [overviewFilterCount, setOverviewFilterCount] = useState(0);

  const handleEventClick = (type: 'receivable' | 'expense', id: string) => {
    setAutoEditId(id);
    setActiveTab(type === 'receivable' ? 'receivables' : 'payables');
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

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('invoices')
      .select('id, name, client_id, project_id, total, status, due_date, payment_method, created_at')
      .order('due_date', { ascending: true, nullsFirst: false });
    setInvoices((data as FinanceInvoice[]) || []);
  }, [user]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

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

  const tabItems = [
    { value: 'cashflow', label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: BarChart3 },
    { value: 'receivables', label: 'A Receber', shortLabel: 'Receber', icon: ArrowDownToLine },
    { value: 'payables', label: 'A Pagar', shortLabel: 'Pagar', icon: ArrowUpFromLine },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
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
          <div className="flex items-center p-1 rounded-full bg-muted/50 border border-border/50 shadow-sm">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-2 ${
                viewMode === 'overview'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-2 ${
                viewMode === 'month'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Visão Mensal
            </button>
          </div>
          {/* Date navigation */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/30 border border-border/50">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background transition-colors" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))} aria-label="Mês anterior">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <button
                onClick={() => setSelectedMonth(new Date())}
                className={`text-sm font-bold capitalize px-4 py-1.5 rounded-full transition-colors ${isCurrentMonth ? 'text-foreground hover:bg-muted/50' : 'text-primary hover:bg-primary/10 cursor-pointer'}`}
                title={isCurrentMonth ? monthLabel : 'Voltar ao mês atual'}
              >
                {monthLabel}
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background transition-colors" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} aria-label="Próximo mês">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {viewMode === 'overview' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-full bg-muted/30 border border-border/50">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background transition-colors" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))} aria-label="Ano anterior">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => setSelectedMonth(new Date())}
                  className={`text-sm font-bold px-4 py-1.5 rounded-full transition-colors ${selectedMonth.getFullYear() === new Date().getFullYear() ? 'text-foreground hover:bg-muted/50' : 'text-primary hover:bg-primary/10 cursor-pointer'}`}
                >
                  {selectedMonth.getFullYear()}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background transition-colors" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))} aria-label="Próximo ano">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant={overviewFiltersOpen ? 'default' : 'outline'}
                className="h-10 px-5 rounded-full text-xs font-bold gap-2 shadow-sm border-border/50 transition-all hover:bg-muted"
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

          {/* Tabs */}
          <div ref={tabsRef}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-auto p-1.5 bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl gap-2" aria-label="Seções financeiras">
                {tabItems.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 gap-2 py-3.5 rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-muted/50 data-[state=active]:hover:bg-primary"
                    aria-label={tab.label}
                  >
                    <tab.icon className="w-4 h-4" aria-hidden="true" />
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="cashflow" className="mt-6"><CashFlowTab invoices={invoices} monthFilter={monthStr} /></TabsContent>
              <TabsContent value="receivables" className="mt-5"><ReceivablesTab invoices={invoices} onRefresh={fetchInvoices} monthFilter={monthStr} autoEditId={autoEditId} onAutoEditDone={() => setAutoEditId(null)} /></TabsContent>
              <TabsContent value="payables" className="mt-5"><ExpensesTab monthFilter={monthStr} autoEditId={autoEditId} onAutoEditDone={() => setAutoEditId(null)} /></TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
