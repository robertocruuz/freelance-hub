import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLeads, Lead, LeadStage } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import LeadCard from '@/components/leads/LeadCard';
import LeadFormModal from '@/components/leads/LeadFormModal';
import StageSettingsModal from '@/components/leads/StageSettingsModal';
import { ShareButton } from '@/components/kanban/ShareButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings2, Search, DollarSign, TrendingUp, Trophy, XCircle, X, Share2, User, Calendar, Percent, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function LeadsPage() {
  const {
    stages, leads, loading,
    addStage, updateStage, deleteStage,
    addLead, updateLead, deleteLead, moveLeadToStage,
  } = useLeads();

  const [activeTab, setActiveTab] = useState('my-leads');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();
  const [stageSettings, setStageSettings] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [winAndConvertLead, setWinAndConvertLead] = useState<Lead | null>(null);

  // Shared leads state
  const [sharedLeads, setSharedLeads] = useState<Lead[]>([]);
  const [sharedStages, setSharedStages] = useState<LeadStage[]>([]);
  const [sharedOwners, setSharedOwners] = useState<Record<string, { name: string; email: string }>>({});
  const [sharedClients, setSharedClients] = useState<Record<string, string>>({});
  const [loadingShared, setLoadingShared] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch shared leads
  const fetchSharedLeads = useCallback(async () => {
    if (!user) return;
    setLoadingShared(true);

    // Get shares where resource_type is 'pipeline' or 'lead'
    const { data: shares } = await supabase
      .from('shares')
      .select('*')
      .or(`share_type.eq.user,share_type.eq.org`)
      .in('resource_type', ['pipeline', 'lead']);

    if (!shares || shares.length === 0) {
      setSharedLeads([]);
      setLoadingShared(false);
      return;
    }

    // Get leads from pipeline shares (all leads from shared pipelines) and individual lead shares
    const pipelineOwnerIds = shares.filter(s => s.resource_type === 'pipeline').map(s => s.resource_id);
    const individualLeadIds = shares.filter(s => s.resource_type === 'lead').map(s => s.resource_id);

    let allLeads: Lead[] = [];

    if (pipelineOwnerIds.length > 0) {
      const { data: pipelineLeads } = await supabase
        .from('leads')
        .select('*')
        .in('user_id', pipelineOwnerIds)
        .neq('user_id', user.id)
        .order('position');
      if (pipelineLeads) allLeads.push(...(pipelineLeads as Lead[]));
    }

    if (individualLeadIds.length > 0) {
      const { data: indLeads } = await supabase
        .from('leads')
        .select('*')
        .in('id', individualLeadIds)
        .neq('user_id', user.id)
        .order('position');
      if (indLeads) {
        const existingIds = new Set(allLeads.map(l => l.id));
        allLeads.push(...(indLeads as Lead[]).filter(l => !existingIds.has(l.id)));
      }
    }

    setSharedLeads(allLeads);

    // Fetch stages for shared leads
    const stageIds = [...new Set(allLeads.map(l => l.stage_id).filter(Boolean))] as string[];
    if (stageIds.length > 0) {
      const { data: stagesData } = await supabase.from('lead_stages').select('*').in('id', stageIds);
      if (stagesData) setSharedStages(stagesData as LeadStage[]);
    }

    // Fetch owner profiles
    const ownerIds = [...new Set(allLeads.map(l => l.user_id))];
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, email').in('user_id', ownerIds);
      if (profiles) {
        const map: Record<string, { name: string; email: string }> = {};
        profiles.forEach((p: any) => { map[p.user_id] = { name: p.name || '', email: p.email || '' }; });
        setSharedOwners(map);
      }
    }

    // Fetch client names
    const clientIds = [...new Set(allLeads.map(l => l.client_id).filter(Boolean))] as string[];
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
      if (clients) {
        const map: Record<string, string> = {};
        clients.forEach((c: any) => { map[c.id] = c.name; });
        setSharedClients(map);
      }
    }

    setLoadingShared(false);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'shared') fetchSharedLeads();
  }, [activeTab, fetchSharedLeads]);

  const openLeads = useMemo(() => leads.filter(l => l.status === 'open'), [leads]);

  const filtered = useMemo(() => {
    let result = openLeads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.contact_email?.toLowerCase().includes(q)
      );
    }
    if (stageFilter) {
      result = result.filter(l => l.stage_id === stageFilter);
    }
    return result;
  }, [openLeads, search, stageFilter]);

  // Summary
  const totalValue = openLeads.reduce((s, l) => s + l.value, 0);
  const weightedValue = openLeads.reduce((s, l) => s + l.value * (l.probability / 100), 0);
  const wonCount = leads.filter(l => l.status === 'won').length;
  const lostCount = leads.filter(l => l.status === 'lost').length;

  const handleOpenForm = (stageId?: string) => {
    setEditLead(null);
    setDefaultStageId(stageId);
    setFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleSave = (data: Partial<Lead>) => {
    if (editLead) {
      updateLead(editLead.id, data);
    } else {
      addLead(data);
    }
  };

  const handleWin = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      setWinAndConvertLead(lead);
    }
  };

  const confirmWin = async (convert: boolean) => {
    if (!winAndConvertLead) return;
    await updateLead(winAndConvertLead.id, { status: 'won', won_at: new Date().toISOString() } as Partial<Lead>);
    if (convert) {
      await doConvertToProject(winAndConvertLead);
    }
    setWinAndConvertLead(null);
  };

  const doConvertToProject = async (lead: Lead) => {
    if (!user) return;
    const { data, error } = await supabase.from('projects').insert({
      name: lead.title,
      client_id: lead.client_id,
      user_id: user.id,
    }).select().single();

    if (error) {
      toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
      return;
    }

    if (lead.value > 0) {
      await supabase.from('project_items').insert({
        project_id: data.id,
        name: lead.title,
        value: lead.value,
        position: 0,
      });
    }

    toast({ title: 'Projeto criado!', description: `"${lead.title}" foi convertido em projeto.` });
    navigate('/dashboard/projects');
  };

  const handleConvertToProject = (lead: Lead) => {
    setConvertLead(lead);
  };

  const confirmConvert = async () => {
    if (!convertLead) return;
    await doConvertToProject(convertLead);
    setConvertLead(null);
  };

  const handleLose = (id: string) => {
    updateLead(id, { status: 'lost', lost_at: new Date().toISOString() } as Partial<Lead>);
  };

  const handleConfirmDelete = () => {
    if (deleteId) { deleteLead(deleteId); setDeleteId(null); }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };
  const handleDragEnd = () => { setDraggedLeadId(null); setDragOverStageId(null); };
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStageId(null);
    }
  };
  const handleDrop = (stageId: string) => {
    if (draggedLeadId) {
      moveLeadToStage(draggedLeadId, stageId);
      setDraggedLeadId(null);
    }
    setDragOverStageId(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] w-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Title and subtitle */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Pipeline de Leads</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus negócios pelo funil de vendas</p>
        </div>

        {/* Tabs and action buttons in one row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
            <TabsList>
              <TabsTrigger value="my-leads" className="gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" />
                Meus Leads
              </TabsTrigger>
              <TabsTrigger value="shared" className="gap-1.5 text-xs">
                <Share2 className="w-3.5 h-3.5" />
                Compartilhados comigo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {user && <ShareButton resourceType="pipeline" resourceId={user.id} />}
            <Button variant="outline" size="sm" onClick={() => setStageSettings(true)}>
              <Settings2 className="w-4 h-4 mr-1.5" /> Etapas
            </Button>
            <Button size="sm" onClick={() => handleOpenForm(stages[0]?.id)}>
              <Plus className="w-4 h-4 mr-1.5" /> Novo Negócio
            </Button>
          </div>
        </div>
      </div>

        <TabsContent value="my-leads" className="flex-1 flex flex-col min-h-0 mt-0 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <DollarSign className="w-4 h-4 text-primary" /> Pipeline Total
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totalValue)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Valor Ponderado
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(weightedValue)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Trophy className="w-4 h-4 text-green-500" /> Ganhos
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{wonCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <XCircle className="w-4 h-4 text-red-400" /> Perdidos
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{lostCount}</p>
            </div>
          </div>

          {/* Search & filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar negócios..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStageFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!stageFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Todas
              </button>
              {stages.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStageFilter(s.id === stageFilter ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${stageFilter === s.id ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  style={stageFilter === s.id ? { backgroundColor: s.color } : undefined}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-3 min-h-[400px]" style={{ minWidth: stages.length * 290 }}>
              {stages.map(stage => {
                const stageLeads = filtered.filter(l => l.stage_id === stage.id).sort((a, b) => a.position - b.position);
                const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);

                return (
                  <div
                    key={stage.id}
                    className={`flex-1 min-w-[260px] max-w-[340px] flex flex-col rounded-xl border transition-all duration-200 ${
                      dragOverStageId === stage.id
                        ? 'bg-primary/5 border-primary/40 shadow-lg scale-[1.01]'
                        : 'bg-muted/30 border-border'
                    }`}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(stage.id)}
                  >
                    {/* Stage header */}
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                        <h3 className="text-sm font-semibold text-foreground flex-1 truncate">{stage.name}</h3>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {stageLeads.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stageValue)}</p>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                      {stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          className={`transition-all duration-200 ${
                            draggedLeadId === lead.id
                              ? 'opacity-40 scale-95 rotate-1'
                              : 'opacity-100 scale-100'
                          }`}
                        >
                          <LeadCard
                            lead={lead}
                            onEdit={handleEditLead}
                            onDelete={id => setDeleteId(id)}
                            onWin={handleWin}
                            onLose={handleLose}
                            onConvertToProject={handleConvertToProject}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Add button */}
                    <div className="p-2 border-t border-border">
                      <button
                        onClick={() => handleOpenForm(stage.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shared" className="flex-1 flex flex-col min-h-0 mt-0">
          {loadingShared ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Carregando leads compartilhados...</div>
            </div>
          ) : sharedLeads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Share2 className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhum lead compartilhado com você</p>
              <p className="text-xs text-muted-foreground/70">Quando alguém compartilhar um lead ou pipeline, os negócios aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Shared summary */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                    <DollarSign className="w-4 h-4 text-primary" /> Total Compartilhado
                  </div>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {formatCurrency(sharedLeads.filter(l => l.status === 'open').reduce((s, l) => s + l.value, 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Negócios Abertos
                  </div>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {sharedLeads.filter(l => l.status === 'open').length}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                    <User className="w-4 h-4 text-muted-foreground" /> Proprietários
                  </div>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {Object.keys(sharedOwners).length}
                  </p>
                </div>
              </div>

              {/* Shared leads table */}
              <div className="rounded-2xl border border-border bg-card overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Negócio</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Proprietário</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Probabilidade</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previsão</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contato</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedLeads.map((lead) => {
                      const stage = sharedStages.find(s => s.id === lead.stage_id);
                      const owner = sharedOwners[lead.user_id];
                      const ownerName = owner?.name || owner?.email || 'Desconhecido';
                      const clientName = lead.client_id ? sharedClients[lead.client_id] : null;
                      const isOverdue = lead.expected_close_date && isPast(new Date(lead.expected_close_date)) && lead.status === 'open';
                      const daysLeft = lead.expected_close_date && lead.status === 'open'
                        ? Math.ceil((new Date(lead.expected_close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const probColor = lead.probability >= 70 ? 'text-green-500' : lead.probability >= 40 ? 'text-amber-500' : 'text-red-400';

                      return (
                        <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">{lead.title}</span>
                              {clientName && (
                                <span className="text-[11px] text-muted-foreground">{clientName}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{ownerName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {stage ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] gap-1"
                              >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                {stage.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(lead.value)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3 text-muted-foreground" />
                              <span className={`text-xs font-medium ${probColor}`}>{lead.probability}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                {lead.expected_close_date ? format(new Date(lead.expected_close_date), "dd/MM/yyyy") : '-'}
                              </span>
                              {daysLeft !== null && (
                                <span className={`text-[10px] ${daysLeft < 0 ? 'text-destructive' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d restantes`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {lead.contact_name && <span className="text-xs text-foreground">{lead.contact_name}</span>}
                              {lead.contact_email && <span className="text-[11px] text-muted-foreground">{lead.contact_email}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={lead.status === 'won' ? 'default' : lead.status === 'lost' ? 'destructive' : 'secondary'}
                              className="text-[10px]"
                            >
                              {lead.status === 'won' ? '🏆 Ganho' : lead.status === 'lost' ? 'Perdido' : 'Aberto'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LeadFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditLead(null); }}
        onSave={handleSave}
        lead={editLead}
        stages={stages}
        defaultStageId={defaultStageId}
      />

      <StageSettingsModal
        open={stageSettings}
        onClose={() => setStageSettings(false)}
        stages={stages}
        onAdd={addStage}
        onUpdate={updateStage}
        onDelete={deleteStage}
      />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir negócio?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Win & Convert dialog */}
      <AlertDialog open={!!winAndConvertLead} onOpenChange={v => !v && setWinAndConvertLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🏆 Negócio ganho!</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja converter "{winAndConvertLead?.title}" em um projeto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmWin(false)}>Apenas marcar como ganho</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmWin(true)}>
              Converter em Projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert existing won lead dialog */}
      <AlertDialog open={!!convertLead} onOpenChange={v => !v && setConvertLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Criar um novo projeto a partir de "{convertLead?.title}" com valor de {convertLead?.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>Criar Projeto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
