import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShareButton } from '@/components/kanban/ShareButton';
import { X, Calendar, Clock, Tag, CheckSquare, MessageSquare, Activity, Plus, Trash2, ChevronDown, Play, Receipt, FileText, Timer, FolderKanban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskChecklist, TaskComment, TaskActivityLog, useKanban, KanbanColumn } from '@/hooks/useKanban';
import { useClients, Client } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskDetailModalProps {
  task: Task;
  columns: KanbanColumn[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  kanban: ReturnType<typeof useKanban>;
}

const priorities = [
  { value: 'low', label: 'Baixa', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Média', color: 'bg-amber-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

const taskTypes = [
  { value: 'design', label: '🎨 Design' },
  { value: 'photo', label: '📸 Foto' },
  { value: 'video', label: '🎬 Vídeo' },
  { value: 'admin', label: '📋 Administrativo' },
  { value: 'dev', label: '💻 Desenvolvimento' },
];

export const TaskDetailModal = ({ task, columns, onClose, onUpdate, onDelete, kanban }: TaskDetailModalProps) => {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { user } = useAuth();
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; avatar_url?: string }>>({});
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [totalTrackedSeconds, setTotalTrackedSeconds] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{
    timeEntries: number; totalSeconds: number; comments: number; checklists: number; projectName: string | null;
  } | null>(null);

  const formatImpactDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  const fetchDeleteImpact = useCallback(async () => {
    const [timeRes, commentsRes, checklistsRes, projectRes] = await Promise.all([
      supabase.from('time_entries').select('duration').eq('task_id', task.id),
      supabase.from('task_comments').select('id').eq('task_id', task.id),
      supabase.from('task_checklists').select('id').eq('task_id', task.id),
      task.project_id
        ? supabase.from('projects').select('name').eq('id', task.project_id).single()
        : Promise.resolve({ data: null }),
    ]);
    const timeEntries = timeRes.data || [];
    const totalSec = timeEntries.reduce((acc: number, e: any) => acc + (e.duration || 0), 0);
    setDeleteImpact({
      timeEntries: timeEntries.length, totalSeconds: totalSec,
      comments: (commentsRes.data || []).length, checklists: (checklistsRes.data || []).length,
      projectName: projectRes.data?.name || null,
    });
    setShowDeleteConfirm(true);
  }, [task.id, task.project_id]);

  useEffect(() => {
    loadDetails();
    loadTrackedTime();
    loadProjects();

    // Subscribe to realtime changes for task details
    const channel = supabase.channel(`task_details_${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, () => {
        loadDetails();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_activity_logs', filter: `task_id=eq.${task.id}` }, () => {
        loadDetails();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklists', filter: `task_id=eq.${task.id}` }, () => {
        loadDetails();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklist_items' }, () => {
        // For checklist_items we can't easily filter by task_id in the subscription 
        // without an extra column, so we refresh on any item change (could be optimized)
        loadDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name, client_id').order('name');
    if (data) setProjects(data);
  };

  const loadTrackedTime = async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('duration, start_time, end_time')
      .eq('task_id', task.id);
    if (data) {
      const total = data.reduce((acc, entry) => {
        if (entry.duration) return acc + entry.duration;
        if (entry.start_time && entry.end_time) {
          return acc + Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000);
        }
        return acc;
      }, 0);
      setTotalTrackedSeconds(total);
    }
  };

  const formatTrackedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const loadDetails = async () => {
    const [cl, cm, al] = await Promise.all([
      kanban.getChecklists(task.id),
      kanban.getComments(task.id),
      kanban.getActivityLogs(task.id),
    ]);
    setChecklists(cl);
    setComments(cm);
    setActivityLogs(al);

    // Fetch profiles for users in comments and activity logs
    const userIds = new Set<string>();
    cm.forEach(c => userIds.add(c.user_id));
    al.forEach(l => userIds.add(l.user_id));
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', Array.from(userIds));
      if (profiles) {
        const map: Record<string, { name: string; avatar_url?: string }> = {};
        profiles.forEach(p => {
          map[p.user_id] = { name: p.name || 'Alguém', avatar_url: p.avatar_url };
        });
        setUserProfiles(map);
      }
    }
  };

  const saveTitle = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
      kanban.logActivity(task.id, 'title_changed', { from: task.title, to: title.trim() });
    }
  };

  const saveDescription = () => {
    if (description !== task.description) {
      onUpdate(task.id, { description });
      kanban.logActivity(task.id, 'description_changed', {});
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    await kanban.addChecklist(task.id, newChecklistTitle.trim());
    setNewChecklistTitle('');
    loadDetails();
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const t = newItemTitles[checklistId];
    if (!t?.trim()) return;
    await kanban.addChecklistItem(checklistId, t.trim());
    setNewItemTitles((prev) => ({ ...prev, [checklistId]: '' }));
    loadDetails();
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    await kanban.toggleChecklistItem(itemId, checked);
    loadDetails();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await kanban.addComment(task.id, newComment.trim());
    setNewComment('');
    loadDetails();
  };

  const getChecklistProgress = (cl: TaskChecklist) => {
    if (!cl.items.length) return 0;
    return Math.round((cl.items.filter((i) => i.is_completed).length / cl.items.length) * 100);
  };

  const totalChecklistProgress = () => {
    const allItems = checklists.flatMap((c) => c.items);
    if (!allItems.length) return null;
    const done = allItems.filter((i) => i.is_completed).length;
    return { done, total: allItems.length, pct: Math.round((done / allItems.length) * 100) };
  };

  const progress = totalChecklistProgress();

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl h-full bg-card border-l border-border overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-start justify-between">
          <div className="flex-1 mr-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="text-xl font-bold bg-transparent border-none outline-none w-full text-foreground"
            />
            <div className="flex items-center gap-2 mt-2">
              <Select value={task.column_id || ''} onValueChange={(v) => onUpdate(task.id, { column_id: v })}>
                <SelectTrigger className="h-7 text-xs w-auto glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={task.priority} onValueChange={(v) => {
                onUpdate(task.id, { priority: v });
                kanban.logActivity(task.id, 'priority_changed', { from: task.priority, to: v });
              }}>
                <SelectTrigger className="h-7 text-xs w-auto glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.color}`} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ShareButton resourceType="task" resourceId={task.id} compact />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cliente</label>
              <Select value={task.client_id || 'none'} onValueChange={(v) => onUpdate(task.id, { client_id: v === 'none' ? null : v })}>
                <SelectTrigger className="h-9 text-sm glass-input"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Projeto</label>
              <Select value={task.project_id || 'none'} onValueChange={(v) => {
                const projectId = v === 'none' ? null : v;
                const project = projects.find(p => p.id === v);
                const updates: Partial<Task> = { project_id: projectId };
                if (projectId === null) {
                  updates.client_id = null;
                } else if (project?.client_id) {
                  updates.client_id = project.client_id;
                }
                onUpdate(task.id, updates);
              }}>
                <SelectTrigger className="h-9 text-sm glass-input"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Tipo</label>
              <Select value={task.task_type || 'none'} onValueChange={(v) => onUpdate(task.id, { task_type: v === 'none' ? null : v })}>
                <SelectTrigger className="h-9 text-sm glass-input"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {taskTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Data início</label>
              <Input type="date" value={task.start_date || ''} onChange={(e) => onUpdate(task.id, { start_date: e.target.value || null })} className="h-9 text-sm glass-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Prazo final</label>
              <Input type="date" value={task.due_date || ''} onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })} className="h-9 text-sm glass-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Tempo estimado (h)</label>
              <Input type="number" value={task.estimated_time || ''} onChange={(e) => onUpdate(task.id, { estimated_time: e.target.value ? parseInt(e.target.value) : null })} className="h-9 text-sm glass-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Tempo registrado</label>
              <div className="h-9 flex items-center gap-1.5 px-3 rounded-md bg-secondary/50 border border-border text-sm">
                <Timer className="w-3.5 h-3.5 text-primary" />
                <span className={totalTrackedSeconds > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {totalTrackedSeconds > 0 ? formatTrackedTime(totalTrackedSeconds) : 'Nenhum'}
                </span>
                {task.estimated_time && totalTrackedSeconds > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    ({Math.round((totalTrackedSeconds / 3600 / task.estimated_time) * 100)}%)
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Complexidade</label>
              <Select value={String(task.complexity)} onValueChange={(v) => onUpdate(task.id, { complexity: parseInt(v) })}>
                <SelectTrigger className="h-9 text-sm glass-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{'⭐'.repeat(n)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Valor estimado (R$)</label>
              <Input type="number" value={task.estimated_value || ''} onChange={(e) => onUpdate(task.id, { estimated_value: parseFloat(e.target.value) || 0 })} className="h-9 text-sm glass-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Valor real (R$)</label>
              <Input type="number" value={task.real_value || ''} onChange={(e) => onUpdate(task.id, { real_value: parseFloat(e.target.value) || 0 })} className="h-9 text-sm glass-input" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5" /> Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Adicione uma descrição mais detalhada..."
              className="glass-input min-h-[100px] text-sm"
            />
          </div>

          {/* Tabs for checklists, comments, activity */}
          <Tabs defaultValue="checklists" className="w-full">
            <TabsList className="w-full glass">
              <TabsTrigger value="checklists" className="flex-1 text-xs gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> Checklists {progress && `(${progress.pct}%)`}
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex-1 text-xs gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Comentários ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs gap-1">
                <Activity className="w-3.5 h-3.5" /> Atividade
              </TabsTrigger>
            </TabsList>

            {/* Checklists */}
            <TabsContent value="checklists" className="mt-4 space-y-4">
              {checklists.map((cl) => (
                <div key={cl.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{cl.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">{getChecklistProgress(cl)}%</span>
                      <button onClick={() => { kanban.deleteChecklist(cl.id); loadDetails(); }} className="text-destructive hover:bg-destructive/10 rounded p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Progress value={getChecklistProgress(cl)} className="h-1.5 mb-3" />
                  <div className="space-y-1.5">
                    {cl.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-secondary/50 transition cursor-pointer group">
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={(checked) => handleToggleItem(item.id, !!checked)}
                        />
                        <span className={`text-sm flex-1 ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </span>
                        <button
                          onClick={(e) => { e.preventDefault(); kanban.deleteChecklistItem(item.id); loadDetails(); }}
                          className="opacity-0 group-hover:opacity-100 text-destructive p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </label>
                    ))}
                  </div>
                  {/* Add item */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <Input
                      value={newItemTitles[cl.id] || ''}
                      onChange={(e) => setNewItemTitles((prev) => ({ ...prev, [cl.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem(cl.id)}
                      placeholder="Adicionar item..."
                      className="h-7 text-xs glass-input flex-1"
                    />
                    <Button size="sm" onClick={() => handleAddChecklistItem(cl.id)} className="h-7 text-xs px-2">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add checklist */}
              <div className="flex items-center gap-1.5">
                <Input
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                  placeholder="Nome do checklist..."
                  className="h-8 text-xs glass-input flex-1"
                />
                <Button size="sm" onClick={handleAddChecklist} className="h-8 text-xs btn-glow">
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> Criar Checklist
                </Button>
              </div>
            </TabsContent>

            {/* Comments */}
            <TabsContent value="comments" className="mt-4 space-y-3">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((c) => {
                  const profile = userProfiles[c.user_id];
                  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'U';
                  const canDelete = user?.id === c.user_id; // Check kanban user
                  return (
                  <div key={c.id} className="glass-card rounded-xl p-3 group relative">
                    {canDelete && (
                      <button
                        onClick={(e) => { e.preventDefault(); setCommentToDelete(c.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors"
                        title="Excluir Comentário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-primary">{initial}</span>
                        </div>
                      )}
                      <span className="text-[10px] font-medium text-foreground">{profile?.name || 'Alguém'}</span>
                      <span className="text-[10px] text-muted-foreground mr-6">
                        {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{c.content}</p>
                  </div>
                )})}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Escrever um comentário..."
                  className="glass-input text-sm flex-1"
                />
                <Button onClick={handleAddComment} className="btn-glow text-xs">Enviar</Button>
              </div>
            </TabsContent>

            {/* Activity */}
            <TabsContent value="activity" className="mt-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activityLogs.map((log) => {
                  const details = log.details as Record<string, any> | null;
                  const isTimeTracked = log.action === 'time_tracked';
                  const profile = userProfiles[log.user_id];
                  const userName = profile?.name || 'Alguém';
                  return (
                    <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                      {isTimeTracked ? (
                        <Timer className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        {isTimeTracked ? (
                          <p className="text-xs text-foreground">
                            Tempo registrado: <span className="font-semibold">{details?.duration_formatted || '—'}</span>
                            {details?.description && <span className="text-muted-foreground"> — {details.description}</span>}
                          </p>
                        ) : (
                          <p className="text-xs text-foreground">
                            {log.action === 'moved_to_column' ? (
                              <>
                                <span className="font-semibold">{userName}</span> moveu de{' '}
                                <span className="font-medium">'{details?.from || 'coluna anterior'}'</span> para{' '}
                                <span className="font-medium">'{details?.to || details?.column}'</span>
                              </>
                            ) : log.action === 'description_changed' ? (
                              <><span className="font-semibold">{userName}</span> alterou a descrição</>
                            ) : log.action === 'title_changed' ? (
                              <><span className="font-semibold">{userName}</span> alterou o título de '{details?.from}' para '{details?.to}'</>
                            ) : log.action === 'priority_changed' ? (
                              <><span className="font-semibold">{userName}</span> alterou a prioridade</>
                            ) : (
                              <><span className="font-semibold">{userName}</span>: {log.action.replace(/_/g, ' ')}</>
                            )}
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {activityLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Integration actions */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (task.project_id) params.set('project', task.project_id);
                  params.set('desc', task.title);
                  params.set('task', task.id);
                  onClose();
                  navigate(`/dashboard/time?${params.toString()}`);
                }}
              >
                <Play className="w-3.5 h-3.5" /> Iniciar Timer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('from_task', task.id);
                  params.set('desc', task.title);
                  params.set('value', String(task.real_value || task.estimated_value || 0));
                  if (task.client_id) params.set('client', task.client_id);
                  onClose();
                  navigate(`/dashboard/invoices?${params.toString()}`);
                }}
              >
                <Receipt className="w-3.5 h-3.5" /> Gerar Fatura
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('from_task', task.id);
                  params.set('desc', task.title);
                  params.set('value', String(task.estimated_value || 0));
                  if (task.client_id) params.set('client', task.client_id);
                  onClose();
                  navigate(`/dashboard/budgets?${params.toString()}`);
                }}
              >
                <FileText className="w-3.5 h-3.5" /> Gerar Orçamento
              </Button>
            </div>
            <Button variant="destructive" size="sm" onClick={() => fetchDeleteImpact()} className="text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir tarefa
            </Button>
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
                          <strong className="text-foreground">{deleteImpact.timeEntries}</strong> registro{deleteImpact.timeEntries > 1 ? 's' : ''} de tempo ({formatImpactDuration(deleteImpact.totalSeconds)})
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
              onClick={() => { onDelete(task.id); onClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment delete warning */}
      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Excluir Comentário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async (e) => { 
                e.preventDefault(); // Prevent automatic close
                if (commentToDelete) {
                  const idToDel = commentToDelete;
                  await kanban.deleteComment(idToDel); 
                  setCommentToDelete(null);
                  loadDetails();
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>,
    document.body
  );
};
