import { format, isPast, isToday, addDays, isBefore } from 'date-fns';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';
import { ExternalLink, AlertTriangle, Inbox, Plus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import type { FinanceInvoice } from '@/pages/FinancePage';

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500', label: 'Pendente' },
  paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Recebido' },
  overdue: { bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500', label: 'Atrasado' },
};

function StatusBadge({ status, onChangeStatus }: { status: string; onChangeStatus: (s: string) => void }) {
  const config = statusConfig[status] || statusConfig.pending;
  const options = Object.entries(statusConfig);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity', config.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dot)} />
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {options.map(([key, cfg]) => (
          <DropdownMenuItem key={key} onClick={() => onChangeStatus(key)} className="gap-2 text-xs">
            <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
            {cfg.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Props {
  invoices: FinanceInvoice[];
  onRefresh: () => void;
}

export default function ReceivablesTab({ invoices, onRefresh }: Props) {
  const { clients } = useClients();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');

  const clientName = (id: string | null) => {
    if (!id) return '';
    return clients.find(c => c.id === id)?.name || '';
  };

  // Auto-update overdue invoices in the database
  useEffect(() => {
    const overdueIds = invoices
      .filter(inv => inv.status === 'pending' && inv.due_date && isPast(new Date(inv.due_date + 'T23:59:59')) && !isToday(new Date(inv.due_date + 'T12:00:00')))
      .map(inv => inv.id);
    if (overdueIds.length > 0) {
      Promise.all(overdueIds.map(id => supabase.from('invoices').update({ status: 'overdue' }).eq('id', id)))
        .then(() => onRefresh());
    }
  }, [invoices]);

  const displayInvoices = invoices;

  const filtered = displayInvoices.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  const nearDue = displayInvoices.filter(inv =>
    inv.status === 'pending' && inv.due_date &&
    isBefore(new Date(inv.due_date + 'T12:00:00'), addDays(new Date(), 3)) &&
    !isPast(new Date(inv.due_date + 'T23:59:59'))
  );

  const handleChangeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado');
    onRefresh();
  };

  // Group by status for visual priority
  const overdueItems = filtered.filter(i => i.status === 'overdue');
  const pendingItems = filtered.filter(i => i.status === 'pending');
  const paidItems = filtered.filter(i => i.status === 'paid');
  const grouped = [...overdueItems, ...pendingItems, ...paidItems];

  return (
    <div className="space-y-4">
      {nearDue.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{nearDue.length} fatura(s) vencem em breve</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/60">Nos próximos 3 dias</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-between">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9 text-sm rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({invoices.length})</SelectItem>
            <SelectItem value="pending">Pendente ({invoices.filter(i => i.status === 'pending').length})</SelectItem>
            <SelectItem value="paid">Recebido ({invoices.filter(i => i.status === 'paid').length})</SelectItem>
            <SelectItem value="overdue">Atrasado ({invoices.filter(i => i.status === 'overdue').length})</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-lg gap-1.5" onClick={() => navigate('/dashboard/invoices?new_invoice=1')}>
            <Plus className="w-3.5 h-3.5" /> Nova Fatura
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => navigate('/dashboard/invoices')}>
            <ExternalLink className="w-3.5 h-3.5" /> Faturas
          </Button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhuma fatura encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Crie faturas no módulo de Faturas para visualizá-las aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(inv => {
            const isOverdue = inv.status === 'overdue';
            return (
              <div
                key={inv.id}
                className={cn(
                  'group rounded-xl border bg-card p-4 transition-all hover:shadow-sm',
                  isOverdue && 'border-red-200/60 dark:border-red-800/40 bg-red-50/30 dark:bg-red-950/10'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{inv.name || 'Fatura sem nome'}</p>
                      <StatusBadge status={inv.status} onChangeStatus={(s) => handleChangeStatus(inv.id, s)} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {clientName(inv.client_id) && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                          {clientName(inv.client_id)}
                        </span>
                      )}
                      {inv.due_date && (
                        <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                          {isOverdue ? 'Venceu' : 'Vence'}: {format(new Date(inv.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={cn('text-lg font-extrabold tabular-nums tracking-tight', isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                      {formatCurrency(inv.total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
