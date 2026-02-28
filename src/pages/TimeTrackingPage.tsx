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

  const inputClass = "px-4 py-3 border-[3px] border-black rounded-2xl bg-white text-black placeholder:text-black/40 outline-none font-bold dark:border-white dark:bg-black dark:text-white";

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
      {/* Timer bar */}
      <div className="brand-card p-6 flex flex-wrap items-center gap-6 bg-brand-offwhite">
        <input
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass + " flex-1 min-w-[200px]"}
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className={inputClass + " w-64"}
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
        <div className="flex items-center gap-6 ml-auto">
          <span className="font-black italic text-4xl tracking-tighter w-40 text-center">
            {formatDuration(elapsed)}
          </span>
          {running ? (
            <button onClick={stopTimer} className="w-14 h-14 rounded-full border-[3px] border-black bg-destructive flex items-center justify-center hover:scale-105 transition-transform dark:border-white">
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          ) : (
            <button onClick={startTimer} className="w-14 h-14 rounded-full border-[3px] border-black bg-brand-neon flex items-center justify-center hover:scale-105 transition-transform dark:border-white">
              <Play className="w-6 h-6 text-black fill-black ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="brand-card p-6 text-center bg-white dark:bg-black">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">{t.todayTotal}</p>
          <p className="text-3xl font-black italic">{formatDuration(todayTotal)}</p>
        </div>
        <div className="brand-card p-6 text-center bg-brand-blue text-white">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{viewMode === 'daily' ? t.todayTotal : viewMode === 'weekly' ? t.weekTotal : t.monthlyView}</p>
          <p className="text-3xl font-black italic">{formatDuration(totalFiltered)}</p>
        </div>
        <div className="brand-card p-6 text-center bg-brand-pink text-black">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t.billable}</p>
          <p className="text-3xl font-black italic">{formatDuration(totalFiltered)}</p>
        </div>
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-2 p-1.5 border-[3px] border-black rounded-2xl bg-white dark:bg-black dark:border-white">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === mode ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-foreground/40 hover:text-foreground'}`}
            >
              {mode === 'daily' ? t.dailyView : mode === 'weekly' ? t.weeklyView : t.monthlyView}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 btn-brand bg-white p-0 flex items-center justify-center dark:bg-black"><ChevronLeft className="w-5 h-5" /></button>
          <div className="px-6 py-2 border-[3px] border-black rounded-full font-black uppercase italic text-sm dark:border-white">
            {dateLabel()}
          </div>
          <button onClick={() => navigate(1)} className="w-10 h-10 btn-brand bg-white p-0 flex items-center justify-center dark:bg-black"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Daily view: clean list */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="brand-card py-24 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-6 opacity-20" />
              <p className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">{t.noEntries}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="brand-card flex items-center justify-between p-6 bg-white dark:bg-black">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-black italic uppercase tracking-tight truncate">{entry.description || '—'}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">{getProjectName(entry.project_id) || 'NO PROJECT'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-black text-xl italic">{formatDuration(entry.duration || 0)}</p>
                    <p className="text-[10px] font-bold uppercase text-foreground/40">
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </p>
                  </div>
                  <div className="flex gap-2 border-l-[3px] border-black/10 dark:border-white/10 pl-6 ml-4">
                    <button onClick={() => openEdit(entry)} className="w-10 h-10 btn-brand bg-brand-offwhite p-0 flex items-center justify-center dark:bg-black"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="w-10 h-10 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly view: compact grid */}
      {viewMode === 'weekly' && (
        <div className="window-container">
          <div className="grid grid-cols-7 bg-brand-offwhite dark:bg-black/40 border-b-[3px] border-black dark:border-white">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              return (
                <div key={i} className={`p-4 text-center border-l-[3px] first:border-l-0 border-black dark:border-white ${isToday ? 'bg-brand-neon text-black' : ''}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  <p className="text-2xl font-black italic">{d.getDate()}</p>
                  <p className="text-[10px] font-black mt-2">{formatDuration(dayTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y-[3px] divide-black dark:divide-white bg-white dark:bg-black max-h-[500px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="p-12 text-center font-black uppercase text-foreground/40">{t.noEntries}</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-8 py-4 hover:bg-brand-offwhite dark:hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-black italic uppercase tracking-tight truncate">{entry.description || '—'}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">{getProjectName(entry.project_id)} • {new Date(entry.start_time).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-black text-xl italic">{formatDuration(entry.duration || 0)}</span>
                    <button onClick={() => openEdit(entry)} className="w-8 h-8 btn-brand bg-white p-0 flex items-center justify-center dark:bg-black"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="w-8 h-8 btn-brand bg-white text-destructive p-0 flex items-center justify-center dark:bg-black"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monthly view: calendar grid */}
      {viewMode === 'monthly' && (
        <div className="window-container">
          <div className="grid grid-cols-7 bg-brand-offwhite dark:bg-black/40 border-b-[3px] border-black dark:border-white text-[10px] font-black uppercase tracking-widest text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-3 border-l-[3px] first:border-l-0 border-black dark:border-white">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-white dark:bg-black">
            {Array.from({ length: monthStart.getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-t-[3px] border-l-[3px] first:border-l-0 border-black dark:border-white bg-brand-offwhite/50 dark:bg-white/5" />
            ))}
            {monthDays.map((d) => {
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.getDate()}
                  onClick={() => { setSelectedDate(d); setViewMode('daily'); }}
                  className={`p-4 min-h-[100px] border-t-[3px] border-l-[3px] border-black dark:border-white text-left hover:bg-brand-neon transition-colors group ${isToday ? 'bg-brand-blue text-white' : ''}`}
                >
                  <p className="text-xl font-black italic">{d.getDate()}</p>
                  {dayTotal > 0 && (
                    <p className={`text-[10px] font-black mt-2 ${isToday ? 'text-white' : 'text-brand-pink'}`}>{formatDuration(dayTotal)}</p>
                  )}
                  {dayEntries.length > 0 && (
                    <div className="mt-3 flex gap-1">
                      {dayEntries.slice(0, 4).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full border border-black ${isToday ? 'bg-white' : 'bg-black'} dark:border-white dark:bg-white`} />
                      ))}
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
        <DialogContent className="border-[3px] border-black rounded-3xl p-8 dark:border-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">{t.editEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t.description}</label>
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={inputClass + " w-full mt-1"} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t.project}</label>
              <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className={inputClass + " w-full mt-1"}>
                <option value="">{t.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest ml-1">Início</label>
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className={inputClass + " w-full mt-1"} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest ml-1">Fim</label>
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className={inputClass + " w-full mt-1"} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 btn-brand bg-white text-black dark:bg-black dark:text-white uppercase">{t.cancel}</button>
              <button onClick={saveEdit} className="flex-1 btn-brand bg-brand-blue text-white uppercase">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
