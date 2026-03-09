import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import type { FinanceInvoice } from '@/pages/FinancePage';

interface Props {
  invoices: FinanceInvoice[];
}

export default function FinanceCalendarTab({ invoices }: Props) {
  const { expenses } = useExpenses();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    expenses.forEach(e => { if (e.due_date) dates.add(e.due_date); });
    invoices.forEach(i => { if (i.due_date) dates.add(i.due_date); });
    return dates;
  }, [expenses, invoices]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return { expenses: [] as Expense[], invoices: [] as FinanceInvoice[] };
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return {
      expenses: expenses.filter(e => e.due_date === dateStr),
      invoices: invoices.filter(i => i.due_date === dateStr),
    };
  }, [selectedDate, expenses, invoices]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            className="p-3 pointer-events-auto"
            modifiers={{ hasEvent: (date) => eventDates.has(format(date, 'yyyy-MM-dd')) }}
            modifiersClassNames={{ hasEvent: 'bg-primary/20 font-bold' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedEvents.invoices.length === 0 && selectedEvents.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum evento nesta data.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div>
                    <p className="text-sm font-medium">📥 {inv.name || 'Fatura'}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">A receber</Badge>
                  </div>
                  <span className="font-bold text-sm text-primary">{formatCurrency(inv.total)}</span>
                </div>
              ))}
              {selectedEvents.expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="text-sm font-medium">📤 {exp.description}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">A pagar</Badge>
                  </div>
                  <span className="font-bold text-sm text-destructive">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
