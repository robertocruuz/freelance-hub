import { useState, useMemo, useEffect } from 'react';
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
import { Plus, LayoutGrid, List, Search, Filter, CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useKanban, Task } from '@/hooks/useKanban';
import { useClients } from '@/hooks/useClients';
import { KanbanColumnComponent } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { TaskDetailModal } from '@/components/kanban/TaskDetailModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isThisWeek, isThisMonth, isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ViewMode = 'kanban' | 'list';

const KanbanPage = () => {
  const kanban = useKanban();
  const { clients } = useClients();
  const { user } = useAuth();
  const { columns, tasks, loading } = kanban;
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Load projects for filter
  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('id, name').eq('user_id', user.id).then(({ data }) => {
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
      const firstColumn = columns.sort((a, b) => a.position - b.position)[0];
      kanban.addTask(firstColumn.id, title).then((newTask) => {
        if (newTask) {
          kanban.updateTask(newTask.id, {
            estimated_value: value,
            client_id: clientId || null,
            project_id: projectId || null,
            description: `Criado a partir de item de orçamento — Valor: R$ ${value.toFixed(2)}`,
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
  const activeFilterCount = [filterPriority, filterClient, filterProject, filterType].filter(f => f !== 'all').length;

  // Unique task types
  const taskTypes = useMemo(() => {
    const types = new Set(tasks.map(t => t.task_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterClient !== 'all' && t.client_id !== filterClient) return false;
      if (filterProject !== 'all' && t.project_id !== filterProject) return false;
      if (filterType !== 'all' && t.task_type !== filterType) return false;
      return true;
    });
  }, [tasks, search, filterPriority, filterClient, filterProject, filterType]);

  const getColumnTasks = (columnId: string) =>
    filteredTasks
      .filter((t) => t.column_id === columnId)
      .sort((a, b) => a.position - b.position);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative z-10 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus projetos em formato Kanban</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats */}
          <Badge variant="outline" className="gap-1 text-xs">
            <AlertTriangle className="w-3 h-3 text-destructive" /> {overdueTasks.length} atrasadas
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <CalendarDays className="w-3 h-3 text-primary" /> {weekTasks.length} esta semana
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-accent-foreground" /> {completedMonth.length} concluídas no mês
          </Badge>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="pl-9 h-9 text-sm glass-input"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 relative glass-input">
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Filtros</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterClient('all'); setFilterProject('all'); setFilterPriority('all'); setFilterType('all'); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Por Cliente</label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Por Projeto</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Por Prioridade</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Por Tipo</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {taskTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-0.5">
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

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
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
                          description: `Criado a partir de item de projeto — Valor: R$ ${item.value.toFixed(2)}`,
                        });
                      }
                    });
                  }}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onUpdateColumn={(id, name) => kanban.updateColumn(id, { name })}
                  onDeleteColumn={(id) => kanban.deleteColumn(id)}
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
                <TaskCard task={activeTask} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarefa</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prazo</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const col = columns.find((c) => c.id === task.column_id);
                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed_at;
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{task.title}</td>
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
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
    </div>
  );
};

export default KanbanPage;
