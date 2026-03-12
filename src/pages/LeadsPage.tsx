import { useState, useMemo } from 'react';
import { useLeads, Lead } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import LeadCard from '@/components/leads/LeadCard';
import LeadFormModal from '@/components/leads/LeadFormModal';
import StageSettingsModal from '@/components/leads/StageSettingsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings2, Search, DollarSign, TrendingUp, Trophy, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

    // Create project item with lead value
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
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pipeline de Leads</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus negócios pelo funil de vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStageSettings(true)}>
            <Settings2 className="w-4 h-4 mr-1.5" /> Etapas
          </Button>
          <Button size="sm" onClick={() => handleOpenForm(stages[0]?.id)}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo Negócio
          </Button>
        </div>
      </div>

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
            className="pl-9 h-9"
          />
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
                className="flex-1 min-w-[260px] max-w-[340px] flex flex-col rounded-xl bg-muted/30 border border-border"
                onDragOver={handleDragOver}
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
                      onDragStart={() => handleDragStart(lead.id)}
                      onDragEnd={handleDragEnd}
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
