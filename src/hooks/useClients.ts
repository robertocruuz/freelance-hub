import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  responsible: string | null;
  color: string | null;
  logo_url?: string | null;
  created_at: string;
}

export const useClients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    if (data) setClients(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { clients, loading, reload: load };
};
