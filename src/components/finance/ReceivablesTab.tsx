import { format, isPast, isToday, addDays, isBefore } from 'date-fns';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
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
          <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
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

  const displayInvoices = invoices.map(inv => {
    if (inv.status === 'pending' && inv.due_date && isPast(new Date(inv.due_date + 'T23:59:59')) && !isToday(new Date(inv.due_date + 'T12:00:00'))) {
      return { ...inv, status: 'overdue' };
    }
    return inv;
  });

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

  return (
    <div className="space-y-4">
      {nearDue.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-primary">💰 {nearDue.length} fatura(s) vencem nos próximos 3 dias</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 justify-between">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/invoices')}>
          <ExternalLink className="w-4 h-4 mr-1" /> Ir para Faturas
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma fatura encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <Card key={inv.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-foreground truncate">{inv.name || 'Fatura sem nome'}</p>
                    <StatusBadge status={inv.status} onChangeStatus={(s) => handleChangeStatus(inv.id, s)} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {clientName(inv.client_id) && <span>{clientName(inv.client_id)}</span>}
                    {inv.due_date && <span>• Vence: {format(new Date(inv.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm whitespace-nowrap">{formatCurrency(inv.total)}</span>
                  {inv.status !== 'paid' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleMarkPaid(inv.id)}>
                      <Check className="w-3 h-3 mr-1" /> Recebido
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
