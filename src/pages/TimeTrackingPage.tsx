import { useState, useEffect, useRef, useCallback } from 'react';
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

interface TimeEntry {
  id: string;
  project_id: string | null;
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
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const { clients } = useClients();
  const intervalRef = useRef<number>();

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }, [user]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(200);
    if (data) setEntries(data);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

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
      description: description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration,
    });
    if (error) toast.error(error.message);
    else {
      setElapsed(0);
      setDescription('');
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
  const navigate = (dir: number) => {
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
    <div className="max-w-6xl space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight mb-2">{t.timeTracking}</h1>
          <p className="text-black/40 font-medium">{lang === 'pt-BR' ? 'Acompanhe seu tempo e produtividade' : 'Track your time and productivity'}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex flex-wrap items-center gap-4 p-6 rounded-[2.5rem] bg-white border border-black/5 shadow-sm">
        <input
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 min-w-[250px] h-16 px-8 rounded-2xl bg-[#f8f7f9] text-lg font-medium text-foreground placeholder:text-black/20 focus:outline-none focus:ring-4 focus:ring-[#1369db]/5 transition-all border border-black/5"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-64 h-16 px-6 rounded-2xl bg-[#f8f7f9] text-base font-bold text-black/60 focus:outline-none border border-black/5 appearance-none cursor-pointer"
        >
          <option value="">{t.project}</option>
          {projects.map((p) => {
            const client = clients.find(c => c.id === p.client_id);
            return (
              <option key={p.id} value={p.id}>
                {p.name}{client ? ` (${client.name})` : ''}
              </option>
            );
          })}
        </select>
        <div className="px-8 h-16 flex items-center justify-center rounded-2xl bg-[#f8f7f9] border border-black/5 min-w-[160px]">
          <span className="font-mono text-3xl font-black text-foreground">
            {formatDuration(elapsed)}
          </span>
        </div>
        {running ? (
          <button onClick={stopTimer} className="h-16 px-8 rounded-2xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition-all flex items-center gap-3 shadow-lg shadow-red-500/20">
            <Square className="w-6 h-6 fill-white" /> {t.stopTimer}
          </button>
        ) : (
          <button onClick={startTimer} className="h-16 px-8 rounded-2xl bg-[#1369db] text-white font-bold text-lg hover:opacity-90 transition-all flex items-center gap-3 shadow-lg shadow-blue-500/20">
            <Play className="w-6 h-6 fill-white" /> {t.startTimer}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2rem] bg-white border border-black/5 flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black/30">{t.todayTotal}</p>
          <p className="text-4xl font-black text-foreground">{formatDuration(todayTotal)}</p>
        </div>
        <div className="p-8 rounded-[2rem] bg-white border border-black/5 flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-widest text-black/30">{viewMode === 'daily' ? t.todayTotal : viewMode === 'weekly' ? t.weekTotal : t.monthlyView}</p>
          <p className="text-4xl font-black text-[#1369db]">{formatDuration(totalFiltered)}</p>
        </div>
        <div className="p-8 rounded-[2rem] bg-white border border-black/5 flex flex-col gap-2 hidden sm:flex">
          <p className="text-sm font-bold uppercase tracking-widest text-black/30">{t.billable}</p>
          <p className="text-4xl font-black text-[#3b9166]">{formatDuration(totalFiltered)}</p>
        </div>
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-white border border-black/5 shadow-sm">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-black text-white' : 'text-black/40 hover:text-black hover:bg-black/5'}`}
            >
              {mode === 'daily' ? t.dailyView : mode === 'weekly' ? t.weeklyView : t.monthlyView}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white hover:border-black/10 border border-transparent transition-all text-black/40 hover:text-black"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => setSelectedDate(new Date())} className="h-12 px-6 rounded-xl bg-white border border-black/5 text-sm font-bold text-black flex items-center gap-3 shadow-sm">
            <Calendar className="w-5 h-5 text-[#1369db]" />
            <span className="capitalize">{dateLabel()}</span>
          </button>
          <button onClick={() => navigate(1)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white hover:border-black/10 border border-transparent transition-all text-black/40 hover:text-black"><ChevronRight className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Daily view: clean list */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-white border border-black/5 rounded-[3rem] py-24 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-6 text-black/10" />
              <p className="text-xl font-bold text-black/20 uppercase tracking-widest">{t.noEntries}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-white border border-black/5 hover:border-black/10 transition-all group">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-2xl bg-[#f8f7f9] flex items-center justify-center text-black/40 group-hover:bg-[#d7ff73] group-hover:text-black transition-all duration-300">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground mb-1 truncate">{entry.description || '—'}</p>
                    <p className="text-sm font-bold text-black/30 uppercase tracking-widest">{getProjectName(entry.project_id) || t.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <span className="block font-mono text-2xl font-black text-foreground">
                      {formatDuration(entry.duration || 0)}
                    </span>
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-black/5 pl-6">
                    <button onClick={() => openEdit(entry)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-[#f8f7f9] text-black/20 hover:text-black transition-all"><Pencil className="w-5 h-5" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 text-black/20 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly view: compact grid */}
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

      {/* Monthly view: calendar grid */}
      {viewMode === 'monthly' && (
        <div className="rounded-3xl glass overflow-hidden">
          <div className="grid grid-cols-7 text-center border-b border-border">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Empty cells before month starts */}
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
                      {dayEntries.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayEntries.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle>{t.editEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">{t.description}</label>
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg glass-input text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t.project}</label>
              <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg glass-input text-foreground text-sm focus:outline-none">
                <option value="">{t.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Início</label>
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg glass-input text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim</label>
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg glass-input text-foreground text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm">{t.cancel}</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
