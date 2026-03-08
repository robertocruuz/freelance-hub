import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckSquare, AlertTriangle, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { Task } from '@/hooks/useKanban';
import { format, isPast, isToday } from 'date-fns';
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
}

export const TaskCard = ({ task, onClick, onToggleComplete, onDelete, checklistProgress, clientColor }: TaskCardProps) => {
  const isCompleted = !!task.completed_at;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
        className={`glass-card rounded-xl p-3.5 cursor-pointer hover:shadow-lg transition-all duration-200 group relative ${
          isDragging ? 'opacity-50 scale-95 rotate-2' : ''
        } ${isOverdue ? 'border-l-4 border-l-destructive' : clientColor ? 'border-l-4' : ''}`}
      >
        {/* 3-dot menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir tarefa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Labels row */}
        {task.task_type && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">{taskTypeConfig[task.task_type] || '📌'}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {task.task_type}
            </span>
          </div>
        )}

        {/* Title with checkbox */}
        <div className="flex items-start gap-2 mb-2">
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
          <p className={`text-sm font-semibold leading-snug group-hover:text-primary transition-colors ${
            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.title}
          </p>
        </div>

        {/* Priority badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${priority.color} border-none`}>
            {priority.label}
          </Badge>
          {task.complexity > 1 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {'⭐'.repeat(Math.min(task.complexity, 5))}
            </Badge>
          )}
        </div>

        {/* Checklist progress */}
        {checklistProgress && checklistProgress.total > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex-1 h-1.5 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(checklistProgress.done / checklistProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {checklistProgress.done}/{checklistProgress.total}
            </span>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className={`flex items-center gap-1 text-[10px] font-medium ${
                isOverdue ? 'text-destructive' : isDueToday ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'dd/MM')}
              </span>
            )}
            {task.estimated_time && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {task.estimated_time}h
              </span>
            )}
          </div>

          {/* Avatar placeholder */}
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">U</span>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{task.title}"? Esta ação não pode ser desfeita.
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
