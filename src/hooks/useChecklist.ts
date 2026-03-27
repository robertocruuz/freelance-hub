import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChecklistItem {
  id: string;
  user_id: string;
  content: string;
  is_completed: boolean;
  position: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useChecklist = (projectId?: string) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const cleanProjectId = projectId?.trim();
    const query = supabase
      .from('user_checklists')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (cleanProjectId) {
      query.eq('project_id', cleanProjectId);
    } else {
      query.is('project_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading checklist:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const cleanProjectId = projectId?.trim();

      const channel = supabase
        .channel(`user_checklists_changes_${cleanProjectId || 'personal'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_checklists',
          },
          (payload) => {
            console.log('Realtime Postgres Event:', payload.eventType);
            loadItems();
          }
        )
        .on(
          'broadcast',
          { event: 'sync' },
          (payload) => {
            console.log('Realtime Broadcast Event: sync');
            loadItems();
          }
        )
        .subscribe((status) => {
          console.log(`Realtime Status (${cleanProjectId || 'personal'}):`, status);
        });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, projectId, loadItems]);

  const broadcastSync = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { userId: user?.id }
      });
    }
  }, [user?.id]);

  const addItem = useCallback(async (content: string) => {
    if (!user) return;
    const cleanProjectId = projectId?.trim();
    const maxPosition = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1;
    const { data, error } = await supabase
      .from('user_checklists')
      .insert({
        content,
        user_id: user.id,
        project_id: cleanProjectId || null,
        position: maxPosition + 1,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert Error:', error);
      toast.error(`Erro: ${error.message}`);
      return null;
    }

    if (data) {
      const item = data as ChecklistItem;
      setItems((prev) => {
        if (prev.some(i => i.id === item.id)) return prev;
        return [...prev, item].sort((a,b) => a.position - b.position);
      });
      broadcastSync();
    }
    
    return data;
  }, [user, projectId, items, broadcastSync]);

  const updateItem = useCallback(async (id: string, updates: Partial<ChecklistItem>) => {
    // Optimistic update
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    const { error } = await supabase
      .from('user_checklists')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error(error.message);
      // Rollback on error
      setItems(previousItems);
      console.error('Error updating checklist item:', error);
    } else {
      broadcastSync();
    }
  }, [items, broadcastSync]);

  const toggleItem = useCallback(async (id: string, is_completed: boolean) => {
    // Optimistic update
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_completed } : item))
    );
    await updateItem(id, { is_completed });
  }, [updateItem]);

  const deleteItem = useCallback(async (id: string) => {
    // Optimistic update
    const previousItems = [...items];
    setItems((prev) => prev.filter((item) => item.id !== id));

    const { error } = await supabase
      .from('user_checklists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting checklist item:', error);
      toast.error('Erro ao excluir item');
      // Rollback on error
      setItems(previousItems);
    } else {
      broadcastSync();
    }
  }, [items, broadcastSync]);

  return {
    items,
    loading,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    refresh: loadItems,
  };
};
