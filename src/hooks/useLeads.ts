import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LeadStage {
  id: string;
  user_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  stage_id: string | null;
  client_id: string | null;
  title: string;
  value: number;
  probability: number;
  expected_close_date: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  position: number;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_STAGES = [
  { name: 'Prospecção', position: 0, color: '#6366F1' },
  { name: 'Qualificação', position: 1, color: '#3B82F6' },
  { name: 'Proposta', position: 2, color: '#F59E0B' },
  { name: 'Negociação', position: 3, color: '#F97316' },
  { name: 'Fechamento', position: 4, color: '#10B981' },
];

export function useLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    const [stagesRes, leadsRes] = await Promise.all([
      supabase.from('lead_stages').select('*').eq('user_id', user.id).order('position'),
      supabase.from('leads').select('*').eq('user_id', user.id).order('position'),
    ]);

    let stagesData = (stagesRes.data || []) as LeadStage[];

    // Auto-create default stages for new users
    if (stagesData.length === 0) {
      const toInsert = DEFAULT_STAGES.map(s => ({ ...s, user_id: user.id }));
      const { data: created } = await supabase.from('lead_stages').insert(toInsert).select();
      stagesData = (created || []) as LeadStage[];
    }

    setStages(stagesData);
    setLeads((leadsRes.data || []) as Lead[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { 
    fetchData(true); 

    if (!user) return;
    
    // Subscribe to realtime changes for leads and stages
    const channel = supabase.channel(`leads_realtime_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => {
            if (prev.some(l => l.id === payload.new.id)) return prev;
            return [...prev, payload.new as Lead];
          });
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new as Lead : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_stages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStages(prev => {
            if (prev.some(s => s.id === payload.new.id)) return prev;
            return [...prev, payload.new as LeadStage];
          });
        } else if (payload.eventType === 'UPDATE') {
          setStages(prev => prev.map(s => s.id === payload.new.id ? payload.new as LeadStage : s));
        } else if (payload.eventType === 'DELETE') {
          setStages(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user]);

  const addStage = async (name: string, color: string) => {
    if (!user) return;
    const position = stages.length;
    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setStages(prev => [...prev, { id: tempId, name, color, position, user_id: user.id, created_at: new Date().toISOString() }]);
    const { error, data } = await supabase.from('lead_stages').insert({ name, color, position, user_id: user.id }).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
    if (data) {
      setStages(prev => prev.map(s => s.id === tempId ? data as LeadStage : s));
    }
  };

  const updateStage = async (id: string, updates: Partial<LeadStage>) => {
    // Optimistic
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const { error } = await supabase.from('lead_stages').update(updates).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
  };

  const deleteStage = async (id: string) => {
    // Optimistic
    setStages(prev => prev.filter(s => s.id !== id));
    const { error } = await supabase.from('lead_stages').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
  };

  const addLead = async (lead: Partial<Lead>) => {
    if (!user) return;
    const stageLeads = leads.filter(l => l.stage_id === lead.stage_id);
    const position = stageLeads.length;
    const insertData = {
      title: lead.title || '',
      value: lead.value || 0,
      probability: lead.probability || 50,
      expected_close_date: lead.expected_close_date,
      contact_name: lead.contact_name,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      notes: lead.notes,
      stage_id: lead.stage_id,
      client_id: lead.client_id,
      position,
      user_id: user.id,
      status: 'open',
    };
    
    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setLeads(prev => [...prev, { ...insertData, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), won_at: null, lost_at: null, lost_reason: null } as Lead]);

    const { error, data } = await supabase.from('leads').insert(insertData).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
    if (data) {
      setLeads(prev => prev.map(l => l.id === tempId ? data as Lead : l));
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { created_at, updated_at, id: _id, ...rest } = updates as any;
    // Optimistic
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    const { error } = await supabase.from('leads').update(rest).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
  };

  const deleteLead = async (id: string) => {
    // Optimistic
    setLeads(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
  };

  const moveLeadToStage = async (leadId: string, newStageId: string) => {
    const stageLeads = leads.filter(l => l.stage_id === newStageId);
    const position = stageLeads.length;
    // Optimistic
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: newStageId, position } : l));
    const { error } = await supabase.from('leads').update({ stage_id: newStageId, position }).eq('id', leadId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); fetchData(false); return; }
  };

  return {
    stages, leads, loading,
    addStage, updateStage, deleteStage,
    addLead, updateLead, deleteLead,
    moveLeadToStage, refetch: fetchData,
  };
}
