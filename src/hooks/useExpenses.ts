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
  is_recurring: boolean;
  recurring_months: number | null;
  recurring_group_id?: string | null;
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

  // Virtual entries removed to enforce true database persistence and editable states.

  const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    if (expense.is_recurring && expense.recurring_months) {
      const expensesToInsert: any[] = [];
      const baseDate = expense.due_date ? new Date(expense.due_date + 'T12:00:00') : new Date();
      const groupId = crypto.randomUUID();
      
      for (let i = 0; i < expense.recurring_months; i++) {
        expensesToInsert.push({
          ...expense,
          user_id: user.id,
          status: 'pending',
          recurring_group_id: groupId,
          due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
        });
      }
      
      const { error } = await supabase.from('expenses').insert(expensesToInsert);
      if (error) { toast.error('Erro ao adicionar despesas'); return false; }
    } else {
      const { error } = await supabase.from('expenses').insert({ ...expense, user_id: user.id });
      if (error) { toast.error('Erro ao adicionar despesa'); return false; }
    }
    
    toast.success('Despesa adicionada com sucesso');
    fetchExpenses();
    return true;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar despesa'); return false; }

    // If updating a recurring sequence, cascade to future entries!
    if (updates.recurring_group_id && updates.is_recurring && updates.recurring_months && updates.due_date) {
      // 1. Delete all trailing future events in the group
      await supabase.from('expenses').delete()
        .eq('recurring_group_id', updates.recurring_group_id)
        .gt('due_date', updates.due_date);

      // 2. Regenerate new trailing events based on edited payload
      const expensesToInsert: any[] = [];
      const baseDate = new Date(updates.due_date + 'T12:00:00');
      
      const { id: _id, created_at: _c, updated_at: _u, ...safeUpdates } = updates as any;
      for (let i = 1; i < updates.recurring_months; i++) {
        expensesToInsert.push({
          ...safeUpdates,
          status: 'pending',
          paid_date: null,
          due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
        });
      }
      if (expensesToInsert.length > 0) {
         await supabase.from('expenses').insert(expensesToInsert);
      }
    }

    toast.success('Despesa atualizada com sucesso');
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

  return { expenses, rawExpenses: expenses, loading, fetchExpenses, addExpense, updateExpense, deleteExpense, markAsPaid };
}
