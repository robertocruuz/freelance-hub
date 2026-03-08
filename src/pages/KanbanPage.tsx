import { useState, useMemo, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, LayoutGrid, List, Search, SlidersHorizontal, CalendarDays, AlertTriangle, CheckCircle2, X, User, FolderOpen, Flag, Tag, Clock, Gauge, Timer, ArrowUpDown, ChevronDown, ArrowUp, ArrowDown, Kanban, MoreHorizontal, Pencil, Trash2, FolderKanban, Share2 } from 'lucide-react';
import { useKanban, Task, KanbanBoard } from '@/hooks/useKanban';
import { useClients } from '@/hooks/useClients';
import { KanbanColumnComponent } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { TaskDetailModal } from '@/components/kanban/TaskDetailModal';
import { ShareButton } from '@/components/kanban/ShareButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { isThisWeek, isThisMonth, isPast, isSameDay, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ViewMode = 'kanban' | 'list';

const KanbanPage = () => {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const kanban = useKanban(activeBoardId);
  const { clients } = useClients();
  const { user } = useAuth();
  const { columns, tasks, boards, loading } = kanban;
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterClients, setFilterClients] = useState<Set<string>>(new Set());
  const [filterProjects, setFilterProjects] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterDeadlines, setFilterDeadlines] = useState<Set<string>>(new Set());
  const [filterDeadlineDate, setFilterDeadlineDate] = useState<Date | undefined>(undefined);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [filterComplexities, setFilterComplexities] = useState<Set<number>>(new Set());
  const [filterEstimatedTime, setFilterEstimatedTime] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('position');
  const [showFilters, setShowFilters] = useState(false);
  const [listSortField, setListSortField] = useState<string>('title');
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('asc');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);

  // Board management state
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<KanbanBoard | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardClientId, setBoardClientId] = useState<string | null>(null);
  const [boardProjectId, setBoardProjectId] = useState<string | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<KanbanBoard | null>(null);

  // Auto-select first board
  useEffect(() => {
    if (!loading && boards.length > 0 && !activeBoardId) {
      setActiveBoardId(boards[0].id);
    }
  }, [loading, boards, activeBoardId]);

  // Load projects for filter
  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('id, name, client_id').eq('user_id', user.id).then(({ data }) => {
      if (data) setProjects(data);
    });
  }, [user]);

  // Create task from budget item
  useEffect(() => {
    const fromBudget = searchParams.get('from_budget');
    if (fromBudget && columns.length > 0) {
      const title = searchParams.get('title') || 'Nova tarefa';
      const value = parseFloat(searchParams.get('value') || '0');
      const clientId = searchParams.get('client') || undefined;
      const projectId = searchParams.get('project') || undefined;
      const dueDate = searchParams.get('due_date') || undefined;
      const firstColumn = columns.sort((a, b) => a.position - b.position)[0];
      kanban.addTask(firstColumn.id, title).then((newTask) => {
        if (newTask) {
          kanban.updateTask(newTask.id, {
            estimated_value: value,
            client_id: clientId || null,
            project_id: projectId || null,
            due_date: dueDate || null,
            description: `Criado a partir de item de orçamento — Valor: ${formatCurrency(value)}`,
          });
        }
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Stats
  const overdueTasks = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !t.completed_at);
  const weekTasks = tasks.filter((t) => t.due_date && isThisWeek(new Date(t.due_date)));
  const completedMonth = tasks.filter((t) => t.completed_at && isThisMonth(new Date(t.completed_at)));

  // Filter tasks
  const toggleFilter = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const activeFilterCount = filterPriorities.size + filterClients.size + filterProjects.size + filterTypes.size + filterDeadlines.size + (filterDeadlineDate ? 1 : 0) + filterComplexities.size + filterEstimatedTime.size;

  const clientColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { if ((c as any).color) map[c.id] = (c as any).color; });
    return map;
  }, [clients]);

  // Unique task types
  const taskTypes = useMemo(() => {
    const types = new Set(tasks.map(t => t.task_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [tasks]);

  // Deadline filter helper
  const matchesDeadline = (task: Task): boolean => {
    // Date-specific filter (AND with chip filters)
    if (filterDeadlineDate && (!task.due_date || !isSameDay(new Date(task.due_date), filterDeadlineDate))) {
      return false;
    }
    // Chip filters (OR between them)
    if (filterDeadlines.size === 0) return true;
    const hasNoDueDate = !task.due_date;
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed_at;
    const isDueThisWeek = task.due_date && isThisWeek(new Date(task.due_date)) && !task.completed_at;
    const isDueThisMonth = task.due_date && isThisMonth(new Date(task.due_date)) && !task.completed_at;

    if (filterDeadlines.has('today') && task.due_date && isToday(new Date(task.due_date)) && !task.completed_at) return true;
    if (filterDeadlines.has('overdue') && isOverdue) return true;
    if (filterDeadlines.has('this_week') && isDueThisWeek) return true;
    if (filterDeadlines.has('this_month') && isDueThisMonth) return true;
    if (filterDeadlines.has('no_deadline') && hasNoDueDate) return true;
    return false;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriorities.size > 0 && !filterPriorities.has(t.priority)) return false;
      if (filterClients.size > 0 && (!t.client_id || !filterClients.has(t.client_id))) return false;
      if (filterProjects.size > 0 && (!t.project_id || !filterProjects.has(t.project_id))) return false;
      if (filterTypes.size > 0 && (!t.task_type || !filterTypes.has(t.task_type))) return false;
      if (!matchesDeadline(t)) return false;
      if (filterComplexities.size > 0 && !filterComplexities.has(t.complexity)) return false;
      if (filterEstimatedTime.size > 0) {
        const hours = t.estimated_time ? t.estimated_time / 60 : 0;
        let matched = false;
        if (filterEstimatedTime.has('none') && !t.estimated_time) matched = true;
        if (filterEstimatedTime.has('short') && hours > 0 && hours <= 2) matched = true;
        if (filterEstimatedTime.has('medium') && hours > 2 && hours <= 8) matched = true;
        if (filterEstimatedTime.has('long') && hours > 8) matched = true;
        if (!matched) return false;
      }
      return true;
    });
  }, [tasks, search, filterPriorities, filterClients, filterProjects, filterTypes, filterDeadlines, filterDeadlineDate, filterComplexities, filterEstimatedTime]);

  const sortTasks = (a: Task, b: Task) => {
    switch (sortBy) {
      case 'value_desc': return (b.estimated_value || 0) - (a.estimated_value || 0);
      case 'value_asc': return (a.estimated_value || 0) - (b.estimated_value || 0);
      case 'complexity_desc': return (b.complexity || 0) - (a.complexity || 0);
      case 'complexity_asc': return (a.complexity || 0) - (b.complexity || 0);
      case 'due_date': {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      default: return a.position - b.position;
    }
  };

  const getColumnTasks = (columnId: string) =>
    filteredTasks
      .filter((t) => t.column_id === columnId)
      .sort(sortTasks);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handled in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      const colTasks = getColumnTasks(targetColumn.id);
      kanban.moveTask(taskId, targetColumn.id, colTasks.length);
      kanban.logActivity(taskId, 'moved_to_column', { column: targetColumn.name });
      return;
    }

    // Dropped on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.column_id) {
      kanban.moveTask(taskId, overTask.column_id, overTask.position);
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    kanban.addColumn(newColumnName.trim());
    setNewColumnName('');
    setShowAddColumn(false);
  };

  const handleSaveBoard = async () => {
    if (!boardName.trim()) return;
    if (editingBoard) {
      await kanban.updateBoard(editingBoard.id, { name: boardName.trim(), client_id: boardClientId, project_id: boardProjectId });
    } else {
      const newBoard = await kanban.addBoard(boardName.trim(), boardClientId, boardProjectId);
      if (newBoard) setActiveBoardId(newBoard.id);
    }
    setShowBoardDialog(false);
    setBoardName('');
    setBoardClientId(null);
    setBoardProjectId(null);
    setEditingBoard(null);
  };

  const openEditBoard = (board: KanbanBoard) => {
    setEditingBoard(board);
    setBoardName(board.name);
    setBoardClientId(board.client_id);
    setBoardProjectId(board.project_id);
    setShowBoardDialog(true);
  };

  const handleDeleteBoard = async () => {
    if (!deletingBoard) return;
    const wasActive = activeBoardId === deletingBoard.id;
    await kanban.deleteBoard(deletingBoard.id);
    setDeletingBoard(null);
    if (wasActive) {
      const remaining = boards.filter(b => b.id !== deletingBoard.id);
      setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const getBoardSubtitle = (board: KanbanBoard) => {
    if (board.project_id) {
      const project = projects.find(p => p.id === board.project_id);
      return project ? `📂 ${project.name}` : '';
    }
    if (board.client_id) {
      const client = clients.find(c => c.id === board.client_id);
      return client ? `👤 ${client.name}` : '';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative z-10 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Tarefas</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Gerencie seus projetos em formato Kanban</p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
            <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-destructive/10 border border-destructive/20 shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive" />
              </div>
              <div>
                <p className="text-base md:text-lg font-bold text-destructive leading-none">{overdueTasks.length}</p>
                <p className="text-[9px] md:text-[10px] text-destructive/70 font-medium">Atrasadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              </div>
              <div>
                <p className="text-base md:text-lg font-bold text-primary leading-none">{weekTasks.length}</p>
                <p className="text-[9px] md:text-[10px] text-primary/70 font-medium">Esta semana</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-accent/50 border border-accent shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-base md:text-lg font-bold text-foreground leading-none">{completedMonth.length}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium">No mês</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board selector */}
      <div className="flex items-center gap-2 mb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
              <Kanban className="w-3.5 h-3.5" />
              {boards.find(b => b.id === activeBoardId)?.name || 'Selecionar painel'}
              {activeBoardId && getBoardSubtitle(boards.find(b => b.id === activeBoardId)!) && (
                <span className="text-[10px] opacity-70">{getBoardSubtitle(boards.find(b => b.id === activeBoardId)!)}</span>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {boards.map((board) => (
              <DropdownMenuItem
                key={board.id}
                onClick={() => setActiveBoardId(board.id)}
                className={`gap-2 ${activeBoardId === board.id ? 'bg-primary/10 text-primary' : ''}`}
              >
                <Kanban className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">{board.name}</span>
                  {getBoardSubtitle(board) && (
                    <span className="text-[10px] opacity-70 ml-1">{getBoardSubtitle(board)}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => {
                setEditingBoard(null);
                setBoardName('');
                setBoardClientId(null);
                setBoardProjectId(null);
                setShowBoardDialog(true);
              }}
              className="gap-2 text-muted-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">Novo painel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeBoardId && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => openEditBoard(boards.find(b => b.id === activeBoardId)!)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeletingBoard(boards.find(b => b.id === activeBoardId)!)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* No board selected */}
      {!activeBoardId && boards.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Kanban className="w-10 h-10 opacity-30" />
          <p className="text-sm">Crie seu primeiro painel Kanban para começar</p>
          <Button
            size="sm"
            onClick={() => {
              setEditingBoard(null);
              setBoardName('');
              setBoardClientId(null);
              setBoardProjectId(null);
              setShowBoardDialog(true);
            }}
            className="btn-glow"
          >
            <Plus className="w-4 h-4 mr-1" /> Criar painel
          </Button>
        </div>
      )}

      {activeBoardId && (<>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="pl-9 pr-8 h-9 text-sm glass-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-9 gap-1.5 text-xs ${showFilters || activeFilterCount > 0 ? 'btn-glow' : 'glass-input'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        <ShareButton resourceType="board" resourceId={activeBoardId} />

        {/* Active filter pills inline */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(filterPriorities).map(p => (
              <Badge key={p} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterPriorities, setFilterPriorities, p)}>
                {p === 'urgent' ? 'Urgente' : p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {Array.from(filterClients).map(id => (
              <Badge key={id} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterClients, setFilterClients, id)}>
                {clients.find(c => c.id === id)?.name || 'Cliente'}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {Array.from(filterProjects).map(id => (
              <Badge key={id} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterProjects, setFilterProjects, id)}>
                {projects.find(p => p.id === id)?.name || 'Projeto'}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {Array.from(filterTypes).map(type => (
              <Badge key={type} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterTypes, setFilterTypes, type)}>
                {type}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {Array.from(filterDeadlines).map(d => {
              const labels: Record<string, string> = { overdue: 'Atrasadas', today: 'Hoje', this_week: 'Esta semana', this_month: 'Este mês', no_deadline: 'Sem prazo' };
              return (
                <Badge key={d} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterDeadlines, setFilterDeadlines, d)}>
                  {labels[d] || d}
                  <X className="w-3 h-3" />
                </Badge>
              );
            })}
            {filterDeadlineDate && (
              <Badge variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => setFilterDeadlineDate(undefined)}>
                {format(filterDeadlineDate, "dd/MM/yyyy")}
                <X className="w-3 h-3" />
              </Badge>
            )}
            {Array.from(filterComplexities).map(c => (
              <Badge key={`c-${c}`} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => setFilterComplexities(prev => { const n = new Set(prev); n.delete(c); return n; })}>
                Complexidade {c}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {Array.from(filterEstimatedTime).map(t => {
              const labels: Record<string, string> = { none: 'Sem estimativa', short: '≤ 2h', medium: '2h–8h', long: '> 8h' };
              return (
                <Badge key={`et-${t}`} variant="secondary" className="gap-1 text-[10px] pl-2 pr-1 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => toggleFilter(filterEstimatedTime, setFilterEstimatedTime, t)}>
                  {labels[t] || t}
                  <X className="w-3 h-3" />
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-0.5 ml-auto">
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-lg transition ${view === 'kanban' ? 'bg-card shadow-sm' : 'hover:bg-card/50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-lg transition ${view === 'list' ? 'bg-card shadow-sm' : 'hover:bg-card/50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showFilters ? 'max-h-[600px] opacity-100 mb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Filtros e ordenação</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {filteredTasks.length} de {tasks.length} tarefas
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterClients(new Set()); setFilterProjects(new Set()); setFilterPriorities(new Set()); setFilterTypes(new Set()); setFilterDeadlines(new Set()); setFilterDeadlineDate(undefined); setShowDeadlineCalendar(false); setFilterComplexities(new Set()); setFilterEstimatedTime(new Set()); setSortBy('position'); }}
                className="text-[11px] text-primary hover:text-primary/80 font-medium transition"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Flag className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Prioridade</span>
                {filterPriorities.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterPriorities.size}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800' },
                  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
                  { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
                  { value: 'low', label: 'Baixa', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => toggleFilter(filterPriorities, setFilterPriorities, p.value)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterPriorities.has(p.value)
                        ? `${p.color} shadow-sm ring-1 ring-current/20`
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Cliente</span>
                {filterClients.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterClients.size}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleFilter(filterClients, setFilterClients, c.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterClients.has(c.id)
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {clients.length === 0 && <span className="text-[11px] text-muted-foreground">Nenhum cliente</span>}
              </div>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Projeto</span>
                {filterProjects.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterProjects.size}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleFilter(filterProjects, setFilterProjects, p.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterProjects.has(p.id)
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                {projects.length === 0 && <span className="text-[11px] text-muted-foreground">Nenhum projeto</span>}
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Prazo</span>
                {(filterDeadlines.size > 0 || filterDeadlineDate) && <span className="text-[10px] text-primary ml-auto">{filterDeadlines.size + (filterDeadlineDate ? 1 : 0)}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'overdue', label: 'Atrasadas', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800' },
                  { value: 'today', label: 'Hoje', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                  { value: 'this_week', label: 'Semana', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                  { value: 'this_month', label: 'Mês', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
                  { value: 'no_deadline', label: 'Sem prazo', color: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => toggleFilter(filterDeadlines, setFilterDeadlines, d.value)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterDeadlines.has(d.value)
                        ? `${d.color} shadow-sm ring-1 ring-current/20`
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <Popover open={showDeadlineCalendar} onOpenChange={setShowDeadlineCalendar}>
                <div className="flex items-center gap-1">
                  <PopoverTrigger asChild>
                    <button
                      className={`px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium ${
                        filterDeadlineDate
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                          : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {filterDeadlineDate ? format(filterDeadlineDate, "dd/MM/yyyy") : 'Data'}
                    </button>
                  </PopoverTrigger>
                  {filterDeadlineDate && (
                    <X className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => { setFilterDeadlineDate(undefined); setShowDeadlineCalendar(false); }} />
                  )}
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDeadlineDate}
                    onSelect={(date) => { setFilterDeadlineDate(date); setShowDeadlineCalendar(false); }}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Type */}
            {taskTypes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Tipo</span>
                  {filterTypes.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterTypes.size}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {taskTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleFilter(filterTypes, setFilterTypes, type)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                        filterTypes.has(type)
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                          : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Complexity */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Complexidade</span>
                {filterComplexities.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterComplexities.size}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterComplexities(prev => { const next = new Set(prev); if (next.has(c)) next.delete(c); else next.add(c); return next; })}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterComplexities.has(c)
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Tempo estimado</span>
                {filterEstimatedTime.size > 0 && <span className="text-[10px] text-primary ml-auto">{filterEstimatedTime.size}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'none', label: 'Sem estimativa', color: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
                  { value: 'short', label: '≤ 2h', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800' },
                  { value: 'medium', label: '2h–8h', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                  { value: 'long', label: '> 8h', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => toggleFilter(filterEstimatedTime, setFilterEstimatedTime, t.value)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      filterEstimatedTime.has(t.value)
                        ? `${t.color} shadow-sm ring-1 ring-current/20`
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Ordenar por</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'position', label: 'Posição' },
                  { value: 'value_desc', label: '↑ Valor' },
                  { value: 'value_asc', label: '↓ Valor' },
                  { value: 'complexity_desc', label: '↑ Complexa' },
                  { value: 'complexity_asc', label: '↓ Complexa' },
                  { value: 'due_date', label: 'Prazo' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortBy(s.value)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      sortBy === s.value
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 md:gap-4 overflow-x-auto overflow-y-auto pb-4 flex-1 scrollbar-thin scroll-smooth snap-x snap-mandatory md:snap-none items-start">
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((col) => (
                <KanbanColumnComponent
                  key={col.id}
                  column={col}
                  tasks={getColumnTasks(col.id)}
                  onAddTask={(colId, title) => kanban.addTask(colId, title)}
                  onAddTaskFromProject={(colId, item) => {
                    kanban.addTask(colId, item.name).then((newTask) => {
                      if (newTask) {
                        kanban.updateTask(newTask.id, {
                          estimated_value: item.value,
                          project_id: item.project_id,
                          client_id: item.client_id || null,
                          description: `Criado a partir de item de projeto — Valor: ${formatCurrency(item.value)}`,
                        });
                      }
                    });
                  }}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onToggleComplete={(taskId, completed) => {
                    kanban.updateTask(taskId, {
                      completed_at: completed ? new Date().toISOString() : null,
                    });
                  }}
                  onDeleteTask={(taskId) => kanban.deleteTask(taskId)}
                  onUpdateColumn={(id, name) => kanban.updateColumn(id, { name })}
                  onDeleteColumn={(id) => kanban.deleteColumn(id)}
                  clientColorMap={clientColorMap}
                />
              ))}
            </SortableContext>

            {/* Add column */}
            <div className="flex-shrink-0 w-72">
              {showAddColumn ? (
                <div className="bg-card/50 rounded-2xl p-3 space-y-2">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                    placeholder="Nome da coluna..."
                    autoFocus
                    className="text-sm glass-input"
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={handleAddColumn} className="btn-glow text-xs h-7 flex-1">Criar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddColumn(false)} className="text-xs h-7">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-sm text-muted-foreground hover:bg-card/50 hover:text-foreground transition border border-dashed border-border"
                >
                  <Plus className="w-4 h-4" /> Adicionar outra lista
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="w-72 opacity-90 rotate-3">
                <TaskCard task={activeTask} onClick={() => {}} clientColor={activeTask.client_id ? clientColorMap[activeTask.client_id] || null : null} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="glass-card rounded-2xl overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: 'title', label: 'Tarefa' },
                  { key: 'client', label: 'Cliente' },
                  { key: 'project', label: 'Projeto' },
                  { key: 'status', label: 'Status' },
                  { key: 'priority', label: 'Prioridade' },
                  { key: 'due_date', label: 'Prazo' },
                  { key: 'task_type', label: 'Tipo' },
                  { key: 'estimated_value', label: 'Valor Est.' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => {
                      if (listSortField === col.key) {
                        setListSortDir(listSortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setListSortField(col.key);
                        setListSortDir('asc');
                      }
                    }}
                    className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {listSortField === col.key ? (
                        listSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filteredTasks].sort((a, b) => {
                const dir = listSortDir === 'asc' ? 1 : -1;
                const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                const getClientName = (t: Task) => clients.find(c => c.id === t.client_id)?.name || '';
                const getProjectName = (t: Task) => projects.find(p => p.id === t.project_id)?.name || '';
                switch (listSortField) {
                  case 'title': return dir * a.title.localeCompare(b.title);
                  case 'client': return dir * getClientName(a).localeCompare(getClientName(b));
                  case 'project': return dir * getProjectName(a).localeCompare(getProjectName(b));
                  case 'status': {
                    const colA = columns.find(c => c.id === a.column_id)?.name || '';
                    const colB = columns.find(c => c.id === b.column_id)?.name || '';
                    return dir * colA.localeCompare(colB);
                  }
                  case 'priority': return dir * ((priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
                  case 'due_date': {
                    if (!a.due_date && !b.due_date) return 0;
                    if (!a.due_date) return dir;
                    if (!b.due_date) return -dir;
                    return dir * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                  }
                  case 'task_type': return dir * (a.task_type || '').localeCompare(b.task_type || '');
                  case 'estimated_value': return dir * ((a.estimated_value || 0) - (b.estimated_value || 0));
                  default: return 0;
                }
              }).map((task) => {
                const col = columns.find((c) => c.id === task.column_id);
                const client = clients.find((c) => c.id === task.client_id);
                const project = projects.find((p) => p.id === task.project_id);
                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed_at;
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition"
                    style={(client as any)?.color ? { borderLeft: `3px solid ${(client as any).color}` } : undefined}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!task.completed_at}
                          onCheckedChange={(checked) => {
                            kanban.updateTask(task.id, {
                              completed_at: checked ? new Date().toISOString() : null,
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`text-sm font-medium ${task.completed_at ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{client?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{project?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{col?.name || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{task.priority}</Badge>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {task.due_date || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{task.task_type || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {task.estimated_value ? formatCurrency(Number(task.estimated_value)) : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          columns={columns}
          onClose={() => setSelectedTask(null)}
          onUpdate={(id, updates) => {
            kanban.updateTask(id, updates);
            setSelectedTask((prev) => prev ? { ...prev, ...updates } : null);
          }}
          onDelete={(id) => kanban.deleteTask(id)}
          kanban={kanban}
        />
      )}
      </>)}

      {/* Board create/edit dialog */}
      <Dialog open={showBoardDialog} onOpenChange={setShowBoardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBoard ? 'Editar painel' : 'Novo painel Kanban'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Nome do painel</Label>
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Ex: Marketing, Projeto X..."
                autoFocus
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Atrelar a cliente (opcional)</Label>
              <Select value={boardClientId || 'none'} onValueChange={(v) => {
                const clientId = v === 'none' ? null : v;
                setBoardClientId(clientId);
                setBoardProjectId(null);
                if (clientId && !boardName.trim()) {
                  const client = clients.find(c => c.id === clientId);
                  if (client) setBoardName(client.name);
                }
                if (!clientId && !editingBoard) setBoardName('');
              }}>
                <SelectTrigger className="glass-input"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (livre)</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {boardClientId && (
              <div className="space-y-2">
                <Label className="text-xs">Atrelar a projeto (opcional)</Label>
                <Select value={boardProjectId || 'none'} onValueChange={(v) => {
                  const projectId = v === 'none' ? null : v;
                  setBoardProjectId(projectId);
                  if (projectId) {
                    const project = projects.find(p => p.id === projectId);
                    if (project) setBoardName(project.name);
                  } else if (boardClientId) {
                    const client = clients.find(c => c.id === boardClientId);
                    if (client) setBoardName(client.name);
                  }
                }}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.filter(p => p.client_id === boardClientId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {projects.filter(p => p.client_id === boardClientId).length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Nenhum projeto encontrado para este cliente.</p>
                )}
              </div>
            )}
          </div>
          {editingBoard && (
            <div className="pt-2">
              <Label className="text-xs mb-2 block">Compartilhamento</Label>
              <ShareButton resourceType="board" resourceId={editingBoard.id} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBoardDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveBoard} disabled={!boardName.trim()} className="btn-glow">
              {editingBoard ? 'Salvar' : 'Criar painel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete board confirmation */}
      <AlertDialog open={!!deletingBoard} onOpenChange={(open) => !open && setDeletingBoard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir painel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o painel "{deletingBoard?.name}"? Todas as colunas e tarefas deste painel serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KanbanPage;
