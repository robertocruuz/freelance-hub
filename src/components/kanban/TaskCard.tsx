import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckSquare, MessageSquare, Paperclip, AlertTriangle, Clock } from 'lucide-react';
import { Task } from '@/hooks/useKanban';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

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
  checklistProgress?: { done: number; total: number } | null;
}

export const TaskCard = ({ task, onClick, checklistProgress }: TaskCardProps) => {
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
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed_at;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`glass-card rounded-xl p-3.5 cursor-pointer hover:shadow-lg transition-all duration-200 group ${
        isDragging ? 'opacity-50 scale-95 rotate-2' : ''
      } ${isOverdue ? 'border-l-4 border-l-destructive' : ''}`}
    >
      {/* Labels row */}
      {task.task_type && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs">{taskTypeConfig[task.task_type] || '📌'}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {task.task_type}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </p>

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
  );
};
