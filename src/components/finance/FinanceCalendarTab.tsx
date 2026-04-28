import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { FinanceInvoice } from '@/types/finance';

type EventType = 'receivable' | 'expense' | null;

interface Props {
  invoices: FinanceInvoice[];
  onRefresh?: () => void;
  onEventClick?: (type: 'receivable' | 'expense', id: string) => void;
  eventScope?: 'all' | 'receivables' | 'expenses';
}

export default function FinanceCalendarTab({
  invoices,
  onRefresh,
  onEventClick,
  eventScope = 'all',
}: Props) {
  const { user } = useAuth();
  const { expenses, addExpense, fetchExpenses } = useExpenses();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Quick-create state
  const [chooserOpen, setChooserOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Common form fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  // Expense-specific
  const [category, setCategory] = useState('outros');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setAmount('');
    setPaymentMethod('');
    setCategory('outros');
    setEventType(null);
  };

  const handleChooseType = (type: EventType) => {
    setEventType(type);
    setChooserOpen(false);
    setFormOpen(true);
  };

  const openCreateFlow = () => {
    if (eventScope === 'receivables') {
      setEventType('receivable');
      setFormOpen(true);
      return;
    }

    if (eventScope === 'expenses') {
      setEventType('expense');
      setFormOpen(true);
      return;
    }

    setChooserOpen(true);
  };

  const handleSave = async () => {
    if (!user || !selectedDate) return;
    if (!name.trim()) return toast.error('Informe uma descriÃ§Ã£o.');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return toast.error('Informe um valor vÃ¡lido.');

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (eventType === 'expense') {
      const success = await addExpense({
        description: name.trim(),
        category,
        amount: numAmount,
        due_date: dateStr,
        paid_date: null,
        status: 'pending',
        payment_method: paymentMethod || null,
        notes: null,
        client_id: null,
        project_id: null,
        is_recurring: false,
        recurring_months: null,
      });
      if (success) {
        setFormOpen(false);
        resetForm();
      }
    } else {
      // Create invoice (receivable)
      const invoiceData = {
        user_id: user.id,
        name: name.trim(),
        items: [{ description: name.trim(), quantity: 1, unitPrice: numAmount }] as unknown as Json,
        total: numAmount,
        taxes: 0,
        discount: 0,
        due_date: dateStr,
        payment_method: paymentMethod || null,
        status: 'pending',
        client_id: null,
      };
      const { error } = await supabase.from('invoices').insert(invoiceData);
      if (error) {
        toast.error('Erro ao criar recebimento.');
      } else {
        toast.success('Recebimento criado!');
        onRefresh?.();
        setFormOpen(false);
        resetForm();
      }
    }
    setSaving(false);
  };

  const eventDates = useMemo(() => {
    const map = new Map<string, { receivables: number; payables: number }>();
    if (eventScope !== 'expenses') {
      invoices.forEach(i => {
        if (!i.due_date) return;
        const existing = map.get(i.due_date) || { receivables: 0, payables: 0 };
        existing.receivables += 1;
        map.set(i.due_date, existing);
      });
    }
    if (eventScope !== 'receivables') {
      expenses.forEach(e => {
        if (!e.due_date) return;
        const existing = map.get(e.due_date) || { receivables: 0, payables: 0 };
        existing.payables += 1;
        map.set(e.due_date, existing);
      });
    }
    return map;
  }, [eventScope, expenses, invoices]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return { expenses: [] as Expense[], invoices: [] as FinanceInvoice[] };
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return {
      expenses: eventScope === 'receivables' ? [] : expenses.filter(e => e.due_date === dateStr),
      invoices: eventScope === 'expenses' ? [] : invoices.filter(i => i.due_date === dateStr),
    };
  }, [selectedDate, eventScope, expenses, invoices]);

  const totalReceivables = selectedEvents.invoices.reduce((s, i) => s + i.total, 0);
  const totalPayables = selectedEvents.expenses.reduce((s, e) => s + e.amount, 0);
  const hasEvents = selectedEvents.invoices.length > 0 || selectedEvents.expenses.length > 0;

  const receivableDates = useMemo(() => {
    const dates: Date[] = [];
    eventDates.forEach((val, key) => {
      if (val.receivables > 0 && val.payables === 0) dates.push(new Date(key + 'T12:00:00'));
    });
    return dates;
  }, [eventDates]);

  const payableDates = useMemo(() => {
    const dates: Date[] = [];
    eventDates.forEach((val, key) => {
      if (val.payables > 0 && val.receivables === 0) dates.push(new Date(key + 'T12:00:00'));
    });
    return dates;
  }, [eventDates]);

  const mixedDates = useMemo(() => {
    const dates: Date[] = [];
    eventDates.forEach((val, key) => {
      if (val.receivables > 0 && val.payables > 0) dates.push(new Date(key + 'T12:00:00'));
    });
    return dates;
  }, [eventDates]);

  const getDayMarker = (date: Date): 'receivable' | 'payable' | 'mixed' | null => {
    const key = format(date, 'yyyy-MM-dd');
    const counts = eventDates.get(key);
    if (!counts) return null;
    if (counts.receivables > 0 && counts.payables > 0) return 'mixed';
    if (counts.receivables > 0) return 'receivable';
    if (counts.payables > 0) return 'payable';
    return null;
  };

  const emptyStateTitle =
    eventScope === 'receivables'
      ? 'Nenhum recebimento nesta data'
      : eventScope === 'expenses'
        ? 'Nenhuma despesa nesta data'
        : 'Nenhum evento nesta data';

  const emptyStateDescription =
    eventScope === 'receivables'
      ? 'Datas com recebimentos ficam destacadas no calendário'
      : eventScope === 'expenses'
        ? 'Datas com despesas ficam destacadas no calendário'
        : 'Datas com eventos ficam destacadas no calendário';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <div className="overflow-hidden bg-card border border-border rounded-2xl p-5 hover:bg-card transition-colors">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            className="p-1 pointer-events-auto"
            components={{
              DayContent: ({ date }: any) => {
                const marker = getDayMarker(date);
                return (
                  <div className="relative flex h-full w-full items-center justify-center">
                    <span>{format(date, 'd')}</span>
                    {marker === 'receivable' && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
                    )}
                    {marker === 'payable' && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-destructive" />
                    )}
                    {marker === 'mixed' && (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-violet-500" />
                    )}
                  </div>
                );
              },
            }}
            classNames={{
              caption: "relative flex items-center justify-center px-10 pt-1",
              caption_label: "text-sm font-medium capitalize",
              nav: "absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-1 pointer-events-none",
              nav_button: "pointer-events-auto",
              nav_button_previous: "static",
              nav_button_next: "static",
              day_today: "rounded-full border border-border/60 text-foreground font-semibold",
              day_selected:
                "rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
            }}
            modifiers={{
              receivable: receivableDates,
              payable: payableDates,
              mixed: mixedDates,
            }}
          />
          <div className="flex items-center gap-4 mt-4 px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-full justify-center">
            {eventScope !== 'expenses' && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                A receber
              </span>
            )}
            {eventScope !== 'receivables' && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                A pagar
              </span>
            )}
            {eventScope === 'all' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-full bg-violet-500" />
                Ambos
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden bg-card border border-border rounded-2xl flex flex-col">
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border/40">
            <h3 className="text-base font-extrabold text-foreground">
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </h3>
            <div className="flex items-center gap-3">
              {hasEvents && (
                <div className="flex items-center gap-3 text-xs bg-background border border-border/50 px-3 py-1.5 rounded-full">
                  {totalReceivables > 0 && (
                    <span className="text-primary font-bold">+{formatCurrency(totalReceivables)}</span>
                  )}
                  {totalPayables > 0 && (
                    <span className="text-destructive font-bold">-{formatCurrency(totalPayables)}</span>
                  )}
                </div>
              )}
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-[8px] bg-transparent text-black hover:bg-black hover:text-white transition-all border-transparent shadow-none"
                  onClick={openCreateFlow}
                  title="Adicionar evento"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="p-6 pt-4 flex-1">
            {!hasEvents ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center mb-2">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/70" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{emptyStateTitle}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5 mb-4">{emptyStateDescription}</p>
                {selectedDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border hover:bg-black hover:text-white"
                    onClick={openCreateFlow}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {eventScope === 'receivables' ? 'Novo recebimento' : eventScope === 'expenses' ? 'Nova despesa' : 'Adicionar evento'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedEvents.invoices.map(inv => (
                  <div
                    key={inv.id}
                    className="group flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/20 cursor-pointer"
                    onClick={() => onEventClick?.('receivable', inv.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center">
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inv.name || 'Fatura'}</p>
                        <p className="text-[11px] text-primary/70 font-medium">A receber · clique para editar</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-emerald-600 tabular-nums">{formatCurrency(inv.total)}</span>
                  </div>
                ))}
                {selectedEvents.expenses.map(exp => (
                  <div
                    key={exp.id}
                    className="group flex items-center justify-between p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 transition-all hover:bg-destructive/10 hover:border-destructive/20 cursor-pointer"
                    onClick={() => onEventClick?.('expense', exp.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center">
                        <ArrowUpRight className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{exp.description}</p>
                        <p className="text-[11px] text-destructive/70 font-medium">A pagar Â· clique para editar</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-destructive tabular-nums">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type chooser dialog */}
      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Qual tipo de evento?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleChooseType('receivable')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer group dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
            >
              <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Recebimento</p>
                <p className="text-[11px] text-muted-foreground">Fatura a receber</p>
              </div>
            </button>
            <button
              onClick={() => handleChooseType('expense')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Despesa</p>
                <p className="text-[11px] text-muted-foreground">Conta a pagar</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creation form dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {eventType === 'receivable' ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-primary" />
                  </div>
                  Novo Recebimento
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-destructive" />
                  </div>
                  Nova Despesa
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <CalendarDays className="w-3.5 h-3.5" />
                Vencimento: {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}

            <div className="space-y-2">
              <Label>DescriÃ§Ã£o</Label>
              <Input
                placeholder={eventType === 'receivable' ? 'Ex: Projeto website' : 'Ex: Servidor cloud'}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {eventType === 'expense' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


