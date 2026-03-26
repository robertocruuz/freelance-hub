import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const query = supabase
      .from('user_checklists')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (projectId) {
      query.eq('project_id', projectId);
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

    const channel = supabase
      .channel('user_checklists_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_checklists',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Filter payload locally if it's for another project/context
          const payloadProjectId = (payload.new as ChecklistItem)?.project_id || (payload.old as ChecklistItem)?.project_id || null;
          
          if (projectId) {
            if (payloadProjectId !== projectId) return;
          } else {
            if (payloadProjectId !== null) return;
          }

          if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as ChecklistItem]);
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as ChecklistItem) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId]);

  const addItem = useCallback(async (content: string) => {
    if (!user) return;
    const maxPosition = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1;
    const { data, error } = await supabase
      .from('user_checklists')
      .insert({
        content,
        user_id: user.id,
        project_id: projectId || null,
        position: maxPosition + 1,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding checklist item:', error);
      toast.error(`Erro ao adicionar item: ${error.message}`);
      return null;
    }
    return data;
  }, [user, projectId, items]);

  const updateItem = useCallback(async (id: string, updates: Partial<ChecklistItem>) => {
    const { error } = await supabase
      .from('user_checklists')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar item');
    }
  }, []);

  const toggleItem = useCallback(async (id: string, is_completed: boolean) => {
    // Optimistic update
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
    }
  }, [items]);

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
