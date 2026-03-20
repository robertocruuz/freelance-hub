import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadChat() {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkUnread = async () => {
      const { data, error } = await supabase.rpc('get_unread_counts' as any, { p_user_id: user.id });
      if (!error && Array.isArray(data)) {
        setHasUnread(data.some((d: any) => d.unread_count > 0));
      }
    };
    
    checkUnread();

    const sub = supabase.channel(`global_unread_chat_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.user_id !== user.id) {
          setTimeout(() => {
            checkUnread();
          }, 800);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channel_members', filter: `user_id=eq.${user.id}` }, () => {
        checkUnread();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channel_members', filter: `user_id=eq.${user.id}` }, () => {
        checkUnread();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' }, () => {
        checkUnread();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
        checkUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  return hasUnread;
}
