import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format, isPast, isToday, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from '@/hooks/useExpenses';
import { CalendarIcon } from 'lucide-react';

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500', label: 'Pendente' },
  paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Pago' },
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

export default function ExpensesTab() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, markAsPaid } = useExpenses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('outros');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setDescription(''); setCategory('outros'); setAmount(''); setDueDate(undefined); setPaymentMethod(''); setNotes('');
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setDescription(e.description);
    setCategory(e.category);
    setAmount(String(e.amount));
    setDueDate(e.due_date ? new Date(e.due_date + 'T12:00:00') : undefined);
    setPaymentMethod(e.payment_method || '');
    setNotes(e.notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!description || !amount) return;
    const data = {
      description,
      category,
      amount: parseFloat(amount),
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      payment_method: paymentMethod || null,
      notes: notes || null,
      status: 'pending' as string,
      client_id: null,
      paid_date: null,
    };
    let ok: boolean | undefined;
    if (editing) {
      ok = await updateExpense(editing.id, data);
    } else {
      ok = await addExpense(data);
    }
    if (ok) { setDialogOpen(false); resetForm(); }
  };

  // Auto-update overdue
  const displayExpenses = expenses.map(e => {
    if (e.status === 'pending' && e.due_date && isPast(new Date(e.due_date + 'T23:59:59')) && !isToday(new Date(e.due_date + 'T12:00:00'))) {
      return { ...e, status: 'overdue' };
    }
    return e;
  });

  const filtered = displayExpenses.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  // Alert for near due dates
  const nearDue = displayExpenses.filter(e =>
    e.status === 'pending' && e.due_date &&
    isBefore(new Date(e.due_date + 'T12:00:00'), addDays(new Date(), 3)) &&
    !isPast(new Date(e.due_date + 'T23:59:59'))
  );

  return (
    <div className="space-y-4">
      {nearDue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">⚠️ {nearDue.length} despesa(s) com vencimento nos próximos 3 dias</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Despesa</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma despesa encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <Card key={e.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-foreground truncate">{e.description}</p>
                    <Badge variant="outline" className="text-[10px]">{EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category}</Badge>
                    <StatusBadge status={e.status} onChangeStatus={(s) => {
                      if (s === 'paid') markAsPaid(e.id);
                      else updateExpense(e.id, { status: s, paid_date: null });
                    }} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {e.due_date && <span>Vence: {format(new Date(e.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>}
                    {e.payment_method && <span>• {PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm whitespace-nowrap">{formatCurrency(e.amount)}</span>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(e)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteExpense(e.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Assinatura Adobe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" min="0" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
