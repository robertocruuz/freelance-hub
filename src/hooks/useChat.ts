import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Channel {
  id: string;
  type: string;
  organization_id: string | null;
  project_id: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
  channel_members?: Array<{
    user_id: string;
    role: string | null;
    last_read_at: string | null;
    profiles?: {
      name: string | null;
      avatar_url: string | null;
    };
  }>;
  unread_count?: number;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: string | null;
  joined_at: string;
  last_read_at: string | null;
  hidden_at?: string | null;
  // Included profile
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  };
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  type: string | null;
  file_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Included relations
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  };
  reactions?: MessageReaction[];
}

export function useChat() {
  const { user } = useAuth();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch all channels the user is part of (or org team channels)
  const fetchChannels = useCallback(async () => {
    if (!user) return;
    setLoadingChannels(true);
    
    // Get distinct channels I am part of or are team channels of my org
    const { data, error } = await supabase
      .from('channels')
      .select('*, channel_members!inner(user_id, role, last_read_at, hidden_at, profiles:user_id(name, avatar_url)), messages(content, type, deleted_at, created_at, user_id)')
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })
      .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching channels', error);
        toast({ title: 'Erro', description: 'Não foi possível carregar os canais', variant: 'destructive' });
      } else {
        const fetchedChannels = data as unknown as Channel[] || [];
        
        // Fetch unread counts via RPC
        const { data: countsData } = await supabase.rpc('get_unread_counts' as any, { 
          p_user_id: user.id 
        });
        
        const countsMap = (countsData as any[] || []).reduce((acc: any, curr: any) => {
          acc[curr.channel_id] = curr.unread_count;
          return acc;
        }, {});

        const channelsWithCounts = fetchedChannels.map(c => ({
          ...c,
          unread_count: c.id === activeChannelRef.current ? 0 : (countsMap[c.id] || 0)
        })).filter(c => {
          const me: any = c.channel_members?.find((m: any) => m.user_id === user.id);
          if (!me || !me.hidden_at) return true;
          // Hide if the last update (message) is older than or equal to when I hid it
          return new Date(c.updated_at) > new Date(me.hidden_at);
        });

        setChannels(channelsWithCounts);
      }
    setLoadingChannels(false);
  }, []);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async (channelId: string) => {
    if (channelId.startsWith('temp_')) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    
    const { data } = await supabase
      .from('channel_members')
      .select('hidden_at')
      .eq('channel_id', channelId)
      .eq('user_id', user!.id)
      .single();
    const memberData: any = data;

    let messagesQuery = supabase
      .from('messages')
      .select(`
        *,
        reactions:message_reactions(*),
        profiles:user_id(name, avatar_url)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (memberData?.hidden_at) {
      messagesQuery = messagesQuery.gt('created_at', memberData.hidden_at);
    }

    const { data: messagesData, error: messagesError } = await messagesQuery;
      
    if (messagesError) {
      console.error('Error fetching messages', messagesError);
      toast({ title: 'Erro', description: 'Não foi possível carregar as mensagens', variant: 'destructive' });
    } else {
      setMessages(messagesData as unknown as Message[] || []);
    }

    // Mark as read
    if (user) {
      supabase.from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .then(); // fire and forget
    }

    // Fetch members of this channel
    const { data: membersData } = await supabase
      .from('channel_members')
      .select('*, profiles:user_id(name, avatar_url)')
      .eq('channel_id', channelId);
      
    if (membersData) {
      setMembers(membersData as any[] || []);
    }
    
    setLoadingMessages(false);
  }, []);

  // Use a ref to access activeChannelId inside the global realtime listener safely
  const activeChannelRef = useRef(activeChannelId);
  useEffect(() => {
    activeChannelRef.current = activeChannelId;
  }, [activeChannelId]);

  // Init fetch channels
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Handle active channel change
  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
      setChannels(prev => prev.map(c => c.id === activeChannelId ? { ...c, unread_count: 0 } : c));
    } else {
      setMessages([]);
      setMembers([]);
    }
  }, [activeChannelId, fetchMessages]);

  // Global Realtime for channels list mutations
  useEffect(() => {
    if (!user) return;

    const channelSub = supabase.channel(`chat_channels_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
        fetchChannels();
      })
      .subscribe();

    const globalMessagesSub = supabase.channel(`chat_global_msgs_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.user_id !== user.id) {
           setChannels(prev => prev.map(c => {
             if (c.id === newMsg.channel_id) {
               if (newMsg.channel_id !== activeChannelRef.current) {
                 return { ...c, unread_count: (c.unread_count || 0) + 1, updated_at: newMsg.created_at, messages: [newMsg] };
               } else {
                 return { ...c, updated_at: newMsg.created_at, messages: [newMsg] };
               }
             }
             return c;
           }));
        } else {
           // Also update sidebar snippet if I send a message on another device
           setChannels(prev => prev.map(c => {
             if (c.id === newMsg.channel_id) {
               return { ...c, updated_at: newMsg.created_at, messages: [newMsg] };
             }
             return c;
           }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
      supabase.removeChannel(globalMessagesSub);
    };
  }, [user, fetchChannels]);

  // Realtime for active channel messages and reactions
  useEffect(() => {
    if (!user || !activeChannelId) return;

    const activeSub = supabase.channel(`chat_active_${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, async (payload) => {
        // Fetch profile for new message
        const newMsg = payload.new as Message;
        const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', newMsg.user_id).single();
        
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, profiles: profile || undefined, reactions: [] }];
        });
        
        // Dynamically advance the read receipt if we are actively staring at the channel
        if (newMsg.user_id !== user.id) {
          supabase.from('channel_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('channel_id', activeChannelId)
            .eq('user_id', user.id)
            .then();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        const reaction = payload.new as MessageReaction;
        setMessages(prev => prev.map(m => {
          if (m.id === reaction.message_id) {
            return { ...m, reactions: [...(m.reactions || []), reaction] };
          }
          return m;
        }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        setMessages(prev => prev.map(m => {
          if (m.reactions && m.reactions.some(r => r.id === payload.old.id)) {
            return { ...m, reactions: m.reactions.filter(r => r.id !== payload.old.id) };
          }
          return m;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activeSub);
    };
  }, [user, activeChannelId]);

  const sendMessage = async (content: string, type: 'text' | 'file' = 'text', file_url?: string) => {
    if (!user || !activeChannelId || (!content && !file_url)) return;
    
    let targetChannelId = activeChannelId;

    // Intercept Lazy DB Creation for temp direct chats
    if (targetChannelId.startsWith('temp_')) {
      const targetUserId = targetChannelId.replace('temp_', '');
      const newRealId = await createDirectChannel(targetUserId);
      if (!newRealId) return;
      
      targetChannelId = newRealId;
      // Remove temp channel from UI as the realtime DB fetch will bring the new one
      setChannels(prev => prev.filter(c => c.id !== activeChannelId));
      setActiveChannelId(newRealId);
    }
    
    const { error } = await supabase.from('messages').insert({
      channel_id: targetChannelId,
      user_id: user.id,
      content,
      type,
      file_url
    });
    
    if (error) {
      toast({ title: 'Erro', description: `Erro ao enviar mensagem: ${error.message} (${error.code})`, variant: 'destructive' });
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const { error } = await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: user.id,
      emoji
    });
    if (error && error.code !== '23505') { // ignore duplicate
      toast({ title: 'Erro', description: `Erro ao reagir: ${error.message} (${error.code})`, variant: 'destructive' });
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const { error } = await supabase.from('message_reactions').delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);
      
    if (error) {
      toast({ title: 'Erro', description: `Erro ao remover reação: ${error.message} (${error.code})`, variant: 'destructive' });
    }
  };
  
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const message = messages.find(m => m.id === messageId);
    const existing = message?.reactions?.find(r => r.emoji === emoji && r.user_id === user.id);
    
    if (existing) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };
  
  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;
    const { error } = await supabase.from('messages').update({ 
      content: newContent,
      updated_at: new Date().toISOString()
    }).eq('id', messageId).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro', description: `Erro ao editar mensagem: ${error.message} (${error.code})`, variant: 'destructive' });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    // @ts-ignore
    const { error } = await supabase.from('messages').update({ deleted_at: new Date().toISOString() } as any).eq('id', messageId).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro', description: `Erro ao excluir mensagem: ${error.message} (${error.code})`, variant: 'destructive' });
    }
  };
  
  const createDirectChannel = async (userId2: string) => {
    if (!user) return null;
    
    // Check if channel already exists
    // A bit complex in SQL to find 1:1 direct channel, here we do a simple check
    // by finding a channel where we are both members and type is 'direct'
    // For simplicity, we create one and let members join. In real system we'd use a server function.
    
    // Call the custom database function to securely create the channel and add both members
    // This avoids RLS visibility issues (403 Forbidden) during creation
    const { data: newChannelId, error } = await supabase.rpc('create_direct_channel' as any, {
      other_user_id: userId2
    });
    
    if (error || !newChannelId) {
      console.error('Error creating chat:', error);
      toast({ title: 'Erro', description: 'Erro ao criar chat', variant: 'destructive' });
      return null;
    }
    
    fetchChannels();
    setActiveChannelId(newChannelId as string);
    return newChannelId as string;
  };
  
  const initDirectChat = (userId2: string, userProfile: any) => {
    if (!user) return;
    
    // Check if it already exists locally
    const existing = channels.find(c => c.type === 'direct' && c.channel_members?.some(m => m.user_id === userId2));
    if (existing) {
      setActiveChannelId(existing.id);
      return;
    }
    
    // Create lazy phantom channel for UI
    const tempId = `temp_${userId2}`;
    
    if (channels.some(c => c.id === tempId)) {
      setActiveChannelId(tempId);
      return;
    }
    
    const newTempChannel: any = {
      id: tempId,
      type: 'direct',
      organization_id: null,
      project_id: null,
      name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
      channel_members: [
        { user_id: user.id, role: 'member', last_read_at: new Date().toISOString() },
        { user_id: userId2, role: 'member', last_read_at: null, profiles: userProfile }
      ]
    };
    
    setChannels(prev => [newTempChannel, ...prev]);
    setActiveChannelId(tempId);
  };
  
  const createTeamChannel = async (orgId: string, name: string = 'Equipe Geral') => {
    if (!user || !orgId) return null;
    
    // Pre-flight check to block duplicate creation races
    const { data: existing } = await supabase.from('channels')
      .select('id')
      .eq('organization_id', orgId)
      .eq('type', 'team')
      .limit(1);

    if (existing && existing.length > 0) {
      await fetchChannels();
      setActiveChannelId(existing[0].id);
      return existing[0].id;
    }

    // Call the custom database function to securely create the team channel and sync all members
    const { data: newChannelId, error } = await supabase.rpc('create_team_channel' as any, {
      org_id: orgId,
      ch_name: name
    });
    
    if (error || !newChannelId) {
      console.error('Error creating team chat:', error);
      toast({ title: 'Erro', description: 'Erro ao criar chat da equipe', variant: 'destructive' });
      return null;
    }
    
    fetchChannels();
    setActiveChannelId(newChannelId as string);
    return newChannelId as string;
  };

  const deleteChannel = async (channelId: string) => {
    if (!user) return;
    
    if (channelId.startsWith('temp_')) {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannelId === channelId) setActiveChannelId(null);
      return;
    }
    
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;
    
    if (channel.type === 'team' || channel.type === 'project') {
      const { error } = await supabase.from('channels')
        .delete()
        .eq('id', channelId);
        
      if (error) {
        console.error('Error deleting channel:', error);
        toast({ title: 'Erro', description: `Erro ao excluir conversa: ${error.message} (${error.code})`, variant: 'destructive' });
      } else {
        setChannels(prev => prev.filter(c => c.id !== channelId));
        if (activeChannelId === channelId) setActiveChannelId(null);
      }
    } else {
      // @ts-ignore
      const { error } = await supabase.from('channel_members')
        .update({ hidden_at: new Date().toISOString() } as any)
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error hiding chat:', error);
        toast({ title: 'Erro', description: `Erro ao esconder conversa: ${error.message} (${error.code})`, variant: 'destructive' });
      } else {
        setChannels(prev => prev.filter(c => c.id !== channelId));
        if (activeChannelId === channelId) setActiveChannelId(null);
      }
    }
  };

  return {
    channels,
    activeChannelId,
    setActiveChannelId,
    messages,
    members,
    loadingChannels,
    loadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteChannel,
    addReaction,
    removeReaction,
    toggleReaction,
    createDirectChannel,
    createTeamChannel,
    initDirectChat,
    refetchChannels: fetchChannels
  };
}
