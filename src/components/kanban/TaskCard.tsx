import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckSquare, AlertTriangle, Clock, MoreVertical, Trash2, Share2 } from 'lucide-react';
import { Task } from '@/hooks/useKanban';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Média', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const taskTypeConfig: Record<string, string> = {
  design: '🎨',
  photo: '📸',
  video: '🎬',
  admin: '📋',
  dev: '💻',
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onDelete?: (taskId: string) => void;
  checklistProgress?: { done: number; total: number } | null;
  clientColor?: string | null;
  isSharedByMe?: boolean;
}

interface DeleteImpact {
  timeEntries: number;
  totalSeconds: number;
  comments: number;
  checklists: number;
  projectName: string | null;
}

export const TaskCard = ({ task, onClick, onToggleComplete, onDelete, checklistProgress, clientColor, isSharedByMe = false }: TaskCardProps) => {
  const isCompleted = !!task.completed_at;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed_at;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const fetchDeleteImpact = async () => {
    setLoadingImpact(true);
    const [timeRes, commentsRes, checklistsRes, projectRes] = await Promise.all([
      supabase.from('time_entries').select('duration').eq('task_id', task.id),
      supabase.from('task_comments').select('id').eq('task_id', task.id),
      supabase.from('task_checklists').select('id').eq('task_id', task.id),
      task.project_id
        ? supabase.from('projects').select('name').eq('id', task.project_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const timeEntries = timeRes.data || [];
    const totalSeconds = timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

    setDeleteImpact({
      timeEntries: timeEntries.length,
      totalSeconds,
      comments: (commentsRes.data || []).length,
      checklists: (checklistsRes.data || []).length,
      projectName: projectRes.data?.name || null,
    });
    setLoadingImpact(false);
    setShowDeleteConfirm(true);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          ...(!isOverdue && clientColor ? { borderLeftColor: clientColor, backgroundColor: `${clientColor}15` } : {}),
        }}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={`bg-card border border-border/50 shadow-sm rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border transition-all duration-200 group relative ${
          isDragging ? 'scale-[0.97] shadow-none ring-2 ring-primary/30 bg-muted/60 opacity-80' : ''
        } ${isOverdue ? 'border-l-[3px] border-l-destructive' : clientColor ? 'border-l-[3px]' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => {
                if (onToggleComplete) {
                  onToggleComplete(task.id, !!checked);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0"
            />
            <h4 className={`text-sm font-semibold truncate flex-1 ${
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}>
              {task.title}
            </h4>
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchDeleteImpact();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir tarefa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Labels row */}
        {(task.task_type || isSharedByMe) && (
          <div className="flex items-center gap-1.5 mt-1">
            {task.task_type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/50 border-border/50 gap-1 text-muted-foreground">
                <span className="text-xs mr-0.5">{taskTypeConfig[task.task_type] || '📌'}</span>
                {task.task_type}
              </Badge>
            )}
            {isSharedByMe && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 gap-1 shrink-0">
                    <Share2 className="w-2.5 h-2.5" />
                    Compartilhada
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Você compartilhou esta tarefa</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Bottom stats row matching LeadCard visual */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm', priority.color)}>
              {priority.label}
              {task.complexity > 1 && (
                <span className="ml-0.5">{'⭐'.repeat(Math.min(task.complexity, 5))}</span>
              )}
            </span>
            
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'
              }`}>
                {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(task.due_date), 'dd MMM', { locale: ptBR })}
              </span>
            )}
            
            {checklistProgress && checklistProgress.total > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="w-3.5 h-3.5" />
                {checklistProgress.done}/{checklistProgress.total}
              </span>
            )}
            
            {task.estimated_time && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {task.estimated_time}h
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-6 h-6 hover:z-10 transition-transform hover:scale-110 ml-2">
                {task.profile?.avatar_url && (
                  <AvatarImage src={task.profile.avatar_url} alt={task.profile?.name || 'Usuário'} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/20 text-[10px] font-bold text-primary">
                  {task.profile?.name ? task.profile.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {task.profile?.name && (
              <TooltipContent className="text-xs">
                {task.profile.name}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Tem certeza que deseja excluir "<strong>{task.title}</strong>"? Esta ação não pode ser desfeita.</p>
                {deleteImpact && (
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p className="font-medium text-foreground">Os seguintes dados também serão excluídos:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {deleteImpact.projectName && (
                        <li>Vínculo com o projeto "<strong className="text-foreground">{deleteImpact.projectName}</strong>"</li>
                      )}
                      {deleteImpact.timeEntries > 0 && (
                        <li>
                          <strong className="text-foreground">{deleteImpact.timeEntries}</strong> registro{deleteImpact.timeEntries > 1 ? 's' : ''} de tempo ({formatDuration(deleteImpact.totalSeconds)} registrado{deleteImpact.totalSeconds !== 1 ? 's' : ''})
                        </li>
                      )}
                      {deleteImpact.comments > 0 && (
                        <li>
                          <strong className="text-foreground">{deleteImpact.comments}</strong> comentário{deleteImpact.comments > 1 ? 's' : ''}
                        </li>
                      )}
                      {deleteImpact.checklists > 0 && (
                        <li>
                          <strong className="text-foreground">{deleteImpact.checklists}</strong> checklist{deleteImpact.checklists > 1 ? 's' : ''}
                        </li>
                      )}
                      {!deleteImpact.projectName && deleteImpact.timeEntries === 0 && deleteImpact.comments === 0 && deleteImpact.checklists === 0 && (
                        <li>Nenhum dado adicional vinculado.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(task.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
