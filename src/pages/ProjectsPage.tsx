import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, FolderKanban, ChevronDown, ChevronRight, ListChecks, FileText, MoreVertical, Sparkles, CalendarIcon, X, Kanban, Link2, FolderOpen, ExternalLink, Search, MessageCircle, Star } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
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
import { HexColorPicker } from 'react-colorful';

const PROJECT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#78716C',
];

interface ProjectItem {
  id: string;
  project_id: string;
  name: string;
  value: number;
  position: number;
}

interface Project {
  id: string;
  user_id: string;
  name: string;
  client_id: string | null;
  due_date: string | null;
  due_text: string | null;
  discount: number;
  created_at: string;
  is_favorite?: boolean;
  color?: string | null;
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
  delivery_text: string | null;
  items: BudgetItem[];
  discount: number;
  total: number;
  status: string;
  created_at: string;
}

export const getContrastYIQ = (hexcolor: string | null) => {
  if (!hexcolor) return 'dark';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split("").map(h => h + h).join("");
  }
  const r = parseInt(hexcolor.substr(0, 2), 16) || 0;
  const g = parseInt(hexcolor.substr(2, 2), 16) || 0;
  const b = parseInt(hexcolor.substr(4, 2), 16) || 0;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Aumentamos o threshold (padrão 128) para 160 para favorecer textos claros (brancos)
  // em cores de tom médio vibrante como o laranja, mantendo o contraste visual moderno.
  return (yiq >= 160) ? 'dark' : 'light';
};

const ProjectsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isAdmin } = useOrganization();
  const { clients } = useClients();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectItems, setProjectItems] = useState<Record<string, ProjectItem[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueText, setDueText] = useState('');
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
    const { error } = await supabase.from('project_files').delete().eq('id', file.id).select('id').single();
    if (error) {
      if (error.code === 'PGRST116') toast.error('Sem permissão para remover arquivo.');
      else toast.error(error.message);
    } else {
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
    const { data } = await supabase
      .from('tasks')
      .select('title, project_id, kanban_columns!inner(board_id)')
      .not('project_id', 'is', null)
      .not('column_id', 'is', null)
      .not('kanban_columns.board_id', 'is', null);

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

  // Refresh task keys when window regains focus or tab becomes visible
  useEffect(() => {
    const onFocus = () => { loadExistingTasks(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') loadExistingTasks(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadExistingTasks]);


  const resetForm = () => {
    setName('');
    setClientId('');
    setColor(null);
    setDueDate(undefined);
    setDueText('');
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
      setDueText(budget.delivery_text || '');
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

    // Check for duplicate projects with same name for this client
    const { data: existingProject, error: duplicateError } = await supabase
      .from('projects')
      .select('id')
      .eq('name', name.trim())
      .eq('client_id', clientId || null)
      .neq('id', editingId || '00000000-0000-0000-0000-000000000000') // ignore current if editing
      .limit(1)
      .maybeSingle();

    if (existingProject) {
      toast.error('Já existe um projeto com este nome para este cliente.');
      return;
    }

    const selectedBudget = allBudgets.find(b => b.id === selectedBudgetId);
    const dueDateStr = dueDate ? format(dueDate, 'yyyy-MM-dd') : (selectedBudget?.delivery_date || null);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      client_id: clientId || null,
      color: !clientId ? (color || null) : null,
      due_date: dueDateStr,
      due_text: dueText || (selectedBudget?.delivery_text || null),
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

  const toggleFavorite = async (projectId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('projects')
        // @ts-ignore - is_favorite is added via migration
        .update({ is_favorite: !currentStatus })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setProjects(projects.map(p => p.id === projectId ? { ...p, is_favorite: !currentStatus } : p));
      toast.success(!currentStatus ? 'Projeto favoritado!' : 'Removido dos favoritos');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Erro ao favoritar projeto');
    }
  };

  const handleEdit = (p: Project) => {
    setEditingId(p.id);
    setName(p.name);
    setClientId(p.client_id || '');
    setColor(p.color || null);
    setDueDate(p.due_date ? new Date(p.due_date + 'T12:00:00') : undefined);
    setDueText(p.due_text || '');
    setProjectDiscount(p.discount || 0);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    // Check if project exists and user has permission by trying to select it first,
    // or by inspecting the returned data from delete().
    const { data: deletedProject, error } = await supabase.from('projects')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Did not return exactly 1 row, meaning 0 rows deleted (RLS blocked)
        toast.error('Você não tem permissão para excluir este projeto.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Now safe to delete related items since project deletion succeeded
    await supabase.from('time_entries').delete().eq('project_id', id);
    await supabase.from('tasks').delete().eq('project_id', id);
    await supabase.from('project_items').delete().eq('project_id', id);
    
    toast.success('Projeto e dados relacionados excluídos!');
    loadProjects();
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
    const { error } = await supabase.from('project_items').delete().eq('id', item.id).select('id').single();
    if (error) {
      if (error.code === 'PGRST116') toast.error('Sem permissão para excluir item.');
      else toast.error(error.message);
    } else loadItems(item.project_id);
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
  const clientColor = (id: string | null) => {
    const client = clients.find(c => c.id === id) as unknown as { color?: string | null };
    return client?.color || null;
  };

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
      .select('id, kanban_columns!inner(board_id)')
      .eq('title', pendingTaskItem.name)
      .eq('project_id', pendingTaskItem.projectId)
      .not('column_id', 'is', null)
      .not('kanban_columns.board_id', 'is', null)
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

  const handleOpenChat = async (project: Project) => {
    if (!user) return;
    try {
      // Check if channel exists
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('project_id', project.id)
        .limit(1)
        .single();

      if (existingChannel) {
        navigate(`/dashboard/chat?channel=${existingChannel.id}`);
        return;
      }

      // Create channel
      const { data: newChannel, error } = await supabase
        .from('channels')
        .insert({
          type: 'project',
          project_id: project.id,
          name: project.name
        })
        .select('id')
        .single();

      if (error || !newChannel) throw error;
      
      // Add myself
      await supabase.from('channel_members').insert({
        channel_id: newChannel.id,
        user_id: user.id,
        role: 'admin'
      });
      
      navigate(`/dashboard/chat?channel=${newChannel.id}`);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error('Erro ao iniciar chat do projeto: ' + e.message);
      }
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    clientName(p.client_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-6 animate-fade-in">
      {/* Header & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">{t.projects}</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Expandable Search w/ Default Label */}
          <div className="relative group flex items-center h-10">
            <Search className="absolute left-3 w-4 h-4 z-10 pointer-events-none transition-all duration-300 text-muted-foreground group-focus-within:text-primary" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "pl-9 pr-8 rounded-full transition-all duration-300 ease-out h-full border bg-background border-border shadow-sm focus-visible:ring-1 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground text-sm font-medium",
                search 
                  ? "w-[180px] sm:w-[250px]" 
                  : "w-[130px] sm:w-[140px] cursor-pointer hover:w-[180px] sm:hover:w-[250px] focus:w-[180px] sm:focus:w-[250px] focus:cursor-text"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <Button
            onClick={() => { resetForm(); setShowForm(true); loadAllBudgets(); }}
            className="gap-2 rounded-full font-semibold shadow-sm shrink-0 h-10 px-4"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t.newProject}</span>
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="max-w-3xl p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 animate-fade-in">
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
                Cliente: <span className="font-medium text-foreground ml-1">{clientName(clientId || null) || 'Sem cliente'}</span>
              </div>
            ) : (
              <ClientSelect value={clientId} onChange={setClientId} />
            )}
          </div>

          {!clientId && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-medium text-muted-foreground pb-1 block">Cor do projeto</label>
              <div className="flex items-center gap-2 flex-wrap pb-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? null : c)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all shrink-0",
                      color === c ? 'border-foreground scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                
                <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded-full shrink-0 border-2 transition-all shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:scale-105 overflow-hidden relative",
                        color && !PROJECT_COLORS.includes(color.toUpperCase()) && !PROJECT_COLORS.includes(color)
                          ? 'border-foreground scale-110' 
                          : 'border-transparent'
                      )}
                      style={(color && !PROJECT_COLORS.includes(color.toUpperCase()) && !PROJECT_COLORS.includes(color)) ? { backgroundColor: color } : {}}
                      title="Cor Personalizada"
                    >
                      {(!color || PROJECT_COLORS.includes(color) || PROJECT_COLORS.includes(color.toUpperCase())) && (
                        <div className="absolute inset-0 bg-[conic-gradient(from_90deg,red,yellow,lime,aqua,blue,magenta,red)]" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-foreground">Cor Personalizada</span>
                        <div className="flex items-center gap-1.5 bg-muted/60 rounded-md px-1.5 py-1 border border-border/50 focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase select-none">Hex</span>
                          <Input 
                            value={color || ''} 
                            onChange={(e) => {
                              let val = e.target.value;
                              if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                              setColor(val);
                            }}
                            placeholder="#000000" 
                            className="w-[60px] h-5 text-xs px-0 py-0 font-mono uppercase border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50" 
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div className="relative w-full rounded-lg overflow-hidden shrink-0 shadow-sm custom-color-picker">
                        <HexColorPicker 
                          color={color || '#000000'} 
                          onChange={setColor}
                          style={{ width: '100%', height: '160px' }}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Due date picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prazo (Data)</label>
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prazo (Texto Livre)</label>
            <Input
              placeholder="Ex: A combinar, 15 dias"
              value={dueText}
              onChange={(e) => setDueText(e.target.value)}
              className="rounded-xl h-10 text-sm"
            />
          </div>
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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground w-full">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">{t.noProjects}</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Crie um projeto para começar a organizar seus trabalhos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 items-stretch">
          {filtered.map(p => {
            const isExpanded = expandedIds.has(p.id);
            const items = projectItems[p.id] || [];
            const total = getProjectTotal(p.id);
            const finalTotal = total * (1 - (p.discount || 0) / 100);
            const color = clientColor(p.client_id) || p.color;
            
            const contrast = color ? getContrastYIQ(color) : 'dark';
            const isLight = contrast === 'light';

            const tColor = `text-foreground transition-colors duration-300 ${color ? (isLight ? 'group-hover:text-white' : 'group-hover:text-slate-900') : ''}`;
            const mColor = `text-muted-foreground transition-colors duration-300 ${color ? (isLight ? 'group-hover:text-white/80' : 'group-hover:text-slate-700') : ''}`;
            const bColor = `text-muted-foreground hover:text-foreground transition-colors duration-300 ${color ? (isLight ? 'group-hover:text-white/80 hover:group-hover:text-white hover:group-hover:bg-white/20' : 'group-hover:text-slate-700 hover:group-hover:text-slate-900 hover:group-hover:bg-slate-900/10') : ''}`;
            
            const badgeBg = `bg-primary/10 text-primary transition-colors duration-300 ${color ? (isLight ? 'group-hover:bg-white/20 group-hover:text-white' : 'group-hover:bg-slate-900/10 group-hover:text-slate-900') : ''}`;
            const badgeBgMuted = `bg-muted text-muted-foreground transition-colors duration-300 ${color ? (isLight ? 'group-hover:bg-white/10 group-hover:text-white/90' : 'group-hover:bg-slate-900/5 group-hover:text-slate-800') : ''}`;
            
            const iconBox = `bg-muted/60 text-muted-foreground transition-colors duration-300 ${color ? (isLight ? 'group-hover:bg-white/20 group-hover:text-white' : 'group-hover:bg-slate-900/10 group-hover:text-slate-900') : 'group-hover:bg-muted group-hover:text-foreground'}`;
            const iconBoxActive = `bg-primary/10 text-primary transition-colors duration-300 ${color ? (isLight ? 'group-hover:bg-white/30 group-hover:text-white' : 'group-hover:bg-slate-900/15 group-hover:text-slate-900') : ''}`;

            return (
              <div
                key={p.id}
                className={cn(
                  "group rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 relative h-full",
                  "bg-card z-0",
                  isExpanded ? "shadow-md ring-1 ring-primary/10" : "hover:shadow-lg hover:-translate-y-1 hover:border-transparent",
                  !color && "hover:border-border/80"
                )}
              >
                {/* Smooth Background Transition */}
                {color && (
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out pointer-events-none -z-10"
                    style={{ backgroundColor: color }}
                  />
                )}
                
                {/* Project header */}
                <div
                  className="flex flex-col p-5 cursor-pointer gap-4 relative flex-1 z-10"
                  onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="min-w-0 flex-1 pt-0.5">
                        {p.client_id && clientName(p.client_id) !== '-' ? (
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5", mColor)}>
                            {clientName(p.client_id)}
                          </p>
                        ) : (
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60", mColor)}>
                            Sem cliente
                          </p>
                        )}
                        <p className={cn("font-bold text-base line-clamp-2 leading-tight pr-2", tColor)}>{p.name}</p>
                        {(items.length > 0 || total > 0) && (
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md", badgeBg)}>
                              {formatCurrency(finalTotal)}
                            </span>
                            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", badgeBgMuted)}>
                              {items.length} {items.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 -mt-1 -mr-2" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("w-8 h-8 rounded-lg", bColor)}
                        onClick={(e) => toggleFavorite(p.id, p.is_favorite || false, e)}
                        title={p.is_favorite ? "Remover dos favoritos" : "Favoritar projeto"}
                      >
                        <Star className="w-4 h-4" fill={p.is_favorite ? "currentColor" : "none"} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg", bColor)}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(p)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar projeto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteConfirmId(p.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir projeto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/80 group-hover:border-black/10 dark:group-hover:border-white/10 shrink-0 transition-colors">
                    <div className={cn("flex items-center gap-2 text-xs", mColor)}>
                      {p.due_text ? (
                        <>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span className="font-medium">Prazo: {p.due_text}</span>
                        </>
                      ) : p.due_date ? (
                        <>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span className="font-medium">Prazo: {format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        </>
                      ) : (
                        <span className="italic opacity-60">Sem prazo definido</span>
                      )}
                    </div>
                    
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isExpanded ? iconBoxActive : iconBox
                    )}>
                      <FolderKanban className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

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
