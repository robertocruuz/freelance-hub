import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, FolderKanban, ChevronDown, ChevronRight, Package, FileText, ListPlus, MoreVertical, Sparkles, CalendarIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  due_date: string | null;
  discount: number;
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
  delivery_date: string | null;
  items: BudgetItem[];
  discount: number;
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
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [inlineEditItemId, setInlineEditItemId] = useState<string | null>(null);
  const [inlineEditName, setInlineEditName] = useState('');

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
  const [projectDiscount, setProjectDiscount] = useState(0);

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
    setDueDate(undefined);
    setEditingId(null);
    setShowForm(false);
    setSelectedBudgetId(null);
    setPendingBudgetItems([]);
    setProjectDiscount(0);
  };

  const [allProjectItemNames, setAllProjectItemNames] = useState<Set<string>>(new Set());

  const loadAllBudgets = useCallback(async () => {
    if (!user) return;
    const [budgetRes, itemsRes] = await Promise.all([
      supabase.from('budgets').select('*').order('created_at', { ascending: false }),
      supabase.from('project_items').select('name'),
    ]);
    if (budgetRes.data) {
      setAllBudgets(budgetRes.data.map(b => ({
        ...b,
        items: (Array.isArray(b.items) ? b.items : []) as unknown as BudgetItem[],
      })));
    }
    if (itemsRes.data) {
      setAllProjectItemNames(new Set(itemsRes.data.map(i => i.name)));
    }
  }, [user]);

  const isBudgetFullyImported = (budget: Budget) => {
    return budget.items.length > 0 && budget.items.every(item => allProjectItemNames.has(item.description));
  };

  const handleSelectBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    const budget = allBudgets.find(b => b.id === budgetId);
    if (budget) {
      setName(budget.name || '');
      setClientId(budget.client_id || '');
      setPendingBudgetItems(budget.items);
      setProjectDiscount(budget.discount || 0);
      if (budget.delivery_date) {
        setDueDate(new Date(budget.delivery_date + 'T12:00:00'));
      }
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemValue('');
    setEditingItemId(null);
    setShowItemForm(null);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const selectedBudget = allBudgets.find(b => b.id === selectedBudgetId);
    const dueDateStr = dueDate ? format(dueDate, 'yyyy-MM-dd') : (selectedBudget?.delivery_date || null);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      client_id: clientId || null,
      due_date: dueDateStr,
      discount: projectDiscount,
    };

    if (editingId) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
      if (error) return toast.error(error.message);
      // Import budget items if a budget was selected
      if (data && pendingBudgetItems.length > 0) {
        const inserts = pendingBudgetItems.map((item, idx) => ({
          project_id: data.id,
          name: item.description,
          value: item.quantity * item.unitPrice,
          position: idx,
        }));
        const { error: itemsError } = await supabase.from('project_items').insert(inserts);
        if (itemsError) toast.error(itemsError.message);
        else toast.success(`${inserts.length} itens importados do orçamento!`);
      }
    }
    resetForm();
    loadProjects();
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id);
    setName(p.name);
    setClientId(p.client_id || '');
    setDueDate(p.due_date ? new Date(p.due_date + 'T12:00:00') : undefined);
    setProjectDiscount(p.discount || 0);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    // Delete related time entries and tasks first
    await supabase.from('time_entries').delete().eq('project_id', id);
    await supabase.from('tasks').delete().eq('project_id', id);
    await supabase.from('project_items').delete().eq('project_id', id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Projeto e dados relacionados excluídos!');
      loadProjects();
    }
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
    // Ensure items are loaded for this project
    if (!projectItems[project.id]) await loadItems(project.id);
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

  const isItemImported = (item: BudgetItem) => {
    if (!importProjectId) return false;
    const existing = projectItems[importProjectId] || [];
    return existing.some(e => e.name === item.description);
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
    const newItems = budget.items.filter(item => !isItemImported(item));
    if (newItems.length === 0) return toast.info('Todos os itens já foram importados.');
    const inserts = newItems.map((item, idx) => ({
      project_id: importProjectId,
      name: item.description,
      value: item.quantity * item.unitPrice,
      position: currentItems.length + idx,
    }));
    const { error } = await supabase.from('project_items').insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} itens importados!`);
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
          onClick={() => { resetForm(); setShowForm(true); loadAllBudgets(); }}
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

          {/* Budget import suggestion - only for new projects */}
          {!editingId && allBudgets.length > 0 && (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Importar de um orçamento
              </p>
              <select
                value={selectedBudgetId || ''}
                onChange={(e) => e.target.value ? handleSelectBudget(e.target.value) : null}
                className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um orçamento...</option>
                {allBudgets.map(b => {
                  const imported = isBudgetFullyImported(b);
                  return (
                    <option key={b.id} value={b.id} disabled={imported}>
                      {b.name || clientName(b.client_id)} · {formatCurrency(b.total)} · {statusLabel(b.status)}{imported ? ' ✓ Importado' : ''}
                    </option>
                  );
                })}
              </select>
              {selectedBudgetId && pendingBudgetItems.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {pendingBudgetItems.length} {pendingBudgetItems.length === 1 ? 'item será importado' : 'itens serão importados'} ao salvar.
                </div>
              )}
            </div>
          )}

          <input placeholder={t.projectName} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          {editingId ? (
            <div className="px-4 py-2 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{clientName(clientId || null)}</span>
            </div>
          ) : (
            <ClientSelect value={clientId} onChange={setClientId} />
          )}

          {/* Due date picker */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Prazo de entrega</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    inputClass,
                    "flex items-center gap-2 text-left",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecione o prazo...'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview of items to import */}
          {pendingBudgetItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Itens do orçamento:</p>
              {pendingBudgetItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
                  <span className="text-foreground">{item.description}</span>
                  <span className="text-muted-foreground">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Discount field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Desconto (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={projectDiscount || ''}
              onChange={e => setProjectDiscount(+e.target.value)}
              placeholder="0"
              className={inputClass + " w-40"}
            />
          </div>

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
        <div className="space-y-6">
          {(() => {
            const grouped: Record<string, Project[]> = {};
            filtered.forEach(p => {
              const key = p.client_id || '__no_client__';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(p);
            });
            // Sort: clients with name first, "sem cliente" last
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === '__no_client__') return 1;
              if (b === '__no_client__') return -1;
              return clientName(a).localeCompare(clientName(b));
            });

            return sortedKeys.map(key => (
              <div key={key} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {key === '__no_client__' ? 'Sem cliente' : clientName(key)}
                  <span className="ml-2 text-xs font-normal">({grouped[key].length})</span>
                </h2>
                <div className="space-y-2">
                  {grouped[key].map(p => {
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
                        {p.due_date && (
                          <>Prazo: {format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</>
                        )}
                        {isExpanded && items.length > 0 && (
                          <> · {items.length} {items.length === 1 ? 'item' : 'itens'} · {formatCurrency(total)}
                            {p.discount > 0 && <> · Desconto: {p.discount}%</>}
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDeleteConfirmId(p.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir projeto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Items list */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">Nenhum item neste projeto.</p>
                    )}
                    {items.map(item => {
                      const isItemExpanded = expandedItemId === item.id;
                      return (
                        <div key={item.id} className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                          {/* Item header - clickable to expand */}
                          <button
                            onClick={() => setExpandedItemId(isItemExpanded ? null : item.id)}
                            className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/80 transition-colors"
                          >
                            {isItemExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{item.name}</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const project = projects.find(pr => pr.id === item.project_id);
                                const params = new URLSearchParams({
                                  from_budget: 'true',
                                  title: item.name,
                                  value: String(item.value),
                                  ...(item.project_id ? { project: item.project_id } : {}),
                                  ...(project?.client_id ? { client: project.client_id } : {}),
                                  ...(project?.due_date ? { due_date: project.due_date } : {}),
                                });
                                navigate(`/dashboard/kanban?${params.toString()}`);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors group shrink-0 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-primary group-hover:animate-pulse" />
                              <span className="text-xs font-medium text-primary">Tarefa</span>
                            </span>
                          </button>

                          {/* Expanded content */}
                          {isItemExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                              {/* Editable name */}
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                {inlineEditItemId === item.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      value={inlineEditName}
                                      onChange={e => setInlineEditName(e.target.value)}
                                      className={inputClass + " flex-1 !py-1.5 text-sm"}
                                      autoFocus
                                    />
                                    <button
                                      onClick={async () => {
                                        if (!inlineEditName.trim()) return;
                                        await supabase.from('project_items').update({ name: inlineEditName.trim() }).eq('id', item.id);
                                        setInlineEditItemId(null);
                                        loadItems(item.project_id);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                                    >
                                      {t.save}
                                    </button>
                                    <button
                                      onClick={() => setInlineEditItemId(null)}
                                      className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold"
                                    >
                                      {t.cancel}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setInlineEditItemId(item.id); setInlineEditName(item.name); }}
                                    className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                                  >
                                    {item.name}
                                    <Pencil className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                )}
                              </div>

                              {/* Value display */}
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Valor</label>
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  <span className="text-xs font-medium text-destructive">Excluir</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

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
              </div>
            ));
          })()}
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
                        {clientName(b.client_id)} · {formatCurrency(b.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()} · {statusLabel(b.status)}
                      </p>
                    </div>
                    {b.items.every(item => isItemImported(item)) ? (
                      <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
                        Todos importados
                      </span>
                    ) : (
                      <button
                        onClick={() => importAllBudgetItems(b)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        Importar todos
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {b.items.map((item, idx) => {
                      const imported = isItemImported(item);
                      return (
                        <div key={idx} className={`flex items-center justify-between px-3 py-2 ${imported ? 'opacity-50' : ''}`}>
                          <div>
                            <p className="text-sm text-foreground flex items-center gap-1.5">
                              {item.description || '—'}
                              {imported && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-medium">Importado</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x R$ {item.unitPrice.toFixed(2)} = R$ {(item.quantity * item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                          {!imported && (
                            <button
                              onClick={() => importBudgetItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-80"
                            >
                              Importar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Todos os itens do projeto, tarefas no Kanban e registros de tempo vinculados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteConfirmId) { handleDelete(deleteConfirmId); setDeleteConfirmId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsPage;
