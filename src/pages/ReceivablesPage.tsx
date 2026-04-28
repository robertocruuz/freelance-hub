import { useEffect, useRef, useState } from 'react';
import { addDays, addMonths, format, isBefore, isPast, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownToLine, CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, Wallet } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import FinanceCalendarTab from '@/components/finance/FinanceCalendarTab';
import ReceivablesTab from '@/components/finance/ReceivablesTab';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceInvoices } from '@/hooks/useFinanceInvoices';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import type { InvoicePrefillDraft } from '@/types/finance';

type AutoEditTarget = { id: string; token: number } | null;

export default function ReceivablesPage() {
  const { user } = useAuth();
  const { invoices, fetchInvoices } = useFinanceInvoices();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [autoEditTarget, setAutoEditTarget] = useState<AutoEditTarget>(null);
  const [invoicePrefillDraft, setInvoicePrefillDraft] = useState<InvoicePrefillDraft | null>(null);
  const moduleRef = useRef<HTMLDivElement>(null);

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
      moduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    .filter((invoice) => invoice.status === 'paid' && invoice.due_date?.startsWith(monthStr))
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const pendingThisMonth = invoices
    .filter((invoice) => invoice.status === 'pending' && invoice.due_date?.startsWith(monthStr))
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const overdueThisMonth = invoices
    .filter((invoice) => invoice.status === 'overdue' && invoice.due_date?.startsWith(monthStr))
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const nextDueCount = invoices.filter((invoice) => {
    if (invoice.status === 'paid' || !invoice.due_date || !invoice.due_date.startsWith(monthStr)) return false;
    return (
      isBefore(new Date(invoice.due_date + 'T12:00:00'), addDays(new Date(), 7)) &&
      !isPast(new Date(invoice.due_date + 'T23:59:59'))
    );
  }).length;

  const handleEventClick = (id: string) => {
    setAutoEditTarget({ id, token: Date.now() });
    setTimeout(() => {
      moduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const cards = [
    {
      label: 'Recebido no mês',
      value: formatCurrency(receivedThisMonth),
      icon: CircleDollarSign,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Pendente no mês',
      value: formatCurrency(pendingThisMonth),
      icon: Wallet,
      iconBg: 'bg-primary/10 dark:bg-primary/20',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Atrasado no mês',
      value: formatCurrency(overdueThisMonth),
      icon: ArrowDownToLine,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
    },
    {
      label: 'Vencimentos (7d)',
      value: nextDueCount === 1 ? '1 item' : `${nextDueCount} itens`,
      icon: CalendarClock,
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-8 sm:space-y-10 animate-fade-in fill-mode-forwards opacity-0">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">
            Contas a Receber
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2">
            {monthLabel}
          </p>
        </div>

        <div className="flex items-center h-10 p-1 rounded-[12px] bg-card shadow-sm border border-border">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth((prev) => subMonths(prev, 1))} aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setSelectedMonth(new Date())}
            className={`text-sm font-medium capitalize px-4 h-8 flex items-center justify-center transition-colors ${isCurrentMonth ? 'text-foreground hover:bg-muted/50 rounded-[8px]' : 'text-primary hover:bg-primary/10 rounded-[8px] cursor-pointer'}`}
            title={isCurrentMonth ? monthLabel : 'Voltar ao mês atual'}
          >
            {monthLabel}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[8px] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))} aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{card.label}</p>
            <p className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${card.valueColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <FinanceCalendarTab
        invoices={invoices}
        onRefresh={fetchInvoices}
        onEventClick={(type, id) => {
          if (type === 'receivable') handleEventClick(id);
        }}
        eventScope="receivables"
      />

      <div ref={moduleRef} className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[8px] bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Módulo completo de contas a receber</h2>
        </div>

        <ReceivablesTab
          invoices={invoices}
          onRefresh={fetchInvoices}
          monthFilter={monthStr}
          autoEditId={autoEditTarget ? `${autoEditTarget.id}:${autoEditTarget.token}` : null}
          onAutoEditDone={() => setAutoEditTarget(null)}
          prefillDraft={invoicePrefillDraft}
          onPrefillApplied={() => setInvoicePrefillDraft(null)}
        />
      </div>
    </div>
  );
}
