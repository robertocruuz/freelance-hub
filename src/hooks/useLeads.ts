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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [stagesRes, leadsRes] = await Promise.all([
      supabase.from('lead_stages').select('*').order('position'),
      supabase.from('leads').select('*').order('position'),
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const addStage = async (name: string, color: string) => {
    if (!user) return;
    const position = stages.length;
    const { error } = await supabase.from('lead_stages').insert({ name, color, position, user_id: user.id });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const updateStage = async (id: string, updates: Partial<LeadStage>) => {
    const { error } = await supabase.from('lead_stages').update(updates).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase.from('lead_stages').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const addLead = async (lead: Partial<Lead>) => {
    if (!user) return;
    const stageLeads = leads.filter(l => l.stage_id === lead.stage_id);
    const position = stageLeads.length;
    const { error } = await supabase.from('leads').insert({
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
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { created_at, updated_at, id: _id, ...rest } = updates as any;
    const { error } = await supabase.from('leads').update(rest).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const moveLeadToStage = async (leadId: string, newStageId: string) => {
    const stageLeads = leads.filter(l => l.stage_id === newStageId);
    const position = stageLeads.length;
    await updateLead(leadId, { stage_id: newStageId, position } as Partial<Lead>);
  };

  return {
    stages, leads, loading,
    addStage, updateStage, deleteStage,
    addLead, updateLead, deleteLead,
    moveLeadToStage, refetch: fetchData,
  };
}
