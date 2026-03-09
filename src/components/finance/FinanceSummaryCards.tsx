import { DollarSign, TrendingUp, TrendingDown, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface Props {
  receivedThisMonth: number;
  paidThisMonth: number;
  totalReceivable: number;
  nextDueCount: number;
}

export default function FinanceSummaryCards({ receivedThisMonth, paidThisMonth, totalReceivable, nextDueCount }: Props) {
  const cards = [
    { label: 'Recebido no mês', value: formatCurrency(receivedThisMonth), icon: DollarSign, color: 'text-primary' },
    { label: 'Pago no mês', value: formatCurrency(paidThisMonth), icon: TrendingDown, color: 'text-destructive' },
    { label: 'A receber', value: formatCurrency(totalReceivable), icon: TrendingUp, color: 'text-accent-foreground' },
    { label: 'Próximos vencimentos', value: String(nextDueCount), icon: CalendarClock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl bg-muted flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className="text-lg font-bold text-foreground">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
