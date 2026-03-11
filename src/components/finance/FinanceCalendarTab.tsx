import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { FinanceInvoice } from '@/pages/FinancePage';

type EventType = 'receivable' | 'expense' | null;

interface Props {
  invoices: FinanceInvoice[];
  onRefresh?: () => void;
  onEventClick?: (type: 'receivable' | 'expense', id: string) => void;
}

export default function FinanceCalendarTab({ invoices, onRefresh, onEventClick }: Props) {
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

  const handleSave = async () => {
    if (!user || !selectedDate) return;
    if (!name.trim()) return toast.error('Informe uma descrição.');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return toast.error('Informe um valor válido.');

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
    invoices.forEach(i => {
      if (!i.due_date) return;
      const existing = map.get(i.due_date) || { receivables: 0, payables: 0 };
      existing.receivables += 1;
      map.set(i.due_date, existing);
    });
    expenses.forEach(e => {
      if (!e.due_date) return;
      const existing = map.get(e.due_date) || { receivables: 0, payables: 0 };
      existing.payables += 1;
      map.set(e.due_date, existing);
    });
    return map;
  }, [expenses, invoices]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return { expenses: [] as Expense[], invoices: [] as FinanceInvoice[] };
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return {
      expenses: expenses.filter(e => e.due_date === dateStr),
      invoices: invoices.filter(i => i.due_date === dateStr),
    };
  }, [selectedDate, expenses, invoices]);

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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="p-3 pointer-events-auto"
              modifiers={{
                receivable: receivableDates,
                payable: payableDates,
                mixed: mixedDates,
              }}
              modifiersClassNames={{
                receivable: 'finance-dot finance-dot--receivable',
                payable: 'finance-dot finance-dot--payable',
                mixed: 'finance-dot finance-dot--mixed',
              }}
            />
            <div className="flex items-center gap-4 mt-3 px-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                A receber
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                A pagar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-destructive" />
                Ambos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasEvents && (
                  <div className="flex items-center gap-3 text-xs">
                    {totalReceivables > 0 && (
                      <span className="text-primary font-semibold">+{formatCurrency(totalReceivables)}</span>
                    )}
                    {totalPayables > 0 && (
                      <span className="text-destructive font-semibold">-{formatCurrency(totalPayables)}</span>
                    )}
                  </div>
                )}
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                    onClick={() => setChooserOpen(true)}
                    title="Adicionar evento"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasEvents ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhum evento nesta data</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5 mb-4">Datas com eventos ficam destacadas no calendário</p>
                {selectedDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setChooserOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar evento
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedEvents.invoices.map(inv => (
                  <div
                    key={inv.id}
                    className="group flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 hover:border-primary/20 cursor-pointer"
                    onClick={() => onEventClick?.('receivable')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inv.name || 'Fatura'}</p>
                        <p className="text-[11px] text-primary/70 font-medium">A receber · clique para editar</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-primary tabular-nums">{formatCurrency(inv.total)}</span>
                  </div>
                ))}
                {selectedEvents.expenses.map(exp => (
                  <div
                    key={exp.id}
                    className="group flex items-center justify-between p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 transition-all hover:bg-destructive/10 hover:border-destructive/20 cursor-pointer"
                    onClick={() => onEventClick?.('expense')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{exp.description}</p>
                        <p className="text-[11px] text-destructive/70 font-medium">A pagar · clique para editar</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-destructive tabular-nums">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="w-6 h-6 text-primary" />
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
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-6 h-6 text-destructive" />
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
              <Label>Descrição</Label>
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
