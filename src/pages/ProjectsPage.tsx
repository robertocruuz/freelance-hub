import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderKanban, ChevronDown, ChevronRight, Package, FileText, ListPlus } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClientSelect from '@/components/ClientSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectItem {
  id: string;
  project_id: string;
  name: string;
  value: number;
  position: number;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  created_at: string;
}

interface BudgetItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Budget {
  id: string;
  name: string | null;
  client_id: string | null;
  items: BudgetItem[];
  total: number;
  status: string;
  created_at: string;
}

const ProjectsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { clients } = useClients();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectItems, setProjectItems] = useState<Record<string, ProjectItem[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Item form state
  const [showItemForm, setShowItemForm] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemValue, setItemValue] = useState('');

  // Budget import state
  const [importProjectId, setImportProjectId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // Import budget on create
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [pendingBudgetItems, setPendingBudgetItems] = useState<BudgetItem[]>([]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }, [user]);

  const loadItems = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', projectId)
      .order('position');
    if (data) {
      setProjectItems(prev => ({ ...prev, [projectId]: data }));
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const resetForm = () => {
    setName('');
    setClientId('');
    setEditingId(null);
    setShowForm(false);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemValue('');
    setEditingItemId(null);
    setShowItemForm(null);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const payload = {
      user_id: user.id,
      name: name.trim(),
      client_id: clientId || null,
    };

    if (editingId) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) return toast.error(error.message);
    }
    resetForm();
    loadProjects();
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id);
    setName(p.name);
    setClientId(p.client_id || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else loadProjects();
  };

  const handleSaveItem = async (projectId: string) => {
    if (!itemName.trim()) return;
    const payload = {
      project_id: projectId,
      name: itemName.trim(),
      value: parseFloat(itemValue) || 0,
      position: (projectItems[projectId]?.length || 0),
    };

    if (editingItemId) {
      const { error } = await supabase.from('project_items').update({ name: payload.name, value: payload.value }).eq('id', editingItemId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('project_items').insert(payload);
      if (error) return toast.error(error.message);
    }
    resetItemForm();
    loadItems(projectId);
  };

  const handleEditItem = (item: ProjectItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemValue(String(item.value));
    setShowItemForm(item.project_id);
  };

  const handleDeleteItem = async (item: ProjectItem) => {
    const { error } = await supabase.from('project_items').delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else loadItems(item.project_id);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!projectItems[id]) loadItems(id);
    }
  };

  // Budget import
  const openImportModal = async (project: Project) => {
    setImportProjectId(project.id);
    setLoadingBudgets(true);
    const query = supabase.from('budgets').select('*').order('created_at', { ascending: false });
    if (project.client_id) {
      query.eq('client_id', project.client_id);
    }
    const { data } = await query;
    if (data) {
      setBudgets(data.map(b => ({
        ...b,
        items: (Array.isArray(b.items) ? b.items : []) as unknown as BudgetItem[],
      })));
    }
    setLoadingBudgets(false);
  };

  const importBudgetItem = async (item: BudgetItem) => {
    if (!importProjectId) return;
    const currentItems = projectItems[importProjectId] || [];
    const { error } = await supabase.from('project_items').insert({
      project_id: importProjectId,
      name: item.description,
      value: item.quantity * item.unitPrice,
      position: currentItems.length,
    });
    if (error) return toast.error(error.message);
    toast.success(`"${item.description}" importado!`);
    loadItems(importProjectId);
  };

  const importAllBudgetItems = async (budget: Budget) => {
    if (!importProjectId) return;
    const currentItems = projectItems[importProjectId] || [];
    const inserts = budget.items.map((item, idx) => ({
      project_id: importProjectId,
      name: item.description,
      value: item.quantity * item.unitPrice,
      position: currentItems.length + idx,
    }));
    const { error } = await supabase.from('project_items').insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${budget.items.length} itens importados!`);
    loadItems(importProjectId);
    setImportProjectId(null);
  };

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name || '-';

  const getProjectTotal = (projectId: string) => {
    const items = projectItems[projectId] || [];
    return items.reduce((sum, item) => sum + item.value, 0);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: 'Rascunho', sent: 'Enviado', approved: 'Aprovado', rejected: 'Recusado' };
    return map[s] || s;
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    clientName(p.client_id).toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t.projects}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> {t.newProject}
        </button>
      </div>

      <input
        placeholder={t.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={inputClass + " max-w-sm"}
      />

      {showForm && (
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? t.editProject : t.newProject}
          </h2>
          <input placeholder={t.projectName} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          <ClientSelect value={clientId} onChange={setClientId} />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              {t.save}
            </button>
            <button onClick={resetForm} className="px-5 py-2 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">{t.noProjects}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id;
            const items = projectItems[p.id] || [];
            const total = getProjectTotal(p.id);

            return (
              <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Project header */}
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <FolderKanban className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {clientName(p.client_id)}
                        {isExpanded && items.length > 0 && (
                          <> · {items.length} {items.length === 1 ? 'item' : 'itens'} · R$ {total.toFixed(2)}</>
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Items list */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">Nenhum item neste projeto.</p>
                    )}
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">R$ {item.value.toFixed(2)}</span>
                          <button
                            onClick={() => {
                              const project = projects.find(pr => pr.id === item.project_id);
                              const params = new URLSearchParams({
                                from_budget: 'true',
                                title: item.name,
                                value: String(item.value),
                                ...(item.project_id ? { project: item.project_id } : {}),
                                ...(project?.client_id ? { client: project.client_id } : {}),
                              });
                              navigate(`/dashboard/kanban?${params.toString()}`);
                            }}
                            className="p-1 rounded hover:bg-accent transition-colors"
                            title="Criar tarefa no Kanban"
                          >
                            <ListPlus className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button onClick={() => handleEditItem(item)} className="p-1 rounded hover:bg-accent transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDeleteItem(item)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add/edit item form */}
                    {showItemForm === p.id ? (
                      <div className="flex gap-2 items-end pt-1">
                        <input
                          placeholder="Nome do item"
                          value={itemName}
                          onChange={e => setItemName(e.target.value)}
                          className={inputClass + " flex-1"}
                        />
                        <input
                          placeholder="Valor (R$)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemValue}
                          onChange={e => setItemValue(e.target.value)}
                          className={inputClass + " w-32"}
                        />
                        <button
                          onClick={() => handleSaveItem(p.id)}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm whitespace-nowrap"
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={resetItemForm}
                          className="px-4 py-2 rounded-lg bg-muted text-muted-foreground font-semibold text-sm"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => { resetItemForm(); setShowItemForm(p.id); }}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" /> {t.addItem}
                        </button>
                        <button
                          onClick={() => openImportModal(p)}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" /> Importar do orçamento
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Import from budget modal */}
      <Dialog open={!!importProjectId} onOpenChange={(open) => { if (!open) setImportProjectId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar itens do orçamento</DialogTitle>
          </DialogHeader>
          {loadingBudgets ? (
            <p className="text-sm text-muted-foreground py-4">Carregando orçamentos...</p>
          ) : budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum orçamento encontrado para este cliente.</p>
          ) : (
            <div className="space-y-4">
              {budgets.map(b => (
                <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {clientName(b.client_id)} · R$ {b.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()} · {statusLabel(b.status)}
                      </p>
                    </div>
                    <button
                      onClick={() => importAllBudgetItems(b)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      Importar todos
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {b.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm text-foreground">{item.description || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}x R$ {item.unitPrice.toFixed(2)} = R$ {(item.quantity * item.unitPrice).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => importBudgetItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-80"
                        >
                          Importar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
