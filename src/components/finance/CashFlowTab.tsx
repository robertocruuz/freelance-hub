import { useMemo, useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useExpenses, EXPENSE_CATEGORIES, type Expense } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Invoice {
  id: string;
  total: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

const PIE_COLORS = ['hsl(225,100%,50%)', 'hsl(80,85%,55%)', 'hsl(0,72%,51%)', 'hsl(220,15%,60%)', 'hsl(45,93%,47%)', 'hsl(280,60%,55%)', 'hsl(170,60%,45%)'];

export default function CashFlowTab() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('invoices').select('id, total, status, due_date, created_at').then(({ data }) => {
      setInvoices((data as Invoice[]) || []);
    });
  }, [user]);

  const now = new Date();
  const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });

  const totalReceivable = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const totalPayable = expenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);

  const barData = months.map(month => {
    const key = format(month, 'yyyy-MM');
    const entradas = invoices
      .filter(i => i.status === 'paid' && i.due_date && i.due_date.startsWith(key))
      .reduce((s, i) => s + i.total, 0);
    const saidas = expenses
      .filter(e => e.status === 'paid' && e.paid_date && e.paid_date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    return { name: format(month, 'MMM', { locale: ptBR }), Entradas: entradas, Saídas: saidas };
  });

  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
    return { name: cat.label, value: total };
  }).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total a receber" value={formatCurrency(totalReceivable)} className="text-primary" />
        <SummaryCard label="Total a pagar" value={formatCurrency(totalPayable)} className="text-destructive" />
        <SummaryCard label="Saldo previsto" value={formatCurrency(totalReceivable - totalPayable)} className="text-foreground" />
        <SummaryCard label="Saldo atual" value={formatCurrency(totalReceived - totalPaid)} className="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Entradas vs Saídas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="Entradas" fill="hsl(225,100%,50%)" radius={[4,4,0,0]} />
                <Bar dataKey="Saídas" fill="hsl(0,72%,51%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhuma despesa registrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${className}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
