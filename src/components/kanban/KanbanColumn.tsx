import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, FolderKanban, ChevronLeft } from 'lucide-react';
import { KanbanColumn as KanbanColumnType, Task } from '@/hooks/useKanban';
import { TaskCard } from './TaskCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectItem {
  id: string;
  name: string;
  value: number;
  project_id: string;
  project_name?: string;
  client_id?: string | null;
  imported?: boolean;
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onAddTask: (columnId: string, title: string) => void;
  onAddTaskFromProject?: (columnId: string, item: ProjectItem) => void;
  onTaskClick: (task: Task) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateColumn: (id: string, name: string) => void;
  onDeleteColumn: (id: string) => void;
  clientColorMap?: Record<string, string>;
}

type AddMode = 'choice' | 'project' | 'project-items';

export const KanbanColumnComponent = ({
  column,
  tasks,
  onAddTask,
  onAddTaskFromProject,
  onTaskClick,
  onToggleComplete,
  onDeleteTask,
  onUpdateColumn,
  onDeleteColumn,
  clientColorMap = {},
}: KanbanColumnProps) => {
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddTask(column.id, newTitle.trim());
    setNewTitle('');
    setAddMode(null);
  };

  const handleRename = () => {
    if (!editName.trim()) return;
    onUpdateColumn(column.id, editName.trim());
    setIsEditing(false);
  };

  const loadProjects = async () => {
    setLoadingItems(true);
    const { data } = await supabase.from('projects').select('id, name').order('name');
    if (data) setProjects(data);
    setLoadingItems(false);
  };

  const loadProjectItems = async (projectId: string) => {
    setLoadingItems(true);
    const [{ data: items }, { data: existingTasks }] = await Promise.all([
      supabase
        .from('project_items')
        .select('id, name, value, project_id, projects(name, client_id)')
        .eq('project_id', projectId)
        .order('name'),
      supabase
        .from('tasks')
        .select('title, project_id')
        .eq('project_id', projectId),
    ]);
    const taskSet = new Set(
      (existingTasks || []).map((t: any) => `${t.title}::${t.project_id}`)
    );
    if (items) {
      setProjectItems(items.map((item: any) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        project_id: item.project_id,
        project_name: item.projects?.name || '',
        client_id: item.projects?.client_id || null,
        imported: taskSet.has(`${item.name}::${item.project_id}`),
      })));
    }
    setLoadingItems(false);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setAddMode('project-items');
    loadProjectItems(projectId);
  };

  const handleSelectProjectItem = (item: ProjectItem) => {
    if (onAddTaskFromProject) {
      onAddTaskFromProject(column.id, item);
    }
    setAddMode(null);
  };

  const openProjectPicker = () => {
    setAddMode('project');
    setSelectedProjectId(null);
    loadProjects();
  };

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-2xl transition-colors snap-start ${
        isOver ? 'bg-primary/5' : 'bg-card/50'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              className="h-7 text-xs font-bold glass-input"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); handleRename(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3
              onClick={() => { setEditName(column.name); setIsEditing(true); }}
              className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer hover:text-primary transition-colors"
              title="Clique para editar"
            >
              {column.name}
            </h3>
            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
              {tasks.length}
            </span>
            {column.wip_limit && tasks.length >= column.wip_limit && (
              <span className="text-[10px] text-destructive font-semibold">WIP!</span>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition opacity-60 hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-none">
            <DropdownMenuItem onClick={() => { setEditName(column.name); setIsEditing(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteColumn(column.id)} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 min-h-[60px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} onToggleComplete={onToggleComplete} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      <div className="px-2 pb-3">
        {addMode === 'choice' && (
          <div className="space-y-1.5">
            <div className="space-y-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Título da tarefa..."
                autoFocus
                className="text-sm glass-input"
              />
              {newTitle.trim() && (
                <Button size="sm" onClick={handleAdd} className="btn-glow text-xs h-7 w-full">
                  Criar tarefa
                </Button>
              )}
            </div>
            <div className="relative flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              onClick={openProjectPicker}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-foreground hover:bg-secondary transition border border-border"
            >
              <FolderKanban className="w-3.5 h-3.5 text-primary" /> A partir de um projeto
            </button>
            <Button size="sm" variant="ghost" onClick={() => { setAddMode(null); setNewTitle(''); }} className="w-full text-xs h-7">
              Cancelar
            </Button>
          </div>
        )}

        {addMode === 'project' && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => setAddMode('choice')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition mb-1"
            >
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Selecione o projeto</p>
            {loadingItems ? (
              <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum projeto encontrado</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition border border-border"
                >
                  <FolderKanban className="w-3 h-3 inline mr-1.5 text-primary" />{p.name}
                </button>
              ))
            )}
            <Button size="sm" variant="ghost" onClick={() => setAddMode(null)} className="w-full text-xs h-7">
              Cancelar
            </Button>
          </div>
        )}

        {addMode === 'project-items' && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => setAddMode('project')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition mb-1"
            >
              <ChevronLeft className="w-3 h-3" /> Projetos
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Selecione o item</p>
            {loadingItems ? (
              <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
            ) : projectItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum item neste projeto</p>
            ) : (
              projectItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => !item.imported && handleSelectProjectItem(item)}
                  disabled={item.imported}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition border ${
                    item.imported
                      ? 'border-border/50 opacity-50 cursor-not-allowed'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`font-medium truncate ${item.imported ? 'text-muted-foreground' : 'text-foreground'}`}>{item.name}</p>
                    {item.imported && (
                      <span className="flex items-center gap-0.5 text-[10px] text-primary shrink-0 ml-2">
                        <Check className="w-3 h-3" /> Importado
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(item.value)}</p>
                </button>
              ))
            )}
            <Button size="sm" variant="ghost" onClick={() => setAddMode(null)} className="w-full text-xs h-7">
              Cancelar
            </Button>
          </div>
        )}

        {addMode === null && (
          <button
            onClick={() => setAddMode('choice')}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar um cartão
          </button>
        )}
      </div>
    </div>
  );
};
