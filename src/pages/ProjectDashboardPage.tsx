import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Plus, Pencil, Trash2, FolderKanban,
  ListChecks, Link2, FileText, CalendarIcon,
  Clock, Play, Square, MessageCircle, Bell, ExternalLink, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useTimer } from '@/hooks/useTimer';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { getContrastYIQ } from '@/pages/ProjectsPage';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserChecklist } from '@/components/UserChecklist';

const hexToHSL = (hex: string | null) => {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  due_date: string | null;
  discount: number;
  budget_id: string | null;
  color?: string | null;
  due_text?: string | null;
}

interface ProjectItem {
  id: string;
  project_id: string;
  name: string;
  value: number;
  position: number;
}

interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  url: string;
  file_type: string;
  description: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  kanban_columns?: { name: string } | null;
}

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  duration: number | null;
}

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients } = useClients();
  const timer = useTimer();

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemValue, setItemValue] = useState('');

  const [showFileForm, setShowFileForm] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileDescription, setFileDescription] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ProjectItem | null>(null);
  const [showClearNotificationsConfirm, setShowClearNotificationsConfirm] = useState(false);

  // Board Picker states
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [pendingTaskItem, setPendingTaskItem] = useState<{
    name: string;
    value: number;
    projectId: string;
    clientId: string | null;
    dueDate: string | null;
  } | null>(null);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!taskName.trim()) return tasks.slice(0, 8);
    const q = taskName.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 8);
  }, [taskName, tasks]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        descInputRef.current && !descInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadProjectData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      // Fetch Project
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (projError) throw projError;
      console.log("ProjData fetched:", projData);
      setProject(projData);

      // Fetch Items
      const { data: itemsData } = await supabase
        .from('project_items')
        .select('*')
        .eq('project_id', id)
        .order('position');
      setItems(itemsData || []);

      // Fetch Files
      const { data: filesData } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      setFiles((filesData as ProjectFile[]) || []);

      // Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id, 
          title, 
          status,
          kanban_columns(name)
        `)
        .eq('project_id', id);
      setTasks((tasksData as any[]) || []);

      // Fetch Time Entries
      const { data: entriesData } = await supabase
        .from('time_entries')
        .select('id, description, start_time, duration')
        .eq('project_id', id)
        .order('start_time', { ascending: false });
      setEntries(entriesData || []);

      // Fetch Notifications (Task Activity Logs)
      const { data: logsData } = await supabase
        .from('task_activity_logs')
        .select(`
          id,
          action,
          created_at,
          details,
          tasks!inner(id, title, project_id)
        `)
        .eq('tasks.project_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(logsData || []);

    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Erro ao carregar projeto: ' + err.message);
      }
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Reload entries deterministically when the global timer finishes saving to the DB
  useEffect(() => {
    if (timer.lastSavedTime > 0) {
      loadProjectData();
    }
  }, [timer.lastSavedTime, loadProjectData]);

  const clientName = (cid: string | null) => clients.find(c => c.id === cid)?.name || '-';
  const clientColor = (cid: string | null) => {
    const client = clients.find(c => c.id === cid) as unknown as { color?: string | null };
    return client?.color || null;
  };

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const finalTotal = totalValue * (1 - ((project?.discount || 0) / 100));

  const totalTimeSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ITEMS
  const isLinkedToBudget = !!project?.budget_id;
  const resetItemForm = () => {
    setItemName('');
    setItemValue('');
    setEditingItemId(null);
    setShowItemForm(false);
  };

  const handleSaveItem = async () => {
    if (isLinkedToBudget) {
      toast.error('Edite os itens através do orçamento original.');
      resetItemForm();
      return;
    }
    if (!itemName.trim() || !project) return;
    const payload = {
      project_id: project.id,
      name: itemName.trim(),
      value: parseFloat(itemValue) || 0,
      position: items.length,
    };

    if (editingItemId) {
      const { error } = await supabase.from('project_items').update({ name: payload.name, value: payload.value }).eq('id', editingItemId);
      if (error) return toast.error(error.message);
      toast.success('Item atualizado');
    } else {
      const { error } = await supabase.from('project_items').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('Item criado');
    }
    resetItemForm();
    loadProjectData();
  };

  const handleEditItem = (item: ProjectItem) => {
    if (isLinkedToBudget) {
      toast.error('Este projeto está vinculado a um orçamento. Os itens não podem ser editados aqui.');
      return;
    }
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemValue(String(item.value));
    setShowItemForm(true);
  };

  const handleDeleteItem = (item: ProjectItem) => {
    if (isLinkedToBudget) {
      toast.error('Itens vinculados a orçamento não podem ser excluídos aqui.');
      return;
    }
    setItemToDelete(item);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !project) return;
    
    // 1. Delete associated tasks
    const { data: matchedTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', project.id)
      .eq('title', itemToDelete.name);

    if (matchedTasks && matchedTasks.length > 0) {
      const taskIds = matchedTasks.map(t => t.id);
      await supabase.from('tasks').delete().in('id', taskIds);
    }

    // 2. Delete associated time records
    await supabase
      .from('time_entries')
      .delete()
      .eq('project_id', project.id)
      .eq('description', itemToDelete.name);

    // 3. Delete the item itself
    const { error } = await supabase.from('project_items').delete().eq('id', itemToDelete.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Item e vínculos excluídos');
      loadProjectData();
    }
    setItemToDelete(null);
  };

  // BOARDS
  const openBoardPicker = async (item: ProjectItem) => {
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
    loadProjectData();
  };

  // FILES
  const resetFileForm = () => {
    setFileName('');
    setFileUrl('');
    setFileDescription('');
    setEditingFileId(null);
    setShowFileForm(false);
  };

  const handleSaveFile = async () => {
    if (!user || !project || !fileName.trim() || !fileUrl.trim()) return;
    const payload = {
      project_id: project.id,
      user_id: user.id,
      name: fileName.trim(),
      url: fileUrl.trim(),
      file_type: 'file',
      description: fileDescription.trim() || null,
    };
    if (editingFileId) {
      const { error } = await supabase.from('project_files').update(payload).eq('id', editingFileId);
      if (error) return toast.error(error.message);
      toast.success('Link atualizado!');
    } else {
      const { error } = await supabase.from('project_files').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('Link adicionado!');
    }
    resetFileForm();
    loadProjectData();
  };

  const handleEditFile = (f: ProjectFile) => {
    setEditingFileId(f.id);
    setFileName(f.name);
    setFileUrl(f.url);
    setFileDescription(f.description || '');
    setShowFileForm(true);
  };

  const handleDeleteFile = async (f: ProjectFile) => {
    const { error } = await supabase.from('project_files').delete().eq('id', f.id);
    if (error) return toast.error(error.message);
    toast.success('Link removido');
    loadProjectData();
  };

  const handleClearNotifications = () => {
    if (!project) return;
    setShowClearNotificationsConfirm(true);
  };

  const confirmClearNotifications = async () => {
    if (!project) return;
    const { data: projTasks } = await supabase.from('tasks').select('id').eq('project_id', project.id);
    if (projTasks && projTasks.length > 0) {
      const taskIds = projTasks.map(t => t.id);
      const { error } = await supabase.from('task_activity_logs').delete().in('task_id', taskIds);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Notificações limpas');
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
    setShowClearNotificationsConfirm(false);
  };
  
  const isTimerRunningForThis = timer.running && timer.projectId === project?.id;

  const toggleTimer = async () => {
    if (!project) return;
    if (isTimerRunningForThis) {
      await timer.stopTimer(() => {
        toast.success('Tempo salvo!');
        setTimeout(() => loadProjectData(), 500);
      });
    } else {
      if (timer.running) {
        await timer.stopTimer();
      }
      timer.setProjectId(project.id);
      if (project.client_id) timer.setClientId(project.client_id);
      
      const matchedName = taskName.trim() || `Trabalhando em: ${project.name}`;
      timer.setDescription(matchedName);
      
      const matchingTask = tasks.find(t => t.title.toLowerCase() === matchedName.toLowerCase());
      if (matchingTask) {
        timer.setTaskId(matchingTask.id);
      } else {
        timer.setTaskId('');
      }

      timer.startTimer();
      toast.success('Cronômetro iniciado!');
      setTaskName('');
    }
  };

  if (loading && !project) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando projeto...</div>;
  }
  
  if (!project) return null;

  const cColor = clientColor(project.client_id) || project.color;
  const contrast = getContrastYIQ(cColor);
  const cPrimaryHSL = hexToHSL(cColor);
  
  const tColor = cColor ? (contrast === 'light' ? 'text-white' : 'text-slate-900') : 'text-foreground';
  const mColor = cColor ? (contrast === 'light' ? 'text-white/80' : 'text-slate-700') : 'text-muted-foreground';
  const bColor = cColor ? (contrast === 'light' ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/10') : 'text-muted-foreground hover:text-foreground';
  const badgeBg = cColor ? (contrast === 'light' ? 'bg-white/20 text-white border-white/20' : 'bg-slate-900/10 text-slate-900 border-slate-900/10') : 'bg-primary/10 text-primary border-primary/20';
  const badgeBgMuted = cColor ? (contrast === 'light' ? 'bg-white/10 text-white/90 border-white/10' : 'bg-slate-900/5 text-slate-800 border-slate-900/5') : 'bg-muted/50 text-muted-foreground border-border/50';

  return (
    <div 
      className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in pb-20"
      style={cPrimaryHSL ? { '--primary': cPrimaryHSL, '--ring': cPrimaryHSL } as React.CSSProperties : undefined}
    >
      {/* Header */}
      <div 
        className={cn(
          "mb-8 rounded-2xl border overflow-hidden shadow-sm relative isolate transition-colors",
          cColor ? "" : "bg-card border-border"
        )}
        style={cColor ? { backgroundColor: cColor, borderColor: cColor } : {}}
      >
        {/* Decorative Background Icon */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center justify-center">
          <FolderKanban className={cn("w-28 h-28 opacity-25", contrast === 'light' ? 'text-white' : 'text-slate-900')} />
        </div>

        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-start gap-4 sm:gap-6 relative z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/projects')} className={cn("shrink-0 rounded-full -ml-2 sm:ml-0", bColor)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {project.client_id && clientName(project.client_id) !== '-' && (
                <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1.5 border", badgeBg)}>
                  {cColor && <Briefcase className={cn("w-3 h-3", contrast === 'light' ? 'text-white' : 'text-slate-900')} />}
                  {clientName(project.client_id)}
                </span>
              )}
              {(project.due_text || project.due_date) && (
                <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm border", badgeBgMuted)}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {project.due_text 
                    ? project.due_text 
                    : format(new Date(project.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </span>
              )}
              {project.budget_id && (
                <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm cursor-help border", badgeBgMuted)} title={`ID Completo: ${project.budget_id}`}>
                  <FileText className="w-3.5 h-3.5" />
                  Orçamento: {project.budget_id.substring(0, 8)}
                </span>
              )}
            </div>
            
            <h1 className={cn("text-[2.3rem] font-extrabold tracking-tight leading-none", tColor)}>
              {project.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* OVERVIEW / ITEMS */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Itens do Projeto</h3>
              </div>
              {!showItemForm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (isLinkedToBudget) return;
                    setShowItemForm(true);
                  }} 
                  className="text-xs text-muted-foreground hover:text-white hover:bg-primary h-8 px-2 rounded-[8px] gap-1.5"
                  disabled={isLinkedToBudget}
                  title={isLinkedToBudget ? "Edite os itens através do Orçamento original" : "Adicionar Item"}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              )}
            </div>

            {showItemForm && !isLinkedToBudget && (
              <div className="bg-muted/30 border border-border p-4 rounded-xl mb-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nome do item</label>
                    <Input placeholder="Ex: Criação da Home" value={itemName} onChange={e => setItemName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Valor (R$)</label>
                    <Input type="number" placeholder="0,00" value={itemValue} onChange={e => setItemValue(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveItem}>Salvar Item</Button>
                  <Button variant="ghost" onClick={resetItemForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {items.length === 0 && !showItemForm ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                Nenhum item cadastrado.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const itemHasTask = tasks.some(t => t.title === item.name);
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => handleEditItem(item)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border border-border/50 transition-colors group",
                        isLinkedToBudget ? "cursor-default" : "cursor-pointer hover:bg-muted/30"
                      )}
                    >
                      <span className="font-medium text-sm">{item.name}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Button 
                          variant={itemHasTask ? "ghost" : "secondary"}
                          size="sm" 
                          className={cn(
                            "rounded-lg h-8 px-3 text-xs font-semibold gap-1.5 transition-all",
                            itemHasTask 
                              ? "text-muted-foreground/40 opacity-50 cursor-not-allowed bg-transparent" 
                              : "text-primary hover:bg-primary hover:text-primary-foreground bg-primary/10 shadow-sm"
                          )}
                          onClick={(e) => {
                            if (itemHasTask) {
                              e.stopPropagation();
                              return;
                            }
                            openBoardPicker(item);
                          }}
                          disabled={itemHasTask}
                          title={itemHasTask ? "Tarefa já criada" : "Criar Tarefa no Kanban"}
                        >
                          <FolderKanban className="w-3.5 h-3.5" />
                          {itemHasTask ? 'Criada' : 'Criar tarefa'}
                        </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "w-8 h-8 rounded-lg",
                          isLinkedToBudget 
                            ? "text-muted-foreground/30 opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground/30" 
                            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        )}
                        onClick={(e) => {
                          if (isLinkedToBudget) {
                            e.stopPropagation();
                            return;
                          }
                          handleDeleteItem(item);
                        }}
                        disabled={isLinkedToBudget}
                        title={isLinkedToBudget ? "Não é possível excluir item vinculado a orçamento" : "Excluir Item"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* TASKS */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Tarefas Vinculadas</h3>
              </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/kanban')} className="text-xs text-muted-foreground hover:text-white hover:bg-primary h-8 px-2 rounded-[8px] gap-1.5">
                Ir ao painel <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
            {tasks.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl text-sm px-4">
                Nenhuma tarefa vinculada. Crie tarefas no painel Kanban!
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl">
                {tasks.map(t => {
                  const isDone = t.status === 'done' || t.kanban_columns?.name === 'Concluído';
                  const statusLabel = t.kanban_columns?.name ? t.kanban_columns.name : (t.status === 'done' ? 'Concluída' : 'Pendente');
                  
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate('/dashboard/kanban', { state: { taskId: t.id } })}
                      className="w-full py-2.5 px-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", isDone ? 'bg-green-500' : 'bg-primary')} />
                        <span className="font-medium text-sm truncate">{t.title}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase ml-2 shrink-0">
                        {statusLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CRONÔMETRO DO PROJETO */}
          <div className="bg-card border border-border rounded-3xl shadow-sm flex flex-col overflow-visible">
            {/* Top Section */}
            <div className="p-6 sm:p-8 flex flex-col border-b border-border relative z-20">
              {/* Decorative Background */}
              {isTimerRunningForThis && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none rounded-t-3xl" />
              )}
              
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Cronômetro</h3>
              </div>

              <div className="w-full relative z-10 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full flex-1 relative">
                  <Input 
                    ref={descInputRef}
                    placeholder="Qual a tarefa atual?" 
                    value={isTimerRunningForThis ? (timer.description || taskName) : taskName} 
                    onChange={e => {
                      if (isTimerRunningForThis) {
                        timer.setDescription(e.target.value);
                      } else {
                        setTaskName(e.target.value);
                        setShowSuggestions(true);
                      }
                    }}
                    onFocus={() => { if (!isTimerRunningForThis) setShowSuggestions(true); }}
                    className="bg-transparent border-0 border-b border-border rounded-none px-0 py-2 h-12 text-base focus-visible:ring-0 focus-visible:border-primary/50 transition-all font-medium placeholder:text-muted-foreground/50 shadow-none"
                    autoComplete="off"
                  />
                  {!isTimerRunningForThis && showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 top-full mt-2 w-full z-50 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
                    >
                      {!taskName.trim() && (
                        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/30">
                          Tarefas do Projeto
                        </div>
                      )}
                      <div className="max-h-[300px] overflow-y-auto p-1.5">
                        {filteredSuggestions.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); setTaskName(t.title); setShowSuggestions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-muted/60 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FolderKanban className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate block">{t.title}</span>
                              <span className="text-xs font-medium text-muted-foreground truncate block mt-0.5">
                                {t.kanban_columns?.name || (t.status === 'done' ? 'Concluída' : 'Pendente')}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground flex-shrink-0 uppercase">tarefa</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 py-1.5 pr-2">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-wider min-w-[100px] sm:min-w-[120px] text-right pr-2" style={{ fontFeatureSettings: '"tnum"' }}>
                    {isTimerRunningForThis ? formatDuration(timer.elapsed) : '00:00:00'}
                  </span>
                  <Button
                    size="icon"
                    onClick={toggleTimer}
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 shrink-0",
                      isTimerRunningForThis 
                        ? "bg-red-500 hover:bg-red-600 text-white" 
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {isTimerRunningForThis ? (
                      <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-1" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-6 sm:p-8 bg-muted/5 flex flex-col relative z-10 rounded-b-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider">Últimos Registros</h4>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tempo Total:</p>
                  <p className="text-lg font-bold text-foreground" style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatTime(totalTimeSeconds)}
                  </p>
                </div>
              </div>
              {entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs border border-dashed rounded-xl p-4">
                  Nenhum registro de tempo.
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {entries.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border font-medium text-xs shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <span className="text-foreground truncate">{e.description || 'Trabalho no projeto'}</span>
                        <span className="text-muted-foreground opacity-80">
                          {format(new Date(e.start_time), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      <span className="text-primary font-bold whitespace-nowrap bg-primary/10 px-2.5 py-1 rounded-[8px]">{formatTime(e.duration || 0)}</span>
                    </div>
                  ))}
                  {entries.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2 font-semibold hover:text-primary" onClick={() => navigate(`/dashboard/time?project=${project.id}`)}>
                      Ver todos no Timesheet
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* PROJECT NOTIFICATIONS */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Notificações</h3>
              </div>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearNotifications} 
                  className="text-xs text-muted-foreground hover:text-white hover:bg-primary h-8 px-2 rounded-[8px]"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Limpar
                </Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl px-4">
                Nenhuma atualização recente.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="flex flex-col p-3 rounded-xl bg-muted/30 dark:bg-background border border-border">
                    <span className="text-sm font-medium text-foreground">
                      Tarefa &quot;{n.tasks?.title}&quot;
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 font-medium">
                      {n.action === 'created' ? 'foi criada' : 
                       n.action === 'status_changed' ? 'mudou de status' : 
                       n.action === 'column_changed' ? 'mudou de coluna' : 'foi atualizada'} • {format(new Date(n.created_at), "dd/MM 'às' HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FILES */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Arquivos</h3>
              </div>
              {!showFileForm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowFileForm(true)} 
                  className="text-xs text-muted-foreground hover:text-white hover:bg-primary h-8 px-2 rounded-[8px] gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              )}
            </div>

            {showFileForm && (
              <div className="bg-muted/30 border border-border p-4 rounded-xl mb-4 animate-fade-in space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nome</label>
                    <Input placeholder="Ex: Protótipo Figma" value={fileName} onChange={e => setFileName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">URL</label>
                    <Input type="url" placeholder="https://..." value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Descrição (opcional)</label>
                  <Input placeholder="Breve descrição" value={fileDescription} onChange={e => setFileDescription(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveFile}>Salvar Link</Button>
                  <Button variant="ghost" onClick={resetFileForm}>Cancelar</Button>
                </div>
              </div>
            )}

            {files.length === 0 && !showFileForm ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                Nenhum arquivo ou link adicionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {files.map(f => (
                  <div key={f.id} className="p-4 rounded-xl border border-border bg-card flex items-start justify-between group">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:underline line-clamp-1">
                          {f.name}
                        </a>
                        {f.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleEditFile(f)}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={() => handleDeleteFile(f)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <UserChecklist projectId={id} accentColor={cColor} />
        </div>
      </div>

      <Dialog open={showBoardPicker} onOpenChange={setShowBoardPicker}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Tarefa no Kanban</DialogTitle>
            <DialogDescription>
              Selecione o painel Kanban onde a tarefa será criada para o item "{pendingTaskItem?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!creatingBoard ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">Painel Kanban</label>
                <div className="flex flex-col gap-2">
                  {availableBoards.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoardId(b.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left rounded-lg border text-sm transition-colors",
                        selectedBoardId === b.id ? "bg-primary/10 border-primary text-primary font-medium" : "bg-card border-border hover:bg-muted"
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                  <button
                    onClick={() => { setCreatingBoard(true); setSelectedBoardId(null); }}
                    className="w-full px-3 py-2 text-left rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm transition-colors flex items-center gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" /> Criar novo painel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium">Nome do Novo Painel</label>
                <Input
                  autoFocus
                  placeholder="Ex: Tarefas do Projeto"
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => setCreatingBoard(false)} className="w-full text-xs">
                  Voltar para seleção
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBoardPicker(false)}>Cancelar</Button>
            <Button onClick={handleCreateTaskInBoard}>Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir o item "{itemToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Aviso: Se houver tarefas no Kanban ou registros de tempo vinculados a este item, eles também poderão ser excluídos ou afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearNotificationsConfirm} onOpenChange={setShowClearNotificationsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja limpar as notificações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente todo o histórico recente de atividades deste projeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearNotifications} className="bg-destructive hover:bg-destructive/90">
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
