import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  description: string;
  category: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurring_months: number | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'internet', label: 'Internet' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outros', label: 'Outros' },
];

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
];

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (error) {
      toast.error('Erro ao carregar despesas');
    } else {
      setExpenses((data as Expense[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Generate virtual recurring entries for future months (up to 12 months ahead)
  const expensesWithRecurring = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const virtualEntries: Expense[] = [];

    for (const expense of expenses) {
      if (!expense.is_recurring || !expense.due_date) continue;
      const baseDate = new Date(expense.due_date + 'T12:00:00');
      
      const months = expense.recurring_months || 12;
      for (let i = 1; i <= months; i++) {
        const futureDate = addMonths(baseDate, i);
        const futureMonth = format(futureDate, 'yyyy-MM');
        // Only generate if future month is after the original month
        if (futureMonth <= format(baseDate, 'yyyy-MM')) continue;
        
        // Check if a real expense already exists for this month (same description, category, amount)
        const alreadyExists = expenses.some(e => 
          e.description === expense.description && 
          e.category === expense.category && 
          e.amount === expense.amount &&
          e.due_date && e.due_date.startsWith(futureMonth)
        );
        if (alreadyExists) continue;

        virtualEntries.push({
          ...expense,
          id: `${expense.id}_recurring_${i}`,
          due_date: format(futureDate, 'yyyy-MM-dd'),
          paid_date: null,
          status: 'pending',
        });
      }
    }

    return [...expenses, ...virtualEntries];
  }, [expenses]);

  const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase.from('expenses').insert({ ...expense, user_id: user.id });
    if (error) { toast.error('Erro ao adicionar despesa'); return false; }
    toast.success('Despesa adicionada');
    fetchExpenses();
    return true;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar despesa'); return false; }
    toast.success('Despesa atualizada');
    fetchExpenses();
    return true;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir despesa'); return false; }
    toast.success('Despesa excluída');
    fetchExpenses();
    return true;
  };

  const markAsPaid = async (id: string) => {
    return updateExpense(id, { 
      status: 'paid', 
      paid_date: new Date().toISOString().split('T')[0] 
    });
  };

  return { expenses: expensesWithRecurring, rawExpenses: expenses, loading, fetchExpenses, addExpense, updateExpense, deleteExpense, markAsPaid };
}
