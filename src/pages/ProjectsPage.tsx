import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, FolderKanban, ChevronDown, ChevronRight, Package, FileText, MoreVertical, Sparkles, CalendarIcon, X, Kanban, Link2, FolderOpen, ExternalLink, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

  // Board picker for task creation
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<{ id: string; name: string }[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [pendingTaskItem, setPendingTaskItem] = useState<{ name: string; value: number; projectId: string; clientId: string | null; dueDate: string | null } | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Track which project items already have tasks created
  const [existingTaskKeys, setExistingTaskKeys] = useState<Set<string>>(new Set());

  // Project files state
  interface ProjectFile {
    id: string;
    project_id: string;
    name: string;
    url: string;
    file_type: string;
    description: string | null;
    created_at: string;
  }
  const [projectFiles, setProjectFiles] = useState<Record<string, ProjectFile[]>>({});
  const [showFileForm, setShowFileForm] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<'file' | 'folder'>('file');
  const [fileDescription, setFileDescription] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  const loadFiles = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (data) {
      setProjectFiles(prev => ({ ...prev, [projectId]: data as ProjectFile[] }));
    }
  }, []);

  const resetFileForm = () => {
    setFileName('');
    setFileUrl('');
    setFileType('file');
    setFileDescription('');
    setEditingFileId(null);
    setShowFileForm(null);
  };

  const handleSaveFile = async (projectId: string) => {
    if (!user || !fileName.trim() || !fileUrl.trim()) return;
    if (editingFileId) {
      const { error } = await supabase.from('project_files').update({
        name: fileName.trim(),
        url: fileUrl.trim(),
        file_type: fileType,
        description: fileDescription.trim() || null,
      }).eq('id', editingFileId);
      if (error) return toast.error(error.message);
      toast.success('Arquivo atualizado!');
    } else {
      const { error } = await supabase.from('project_files').insert({
        project_id: projectId,
        user_id: user.id,
        name: fileName.trim(),
        url: fileUrl.trim(),
        file_type: fileType,
        description: fileDescription.trim() || null,
      });
      if (error) return toast.error(error.message);
      toast.success('Arquivo adicionado!');
    }
    resetFileForm();
    loadFiles(projectId);
  };

  const handleDeleteFile = async (file: ProjectFile) => {
    const { error } = await supabase.from('project_files').delete().eq('id', file.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Arquivo removido!');
      loadFiles(file.project_id);
    }
  };

  const handleEditFile = (file: ProjectFile) => {
    setEditingFileId(file.id);
    setFileName(file.name);
    setFileUrl(file.url);
    setFileType(file.file_type as 'file' | 'folder');
    setFileDescription(file.description || '');
    setShowFileForm(file.project_id);
  };

  const loadExistingTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('tasks').select('title, project_id').not('project_id', 'is', null);
    if (data) {
      setExistingTaskKeys(new Set(data.map(t => `${t.title}::${t.project_id}`)));
    }
  }, [user]);

  const isTaskCreated = (item: ProjectItem) => existingTaskKeys.has(`${item.name}::${item.project_id}`);

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

  useEffect(() => { loadProjects(); loadExistingTasks(); }, [loadProjects, loadExistingTasks]);

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
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!projectItems[id]) loadItems(id);
        if (!projectFiles[id]) loadFiles(id);
      }
      return next;
    });
  };

  // Budget import
  const openImportModal = async (project: Project) => {
    setImportProjectId(project.id);
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
  const clientColor = (id: string | null) => (clients.find(c => c.id === id) as any)?.color || null;

  const getProjectTotal = (projectId: string) => {
    const items = projectItems[projectId] || [];
    return items.reduce((sum, item) => sum + item.value, 0);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: 'Rascunho', sent: 'Enviado', approved: 'Aprovado', rejected: 'Recusado' };
    return map[s] || s;
  };

  const openBoardPicker = async (item: ProjectItem) => {
    const project = projects.find(pr => pr.id === item.project_id);
    setPendingTaskItem({
      name: item.name,
      value: item.value,
      projectId: item.project_id,
      clientId: project?.client_id || null,
      dueDate: project?.due_date || null,
    });
    const { data } = await supabase.from('kanban_boards').select('id, name, project_id, client_id').order('position');
    const boards = data || [];
    setAvailableBoards(boards);
    const projectBoard = boards.find(b => b.project_id === item.project_id);
    const clientBoard = project?.client_id ? boards.find(b => b.client_id === project.client_id) : null;
    setSelectedBoardId(projectBoard?.id || clientBoard?.id || (boards.length > 0 ? boards[0].id : null));
    setNewBoardName('');
    setCreatingBoard(false);
    setShowBoardPicker(true);
  };

  const handleCreateTaskInBoard = async () => {
    if (!user || !pendingTaskItem) return;
    let boardId = selectedBoardId;

    if (creatingBoard && newBoardName.trim()) {
      const { data: newBoard } = await supabase
        .from('kanban_boards')
        .insert({ name: newBoardName.trim(), user_id: user.id, position: availableBoards.length })
        .select()
        .single();
      if (!newBoard) return toast.error('Erro ao criar painel');
      boardId = newBoard.id;

      const defaultCols = [
        { name: 'Para Fazer', position: 0 },
        { name: 'Em Andamento', position: 1 },
        { name: 'Alteração', position: 2 },
        { name: 'Concluído', position: 3 },
        { name: 'Arquivado', position: 4 },
      ];
      await supabase.from('kanban_columns').insert(
        defaultCols.map(c => ({ ...c, user_id: user.id, board_id: newBoard.id }))
      );
    }

    if (!boardId) return toast.error('Selecione ou crie um painel');

    const { data: existingDup } = await supabase
      .from('tasks')
      .select('id')
      .eq('title', pendingTaskItem.name)
      .eq('project_id', pendingTaskItem.projectId)
      .limit(1);

    if (existingDup && existingDup.length > 0) {
      return toast.error('Já existe uma tarefa com esse nome neste projeto.');
    }

    const { data: cols } = await supabase
      .from('kanban_columns')
      .select('id')
      .eq('board_id', boardId)
      .order('position')
      .limit(1);

    if (!cols || cols.length === 0) return toast.error('Painel sem colunas');

    const { error } = await supabase
      .from('tasks')
      .insert({
        title: pendingTaskItem.name,
        column_id: cols[0].id,
        position: 0,
        user_id: user.id,
        estimated_value: pendingTaskItem.value,
        project_id: pendingTaskItem.projectId,
        client_id: pendingTaskItem.clientId,
        due_date: pendingTaskItem.dueDate,
        description: `Criado a partir de item de projeto — Valor: ${formatCurrency(pendingTaskItem.value)}`,
      })
      .select()
      .single();

    if (error) return toast.error(error.message);
    toast.success(`Tarefa "${pendingTaskItem.name}" criada!`);
    setShowBoardPicker(false);
    setPendingTaskItem(null);
    loadExistingTasks();
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    clientName(p.client_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{t.projects}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); loadAllBudgets(); }}
          className="gap-2 rounded-xl font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t.newProject}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8 rounded-xl"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? t.editProject : t.newProject}
          </h2>

          {/* Budget import suggestion */}
          {!editingId && allBudgets.length > 0 && (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Importar de um orçamento
              </p>
              <select
                value={selectedBudgetId || ''}
                onChange={(e) => e.target.value ? handleSelectBudget(e.target.value) : null}
                className="w-full h-10 px-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                <p className="text-xs text-muted-foreground">
                  {pendingBudgetItems.length} {pendingBudgetItems.length === 1 ? 'item será importado' : 'itens serão importados'} ao salvar.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do projeto</label>
            <Input placeholder={t.projectName} value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            {editingId ? (
              <div className="h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground flex items-center">
                Cliente: <span className="font-medium text-foreground ml-1">{clientName(clientId || null)}</span>
              </div>
            ) : (
              <ClientSelect value={clientId} onChange={setClientId} />
            )}
          </div>

          {/* Due date picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prazo de entrega</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "w-full h-10 px-3 rounded-xl bg-background border border-input text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 shrink-0" />
                  {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecione o prazo...'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview of items to import */}
          {pendingBudgetItems.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Itens do orçamento</label>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {pendingBudgetItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted/30 text-sm">
                    <span className="text-foreground">{item.description}</span>
                    <span className="text-muted-foreground font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desconto (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={projectDiscount || ''}
              onChange={e => setProjectDiscount(+e.target.value)}
              placeholder="0"
              className="w-40 rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} className="rounded-xl font-semibold">
              {t.save}
            </Button>
            <Button variant="ghost" onClick={resetForm} className="rounded-xl font-semibold">
              {t.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">{t.noProjects}</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Crie um projeto para começar a organizar seus trabalhos.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const grouped: Record<string, Project[]> = {};
            filtered.forEach(p => {
              const key = p.client_id || '__no_client__';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(p);
            });
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === '__no_client__') return 1;
              if (b === '__no_client__') return -1;
              return clientName(a).localeCompare(clientName(b));
            });

            return sortedKeys.map(key => {
              const color = key !== '__no_client__' ? clientColor(key) : null;
              return (
                <div key={key} className="space-y-2.5">
                  {/* Client group header */}
                  <div className="flex items-center gap-2 px-1">
                    {color && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    )}
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {key === '__no_client__' ? 'Sem cliente' : clientName(key)}
                    </h2>
                    <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">
                      {grouped[key].length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {grouped[key].map(p => {
                      const isExpanded = expandedIds.has(p.id);
                      const items = projectItems[p.id] || [];
                      const total = getProjectTotal(p.id);
                      const color = clientColor(p.client_id);

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "rounded-xl border overflow-hidden transition-all duration-200",
                            isExpanded ? "shadow-md" : "hover:shadow-sm"
                          )}
                          style={color
                            ? { backgroundColor: `${color}08`, borderColor: `${color}30`, borderLeftWidth: '3px', borderLeftColor: color }
                            : { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }
                          }
                        >
                          {/* Project header */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer group"
                            onClick={() => toggleExpand(p.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"
                              )}>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {p.due_date && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="w-3 h-3" />
                                      {format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                    </span>
                                  )}
                                  {isExpanded && items.length > 0 && (
                                    <>
                                      <span className="text-xs text-muted-foreground">·</span>
                                      <span className="text-xs font-medium text-foreground/80">
                                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">·</span>
                                      <span className="text-xs font-semibold text-primary">
                                        {formatCurrency(total)}
                                      </span>
                                      {p.discount > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/20 text-accent-foreground font-medium">
                                          -{p.discount}%
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg"
                                onClick={() => handleEdit(p)}
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDeleteConfirmId(p.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir projeto
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded content with tabs */}
                          {isExpanded && (
                            <div className="border-t border-border/50 px-4 pb-4 pt-3 animate-fade-in">
                              <Tabs defaultValue="items">
                                <TabsList className="mb-3 h-9">
                                  <TabsTrigger value="items" className="text-xs gap-1.5 rounded-lg">
                                    <Package className="w-3.5 h-3.5" /> Itens
                                  </TabsTrigger>
                                  <TabsTrigger value="files" className="text-xs gap-1.5 rounded-lg">
                                    <Link2 className="w-3.5 h-3.5" /> Arquivos
                                  </TabsTrigger>
                                </TabsList>

                                {/* ITEMS TAB */}
                                <TabsContent value="items" className="space-y-2 mt-0">
                                  {items.length === 0 && !showItemForm && (
                                    <div className="text-center py-6">
                                      <Package className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
                                      <p className="text-xs text-muted-foreground">Nenhum item neste projeto.</p>
                                    </div>
                                  )}
                                  {items.map(item => {
                                    const isItemExpanded = expandedItemId === item.id;
                                    return (
                                      <div key={item.id} className="rounded-lg border border-border bg-background/50 overflow-hidden transition-all">
                                        <button
                                          onClick={() => setExpandedItemId(isItemExpanded ? null : item.id)}
                                          className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-muted/50 transition-colors"
                                        >
                                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
                                            {isItemExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                          </div>
                                          <Package className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                                          <span className="text-sm font-medium text-foreground flex-1 truncate">{item.name}</span>
                                          <span className="text-xs font-semibold text-muted-foreground tabular-nums mr-1">
                                            {formatCurrency(item.value)}
                                          </span>
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isTaskCreated(item)) openBoardPicker(item);
                                            }}
                                            className={cn(
                                              "flex items-center gap-1 px-2 py-1 rounded-md border shrink-0 text-[11px] font-medium transition-colors",
                                              isTaskCreated(item)
                                                ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-default'
                                                : 'bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary cursor-pointer'
                                            )}
                                          >
                                            <Sparkles className="w-3 h-3" />
                                            {isTaskCreated(item) ? 'Criada' : 'Tarefa'}
                                          </span>
                                        </button>

                                        {isItemExpanded && (
                                          <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-3 animate-fade-in">
                                            <div className="space-y-1">
                                              <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                              {inlineEditItemId === item.id ? (
                                                <div className="flex gap-2">
                                                  <Input
                                                    value={inlineEditName}
                                                    onChange={e => setInlineEditName(e.target.value)}
                                                    className="flex-1 h-8 text-sm rounded-lg"
                                                    autoFocus
                                                  />
                                                  <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg text-xs"
                                                    onClick={async () => {
                                                      if (!inlineEditName.trim()) return;
                                                      await supabase.from('project_items').update({ name: inlineEditName.trim() }).eq('id', item.id);
                                                      setInlineEditItemId(null);
                                                      loadItems(item.project_id);
                                                    }}
                                                  >
                                                    {t.save}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 rounded-lg text-xs"
                                                    onClick={() => setInlineEditItemId(null)}
                                                  >
                                                    {t.cancel}
                                                  </Button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => { setInlineEditItemId(item.id); setInlineEditName(item.name); }}
                                                  className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors group"
                                                >
                                                  {item.name}
                                                  <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                              )}
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-xs font-medium text-muted-foreground">Valor</label>
                                              <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                                              onClick={() => handleDeleteItem(item)}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {showItemForm === p.id ? (
                                    <div className="flex gap-2 items-end pt-1">
                                      <Input
                                        placeholder="Nome do item"
                                        value={itemName}
                                        onChange={e => setItemName(e.target.value)}
                                        className="flex-1 h-9 rounded-lg text-sm"
                                      />
                                      <Input
                                        placeholder="Valor (R$)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={itemValue}
                                        onChange={e => setItemValue(e.target.value)}
                                        className="w-28 h-9 rounded-lg text-sm"
                                      />
                                      <Button
                                        size="sm"
                                        className="h-9 rounded-lg text-xs"
                                        onClick={() => handleSaveItem(p.id)}
                                      >
                                        {t.save}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 rounded-lg text-xs"
                                        onClick={resetItemForm}
                                      >
                                        {t.cancel}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 pt-1">
                                      <button
                                        onClick={() => { resetItemForm(); setShowItemForm(p.id); }}
                                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> {t.addItem}
                                      </button>
                                      <button
                                        onClick={() => openImportModal(p)}
                                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> Importar do orçamento
                                      </button>
                                    </div>
                                  )}
                                </TabsContent>

                                {/* FILES TAB */}
                                <TabsContent value="files" className="space-y-2 mt-0">
                                  {(() => {
                                    const files = projectFiles[p.id] || [];
                                    return (
                                      <>
                                        {files.length === 0 && showFileForm !== p.id && (
                                          <div className="text-center py-6">
                                            <Link2 className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
                                            <p className="text-xs text-muted-foreground">Nenhum arquivo cadastrado.</p>
                                          </div>
                                        )}
                                        {files.map(file => (
                                          <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 group hover:bg-muted/30 transition-colors">
                                            <div className={cn(
                                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                              file.file_type === 'folder' ? "bg-amber-500/10" : "bg-primary/10"
                                            )}>
                                              {file.file_type === 'folder' ? (
                                                <FolderOpen className="w-4 h-4 text-amber-500" />
                                              ) : (
                                                <FileText className="w-4 h-4 text-primary" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                                              >
                                                {file.name}
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                              </a>
                                              {file.description && (
                                                <p className="text-xs text-muted-foreground truncate">{file.description}</p>
                                              )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={() => handleEditFile(file)}>
                                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                              </Button>
                                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-destructive/10" onClick={() => handleDeleteFile(file)}>
                                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}

                                        {showFileForm === p.id ? (
                                          <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3 animate-fade-in">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                                <Input
                                                  placeholder="Ex: Briefing do projeto"
                                                  value={fileName}
                                                  onChange={e => setFileName(e.target.value)}
                                                  className="rounded-lg h-9 text-sm"
                                                  autoFocus
                                                />
                                              </div>
                                              <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                                                <select
                                                  value={fileType}
                                                  onChange={e => setFileType(e.target.value as 'file' | 'folder')}
                                                  className="w-full h-9 px-3 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                  <option value="file">Arquivo</option>
                                                  <option value="folder">Pasta</option>
                                                </select>
                                              </div>
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-xs font-medium text-muted-foreground">URL</label>
                                              <Input
                                                placeholder="https://drive.google.com/..."
                                                value={fileUrl}
                                                onChange={e => setFileUrl(e.target.value)}
                                                className="rounded-lg h-9 text-sm"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
                                              <Input
                                                placeholder="Breve descrição do arquivo"
                                                value={fileDescription}
                                                onChange={e => setFileDescription(e.target.value)}
                                                className="rounded-lg h-9 text-sm"
                                              />
                                            </div>
                                            <div className="flex gap-2 pt-0.5">
                                              <Button size="sm" className="rounded-lg text-xs" onClick={() => handleSaveFile(p.id)}>
                                                {t.save}
                                              </Button>
                                              <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={resetFileForm}>
                                                {t.cancel}
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => { resetFileForm(); setShowFileForm(p.id); }}
                                            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline pt-1"
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Adicionar link
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </TabsContent>
                              </Tabs>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
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
                      <Button size="sm" className="rounded-lg text-xs" onClick={() => importAllBudgetItems(b)}>
                        Importar todos
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {b.items.map((item, idx) => {
                      const imported = isItemImported(item);
                      return (
                        <div key={idx} className={cn("flex items-center justify-between px-3 py-2", imported && "opacity-50")}>
                          <div>
                            <p className="text-sm text-foreground flex items-center gap-1.5">
                              {item.description || '—'}
                              {imported && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-medium">Importado</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
                            </p>
                          </div>
                          {!imported && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-lg text-xs h-7"
                              onClick={() => importBudgetItem(item)}
                            >
                              Importar
                            </Button>
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

      {/* Delete confirmation */}
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

      {/* Board picker dialog */}
      <Dialog open={showBoardPicker} onOpenChange={setShowBoardPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-primary" />
              Criar tarefa no painel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pendingTaskItem && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground">{pendingTaskItem.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(pendingTaskItem.value)}</p>
              </div>
            )}

            {!creatingBoard ? (
              <>
                {availableBoards.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Selecione o painel</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {availableBoards.map((board) => (
                        <button
                          key={board.id}
                          onClick={() => setSelectedBoardId(board.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition border",
                            selectedBoardId === board.id
                              ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                              : 'bg-secondary/50 text-foreground border-transparent hover:bg-secondary'
                          )}
                        >
                          <Kanban className="w-3.5 h-3.5 inline mr-2" />
                          {board.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhum painel encontrado. Crie um para continuar.</p>
                )}
                <button
                  onClick={() => setCreatingBoard(true)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition border border-dashed border-border"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar novo painel
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Nome do novo painel</label>
                <Input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Ex: Marketing, Sprint 1..."
                  className="rounded-xl"
                  autoFocus
                />
                <button
                  onClick={() => setCreatingBoard(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Voltar para a lista
                </button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBoardPicker(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateTaskInBoard}
              disabled={!creatingBoard ? !selectedBoardId : !newBoardName.trim()}
              className="btn-glow"
            >
              Criar tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
