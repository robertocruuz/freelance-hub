import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, Tag, CheckSquare, MessageSquare, Activity, Plus, Trash2, ChevronDown, Play, Receipt, FileText, Timer, FolderKanban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskChecklist, TaskComment, TaskActivityLog, useKanban, KanbanColumn } from '@/hooks/useKanban';
import { useClients, Client } from '@/hooks/useClients';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [projects, setProjects] = useState<{ id: string; name: string; client_id: string | null }[]>([]);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [totalTrackedSeconds, setTotalTrackedSeconds] = useState(0);

  useEffect(() => {
    loadDetails();
    loadTrackedTime();
    loadProjects();
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

  return (
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
              <Select value={task.project_id || 'none'} onValueChange={(v) => onUpdate(task.id, { project_id: v === 'none' ? null : v })}>
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
                {comments.map((c) => (
                  <div key={c.id} className="glass-card rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary">U</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{c.content}</p>
                  </div>
                ))}
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
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">{log.action.replace(/_/g, ' ')}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
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
            <Button variant="destructive" size="sm" onClick={() => { onDelete(task.id); onClose(); }} className="text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir tarefa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
