import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import { CalendarDays } from 'lucide-react';
import type { FinanceInvoice } from '@/pages/FinancePage';

interface Props {
  invoices: FinanceInvoice[];
}

export default function FinanceCalendarTab({ invoices }: Props) {
  const { expenses } = useExpenses();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            className="p-3 pointer-events-auto"
            modifiers={{ hasEvent: (date) => eventDates.has(format(date, 'yyyy-MM-dd')) }}
            modifiersClassNames={{ hasEvent: 'bg-primary/15 font-bold text-primary ring-1 ring-primary/20' }}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          {!hasEvents ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhum evento nesta data</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Datas com eventos ficam destacadas no calendário</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedEvents.invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">📥</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{inv.name || 'Fatura'}</p>
                      <p className="text-[11px] text-primary font-medium">A receber</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-primary tabular-nums">{formatCurrency(inv.total)}</span>
                </div>
              ))}
              {selectedEvents.expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 transition-all hover:bg-destructive/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-sm">📤</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{exp.description}</p>
                      <p className="text-[11px] text-destructive font-medium">A pagar</p>
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
  );
}
