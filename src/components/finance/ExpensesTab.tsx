import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Receipt, Repeat, ChevronUp } from 'lucide-react';
import { format, isPast, isToday, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from '@/hooks/useExpenses';
import { CalendarIcon, AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500', label: 'Pendente' },
  paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Pago' },
  overdue: { bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500', label: 'Atrasado' },
};

const categoryIcons: Record<string, string> = {
  software: '💻',
  internet: '🌐',
  equipamentos: '🖥️',
  impostos: '📋',
  aluguel: '🏠',
  marketing: '📣',
  outros: '📦',
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

export default function ExpensesTab({ monthFilter, autoEditId, onAutoEditDone }: { monthFilter?: string; autoEditId?: string | null; onAutoEditDone?: () => void }) {
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState('12');

  const resetForm = () => {
    setDescription(''); setCategory('outros'); setAmount(''); setDueDate(undefined); setPaymentMethod(''); setNotes(''); setIsRecurring(false); setRecurringMonths('12');
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100); };
  const formRef = useRef<HTMLDivElement>(null);
  const openEdit = (e: Expense) => {
    setEditing(e);
    setDescription(e.description);
    setCategory(e.category);
    setAmount(String(e.amount));
    setDueDate(e.due_date ? new Date(e.due_date + 'T12:00:00') : undefined);
    setPaymentMethod(e.payment_method || '');
    setNotes(e.notes || '');
    setIsRecurring(e.is_recurring);
    setRecurringMonths(String(e.recurring_months || 12));
    setDialogOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
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
      is_recurring: isRecurring,
      recurring_months: isRecurring ? parseInt(recurringMonths) || 12 : null,
    };
    let ok: boolean | undefined;
    if (editing) {
      ok = await updateExpense(editing.id, data);
    } else {
      ok = await addExpense(data);
    }
    if (ok) { setDialogOpen(false); resetForm(); }
  };

  // Auto-edit from calendar click
  const autoEditProcessed = useRef<string | null>(null);
  useEffect(() => {
    if (autoEditId && autoEditId !== autoEditProcessed.current && expenses.length > 0) {
      const exp = expenses.find(e => e.id === autoEditId);
      if (exp) {
        autoEditProcessed.current = autoEditId;
        openEdit(exp);
        onAutoEditDone?.();
      }
    }
  }, [autoEditId, expenses]);

  // Filter by month first
  const monthExpenses = monthFilter
    ? expenses.filter(e => (e.due_date && e.due_date.startsWith(monthFilter)) || (e.paid_date && e.paid_date.startsWith(monthFilter)))
    : expenses;

  // Auto-update overdue
  const displayExpenses = monthExpenses.map(e => {
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

  // Group: overdue first, then pending, then paid
  const overdueItems = filtered.filter(e => e.status === 'overdue');
  const pendingItems = filtered.filter(e => e.status === 'pending');
  const paidItems = filtered.filter(e => e.status === 'paid');
  const grouped = [...overdueItems, ...pendingItems, ...paidItems];

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {nearDue.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/30 p-4">
          <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{nearDue.length} despesa(s) vencem em breve</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/60">Nos próximos 3 dias</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-9 text-sm rounded-lg"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {EXPENSE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {categoryIcons[c.value] || '📦'} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-9 text-sm rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({expenses.length})</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-foreground">{formatCurrency(totalFiltered)}</span>
            </div>
          )}
        </div>
        <Button onClick={openNew} size="sm" className="rounded-lg gap-1.5">
          <Plus className="w-4 h-4" /> Nova Despesa
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Receipt className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhuma despesa encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Despesa" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(e => {
            const isOverdue = e.status === 'overdue';
            const emoji = categoryIcons[e.category] || '📦';
            return (
              <div
                key={e.id}
                className={cn(
                  'group rounded-xl border bg-card p-4 transition-all hover:shadow-sm',
                  isOverdue && 'border-red-200/60 dark:border-red-800/40 bg-red-50/30 dark:bg-red-950/10'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-base">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">{e.description}</p>
                        <StatusBadge status={e.status} onChangeStatus={(s) => {
                          if (s === 'paid') markAsPaid(e.id);
                          else updateExpense(e.id, { status: s, paid_date: null });
                        }} />
                        {e.is_recurring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-primary/30 bg-primary/10 text-primary">
                            <Repeat className="w-3 h-3" /> Recorrente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-medium rounded-md">
                          {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                        </Badge>
                        {e.due_date && (
                          <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                            {isOverdue ? 'Venceu' : 'Vence'}: {format(new Date(e.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {e.payment_method && (
                          <span className="text-xs text-muted-foreground">• {PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={cn('text-lg font-extrabold tabular-nums tracking-tight', isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                      {formatCurrency(e.amount)}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => openEdit(e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive">
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <div ref={formRef} className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{editing ? 'Editar Despesa' : 'Nova Despesa'}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setDialogOpen(false); resetForm(); }}>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Assinatura Adobe" className="mt-1.5" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{categoryIcons[c.value]} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" min="0" step="0.01" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal mt-1.5', !dueDate && 'text-muted-foreground')}>
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
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  isRecurring ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'
                )}
              >
                {isRecurring && <Repeat className="w-3 h-3" />}
              </button>
              <div className="flex-1">
                <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>Despesa recorrente</Label>
                <p className="text-xs text-muted-foreground">Repetir automaticamente nos próximos meses</p>
              </div>
            </div>
            {isRecurring && (
              <div className="ml-8">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duração da recorrência</Label>
                <Select value={recurringMonths} onValueChange={setRecurringMonths}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? 'Salvar alterações' : 'Adicionar despesa'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
