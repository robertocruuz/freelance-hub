import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { FinanceInvoice } from '@/types/finance';

export function useFinanceInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!user) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('id, name, client_id, project_id, total, status, due_date, payment_method, created_at')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      toast.error('Erro ao carregar contas a receber');
    } else {
      setInvoices((data as FinanceInvoice[]) || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`finance_invoices_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInvoices]);

  return { invoices, loading, fetchInvoices };
}
