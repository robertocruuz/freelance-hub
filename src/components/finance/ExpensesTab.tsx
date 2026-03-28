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
  const [recurringGroupId, setRecurringGroupId] = useState<string | null>(null);

  const resetForm = () => {
    setDescription(''); setCategory('outros'); setAmount(''); setDueDate(undefined); setPaymentMethod(''); setNotes(''); setIsRecurring(false); setRecurringMonths('12'); setRecurringGroupId(null);
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
    setRecurringGroupId(e.recurring_group_id || null);
    setDialogOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const handleSave = async () => {
    if (!description || !amount) return;
    const groupId = recurringGroupId || (isRecurring ? crypto.randomUUID() : null);
    const data = {
      description,
      category,
      amount: parseFloat(amount),
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      payment_method: paymentMethod || null,
      notes: notes || null,
      status: 'pending' as string,
      client_id: null,
      project_id: null,
      paid_date: null,
      is_recurring: isRecurring,
      recurring_months: isRecurring ? parseInt(recurringMonths) || 12 : null,
      recurring_group_id: isRecurring ? groupId : null,
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
    <div className="relative h-full flex flex-col">
      {/* Action Button (Absolute Top Right) */}
      {!dialogOpen && (
        <div className="absolute -top-12 right-0 flex items-center z-10">
          <Button onClick={openNew} size="sm" className="rounded-xl gap-1.5 font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      )}

      {/* Main Card Content */}
      <div className="border border-border bg-card rounded-2xl p-4 sm:p-6 flex-1 flex flex-col">
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

      {dialogOpen && (
        <div ref={formRef} className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 animate-fade-in">
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
                  'w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 bg-background/95 text-primary shadow-sm dark:border-white/20 dark:bg-card dark:hover:border-white/40',
                  isRecurring ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/60'
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">Nenhuma despesa encontrada</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Clique em "Nova Despesa" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(e => {
            const config = statusConfig[e.status] || statusConfig.pending;
            return (
              <div key={e.id} className="group rounded-xl border border-border bg-card transition-all">
                <div className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center text-lg shrink-0">
                    {categoryIcons[e.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{e.description}</p>
                      {e.is_recurring && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
                          <Repeat className="w-2.5 h-2.5" />
                          {e.recurring_months}m
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <StatusBadge status={e.status} onChangeStatus={(s) => {
                        if (s === 'paid') markAsPaid(e.id);
                        else updateExpense(e.id, { status: s, paid_date: null });
                      }} />
                      {e.due_date && (
                        <span className="tabular-nums">{format(new Date(e.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm tabular-nums text-foreground">{formatCurrency(e.amount)}</p>
                    {e.payment_method && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(e)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não poderá ser desfeita.</AlertDialogDescription>
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
            );
          })}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
