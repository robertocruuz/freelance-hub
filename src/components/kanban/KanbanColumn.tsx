import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, FolderKanban, FileText, ChevronLeft } from 'lucide-react';
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
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onAddTask: (columnId: string, title: string) => void;
  onAddTaskFromProject?: (columnId: string, item: ProjectItem) => void;
  onTaskClick: (task: Task) => void;
  onUpdateColumn: (id: string, name: string) => void;
  onDeleteColumn: (id: string) => void;
}

type AddMode = 'choice' | 'blank' | 'project' | 'project-items';

export const KanbanColumnComponent = ({
  column,
  tasks,
  onAddTask,
  onAddTaskFromProject,
  onTaskClick,
  onUpdateColumn,
  onDeleteColumn,
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

  const loadProjectItems = async () => {
    setLoadingItems(true);
    const { data } = await supabase
      .from('project_items')
      .select('id, name, value, project_id, projects(name, client_id)')
      .order('name');
    if (data) {
      setProjectItems(data.map((item: any) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        project_id: item.project_id,
        project_name: item.projects?.name || '',
        client_id: item.projects?.client_id || null,
      })));
    }
    setLoadingItems(false);
  };

  const handleSelectProjectItem = (item: ProjectItem) => {
    if (onAddTaskFromProject) {
      onAddTaskFromProject(column.id, item);
    }
    setAddMode(null);
  };

  const openProjectPicker = () => {
    setAddMode('project');
    loadProjectItems();
  };

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-2xl transition-colors ${
        isOver ? 'bg-primary/5' : 'bg-card/50'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
            className="h-7 text-xs font-bold glass-input"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
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
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 min-h-[60px] overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      <div className="px-2 pb-3">
        {addMode === 'choice' && (
          <div className="space-y-1.5">
            <button
              onClick={() => setAddMode('blank')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-foreground hover:bg-secondary transition border border-border"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Em branco
            </button>
            <button
              onClick={openProjectPicker}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-foreground hover:bg-secondary transition border border-border"
            >
              <FolderKanban className="w-3.5 h-3.5 text-primary" /> A partir de um projeto
            </button>
            <Button size="sm" variant="ghost" onClick={() => setAddMode(null)} className="w-full text-xs h-7">
              Cancelar
            </Button>
          </div>
        )}

        {addMode === 'blank' && (
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Título da tarefa..."
              autoFocus
              className="text-sm glass-input"
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleAdd} className="btn-glow text-xs h-7 flex-1">
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddMode(null)} className="text-xs h-7">
                Cancelar
              </Button>
            </div>
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
            {loadingItems ? (
              <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
            ) : projectItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum item de projeto encontrado</p>
            ) : (
              projectItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectProjectItem(item)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary transition border border-border"
                >
                  <p className="font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.project_name} · R$ {item.value.toFixed(2)}
                  </p>
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
