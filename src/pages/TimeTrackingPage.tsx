import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, Square, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  hourly_rate: number;
}

interface KanbanTask {
  id: string;
  title: string;
  project_id: string | null;
  column_id: string | null;
}

interface TimeEntry {
  id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const TimeTrackingPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editTaskId, setEditTaskId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const { clients } = useClients();
  const intervalRef = useRef<number>();
  const prefillApplied = useRef(false);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }, [user]);

  const loadKanbanTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, title, project_id, column_id')
      .order('title');
    if (data) setKanbanTasks(data);
  }, [user]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(200);
    if (data) setEntries(data as TimeEntry[]);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadKanbanTasks(); }, [loadKanbanTasks]);

  // Filter tasks by selected project
  const filteredTasks = projectId
    ? kanbanTasks.filter(t => t.project_id === projectId)
    : kanbanTasks;

  // Pre-fill from Kanban integration
  useEffect(() => {
    if (prefillApplied.current) return;
    const desc = searchParams.get('desc');
    const project = searchParams.get('project');
    const task = searchParams.get('task');
    if (desc || project || task) {
      prefillApplied.current = true;
      if (desc) setDescription(desc);
      if (project) setProjectId(project);
      if (task) setTaskId(task);
      // Auto-start timer
      setStartTime(Date.now());
      setElapsed(0);
      setRunning(true);
      // Clear params
      setSearchParams({}, { replace: true });
      toast.success('Timer iniciado a partir da tarefa!');
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, startTime]);

  const startTimer = () => {
    setStartTime(Date.now());
    setElapsed(0);
    setRunning(true);
  };

  const stopTimer = async () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (!user) return;
    const end = new Date();
    const start = new Date(startTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      project_id: projectId || null,
      task_id: taskId || null,
      description: description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration,
    } as any);
    if (error) toast.error(error.message);
    else {
      setElapsed(0);
      setDescription('');
      setTaskId('');
      loadEntries();
    }
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('time_entries').delete().eq('id', id);
    loadEntries();
  };

  const openEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDesc(entry.description || '');
    setEditProjectId(entry.project_id || '');
    setEditStartTime(new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    setEditEndTime(entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
  };

  const saveEdit = async () => {
    if (!editingEntry) return;
    const entryDate = new Date(editingEntry.start_time);
    const dateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;

    const newStart = new Date(`${dateStr}T${editStartTime}:00`);
    const newEnd = editEndTime ? new Date(`${dateStr}T${editEndTime}:00`) : null;
    const duration = newEnd ? Math.floor((newEnd.getTime() - newStart.getTime()) / 1000) : null;

    const { error } = await supabase.from('time_entries').update({
      description: editDesc || null,
      project_id: editProjectId || null,
      start_time: newStart.toISOString(),
      end_time: newEnd?.toISOString() || null,
      duration,
    }).eq('id', editingEntry.id);

    if (error) toast.error(error.message);
    else {
      setEditingEntry(null);
      loadEntries();
    }
  };

  const getProjectName = (pid: string | null) => {
    if (!pid) return '';
    const p = projects.find(pr => pr.id === pid);
    return p?.name || '';
  };

  // Navigation
  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + dir);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const ed = new Date(e.start_time);
    if (viewMode === 'daily') return isSameDay(ed, selectedDate);
    if (viewMode === 'weekly') {
      const ws = new Date(selectedDate);
      ws.setDate(selectedDate.getDate() - selectedDate.getDay());
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      return ed >= ws && ed < we;
    }
    return ed.getMonth() === selectedDate.getMonth() && ed.getFullYear() === selectedDate.getFullYear();
  });

  const totalFiltered = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const todayEntries = entries.filter((e) => isSameDay(new Date(e.start_time), new Date()));
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Weekly grid
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Monthly grid
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthDays = Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
  });

  const dateLabel = () => {
    if (viewMode === 'daily') return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (viewMode === 'weekly') {
      const we = new Date(weekStart);
      we.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
    }
    return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Timer bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-3xl glass">
        <input
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 min-w-[150px] px-4 py-2 rounded-xl glass-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-52 px-4 py-2 rounded-xl glass-input text-foreground text-sm focus:outline-none"
        >
          <option value="">{t.project}</option>
          {projects.map((p) => {
            const client = clients.find(c => c.id === p.client_id);
            return (
              <option key={p.id} value={p.id}>
                {p.name}{client ? ` (${client.name})` : ''} · R${p.hourly_rate}/h
              </option>
            );
          })}
        </select>
        <span className="font-mono text-lg font-semibold text-foreground w-24 text-center">
          {formatDuration(elapsed)}
        </span>
        {running ? (
          <button onClick={stopTimer} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm">
            <Square className="w-4 h-4" /> {t.stopTimer}
          </button>
        ) : (
          <button onClick={startTimer} className="flex items-center gap-2 px-5 py-2 rounded-xl btn-glow text-primary-foreground font-semibold text-sm">
            <Play className="w-4 h-4" /> {t.startTimer}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass text-center">
          <p className="text-xs text-muted-foreground">{t.todayTotal}</p>
          <p className="text-xl font-bold text-foreground">{formatDuration(todayTotal)}</p>
        </div>
        <div className="p-4 rounded-2xl glass text-center">
          <p className="text-xs text-muted-foreground">{viewMode === 'daily' ? t.todayTotal : viewMode === 'weekly' ? t.weekTotal : t.monthlyView}</p>
          <p className="text-xl font-bold text-foreground">{formatDuration(totalFiltered)}</p>
        </div>
        <div className="p-4 rounded-2xl glass text-center hidden sm:block">
          <p className="text-xs text-muted-foreground">{t.billable}</p>
          <p className="text-xl font-bold text-foreground">{formatDuration(totalFiltered)}</p>
        </div>
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === mode ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {mode === 'daily' ? t.dailyView : mode === 'weekly' ? t.weeklyView : t.monthlyView}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 rounded-lg glass-pill text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{dateLabel()}</span>
          </button>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Daily view */}
      {viewMode === 'daily' && (
        <div className="space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t.noEntries}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-2xl glass text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">{entry.description || '—'}</p>
                  <p className="text-xs text-muted-foreground">{getProjectName(entry.project_id) || t.project}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">{formatDuration(entry.duration || 0)}</span>
                  <button onClick={() => openEdit(entry)} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly view */}
      {viewMode === 'weekly' && (
        <div className="rounded-3xl glass overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              return (
                <div key={i} className={`p-3 text-center border-l first:border-l-0 border-border ${isToday ? 'bg-primary/5' : ''}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  <p className="text-lg font-bold text-foreground">{d.getDate()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDuration(dayTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-border/50 max-h-[350px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t.noEntries}</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium truncate">{entry.description || '—'}</p>
                    <p className="text-xs text-muted-foreground">{getProjectName(entry.project_id)} · {new Date(entry.start_time).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-foreground">{formatDuration(entry.duration || 0)}</span>
                    <button onClick={() => openEdit(entry)} className="text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monthly view */}
      {viewMode === 'monthly' && (
        <div className="rounded-3xl glass overflow-hidden">
          <div className="grid grid-cols-7 text-center border-b border-border">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: monthStart.getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[70px] border-t border-l first:border-l-0 border-border/30" />
            ))}
            {monthDays.map((d) => {
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.getDate()}
                  onClick={() => { setSelectedDate(d); setViewMode('daily'); }}
                  className={`p-2 min-h-[70px] border-t border-l border-border/30 text-left hover:bg-accent/20 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <p className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-foreground'}`}>{d.getDate()}</p>
                  {dayTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{formatDuration(dayTotal)}</p>
                  )}
                  {dayEntries.length > 0 && (
                    <div className="mt-1 flex gap-0.5">
                      {dayEntries.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      ))}
                      {dayEntries.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEntries.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input
              placeholder={t.description}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t.project}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}</select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
              <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
