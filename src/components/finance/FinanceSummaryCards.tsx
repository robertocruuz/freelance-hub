import { DollarSign, TrendingUp, TrendingDown, CalendarClock, ArrowUpRight, ArrowDownRight, Wallet, Scale } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  balance: number;
  receivedThisMonth: number;
  paidThisMonth: number;
  totalReceivable: number;
  nextDueCount: number;
}

export default function FinanceSummaryCards({ balance, receivedThisMonth, paidThisMonth, totalReceivable, nextDueCount }: Props) {
  const cards = [
    {
      label: 'Balanço do mês',
      value: formatCurrency(Math.abs(balance)),
      prefix: balance >= 0 ? '+' : '-',
      icon: Scale,
      trend: balance >= 0 ? ArrowUpRight : ArrowDownRight,
      gradient: balance >= 0
        ? 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5'
        : 'from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5',
      iconBg: balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-red-100 dark:bg-red-900/50',
      iconColor: balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
      valueColor: balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300',
      borderColor: balance >= 0 ? 'border-blue-200/60 dark:border-blue-800/40' : 'border-red-200/60 dark:border-red-800/40',
    },
    {
      label: 'Recebido no mês',
      value: formatCurrency(receivedThisMonth),
      icon: DollarSign,
      trend: ArrowUpRight,
      gradient: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
    },
    {
      label: 'Despesas do mês',
      value: formatCurrency(paidThisMonth),
      icon: TrendingDown,
      trend: ArrowDownRight,
      gradient: 'from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      valueColor: 'text-red-700 dark:text-red-300',
      borderColor: 'border-red-200/60 dark:border-red-800/40',
    },
    {
      label: 'A receber',
      value: formatCurrency(totalReceivable),
      icon: TrendingUp,
      gradient: 'from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5',
      iconBg: 'bg-primary/10 dark:bg-primary/20',
      iconColor: 'text-primary',
      valueColor: 'text-primary dark:text-blue-300',
      borderColor: 'border-primary/20 dark:border-primary/30',
    },
    {
      label: 'Vencimentos (7d)',
      value: String(nextDueCount),
      subtitle: nextDueCount === 0 ? 'Nenhum' : nextDueCount === 1 ? '1 item' : `${nextDueCount} itens`,
      icon: CalendarClock,
      gradient: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200/60 dark:border-amber-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${c.gradient} ${c.borderColor}`}
        >
          {/* Decorative circle */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-current opacity-[0.03]" />

          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.iconBg}`}>
              <c.icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            {c.trend && <c.trend className={`w-4 h-4 ${c.iconColor} opacity-60`} />}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
          <p className={`text-xl sm:text-2xl font-extrabold tracking-tight ${c.valueColor}`}>
            {'prefix' in c && (c as any).prefix ? `${(c as any).prefix} ` : ''}{c.subtitle ? c.subtitle : c.value}
          </p>
          {!c.subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5 opacity-0 sm:opacity-100">este mês</p>
          )}
        </div>
      ))}
    </div>
  );
}
