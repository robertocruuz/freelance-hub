import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight, Clock, Briefcase } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#d7ff73] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-black" />
        </div>
        <h1 className="text-4xl italic font-display">{t.timeTracking}</h1>
      </div>

      {/* Timer bar */}
      <div className="brutalist-card p-6 bg-white flex flex-col md:flex-row items-center gap-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-full md:flex-1 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest ml-1">O QUE VOCÊ ESTÁ FAZENDO?</label>
          <input
            placeholder={t.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full brutalist-input h-12"
          />
        </div>
        <div className="w-full md:w-64 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest ml-1">PROJETO</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full brutalist-input h-12 bg-white"
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
        </div>
        <div className="flex flex-col items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest">TEMPO</label>
          <span className="font-mono text-4xl font-black text-primary italic">
            {formatDuration(elapsed)}
          </span>
        </div>
        <div className="pt-6">
          {running ? (
            <button onClick={stopTimer} className="w-16 h-16 rounded-full border-2 border-black bg-destructive text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center">
              <Square className="w-6 h-6 fill-current" />
            </button>
          ) : (
            <button onClick={startTimer} className="w-16 h-16 rounded-full border-2 border-black bg-[#d7ff73] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center">
              <Play className="w-6 h-6 fill-current ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: t.todayTotal, val: formatDuration(todayTotal), color: 'bg-white' },
          { label: viewMode === 'daily' ? t.todayTotal : viewMode === 'weekly' ? t.weekTotal : t.monthlyView, val: formatDuration(totalFiltered), color: 'bg-primary text-white' },
          { label: t.billable, val: formatDuration(totalFiltered), color: 'bg-[#d7ff73]' },
        ].map((stat, i) => (
          <div key={i} className={`brutalist-card p-6 text-center ${stat.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">{stat.label}</p>
            <p className="text-3xl font-black font-display italic leading-none">{stat.val}</p>
          </div>
        ))}
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-2 p-1.5 brutalist-card bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-black text-white' : 'text-muted-foreground hover:bg-black/5'}`}
            >
              {mode === 'daily' ? 'DIA' : mode === 'weekly' ? 'SEMANA' : 'MÊS'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 brutalist-card bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><ChevronLeft className="w-5 h-5" /></button>
          <div className="px-6 py-3 brutalist-card bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">{dateLabel()}</span>
          </div>
          <button onClick={() => navigate(1)} className="w-10 h-10 brutalist-card bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Daily view */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="brutalist-card bg-white p-20 text-center border-dashed">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-20 text-black" />
              <p className="font-bold uppercase tracking-widest text-muted-foreground">{t.noEntries}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="brutalist-card p-6 bg-white flex flex-wrap items-center justify-between gap-4 group hover:bg-[#f8f7f9] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold uppercase italic group-hover:text-primary transition-colors leading-tight">{entry.description || '—'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> {getProjectName(entry.project_id) || t.project}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">INTERVALO</p>
                    <p className="text-xs font-bold">
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">DURAÇÃO</p>
                    <p className="font-mono text-2xl font-black italic">{formatDuration(entry.duration || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(entry)} className="w-9 h-9 brutalist-card bg-white flex items-center justify-center hover:bg-secondary transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="w-9 h-9 brutalist-card bg-white flex items-center justify-center hover:bg-destructive hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly view */}
      {viewMode === 'weekly' && (
        <div className="brutalist-card bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-7 border-b-2 border-black">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              return (
                <div key={i} className={`p-4 text-center border-r-2 last:border-r-0 border-black ${isToday ? 'bg-primary/10' : ''}`}>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                  <p className={`text-2xl font-black italic leading-none my-1 ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
                  <p className="font-mono text-[10px] font-bold bg-black text-white rounded px-1 inline-block mt-1">{formatDuration(dayTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y-2 divide-black/5 max-h-[400px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-bold uppercase tracking-widest text-xs">{t.noEntries}</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#f8f7f9] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold uppercase italic leading-tight truncate">{entry.description || '—'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                      {getProjectName(entry.project_id)} · {new Date(entry.start_time).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-xl font-black italic text-primary">{formatDuration(entry.duration || 0)}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(entry)} className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteEntry(entry.id)} className="p-2 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monthly view */}
      {viewMode === 'monthly' && (
        <div className="brutalist-card bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-7 text-center border-b-2 border-black bg-black text-white py-2">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
              <div key={d} className="text-[10px] font-black tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: monthStart.getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[100px] border-b-2 border-r-2 border-black/5 last:border-r-0" />
            ))}
            {monthDays.map((d) => {
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.getDate()}
                  onClick={() => { setSelectedDate(d); setViewMode('daily'); }}
                  className={`p-3 min-h-[100px] border-b-2 border-r-2 border-black/5 hover:bg-primary/5 transition-colors text-left relative group ${isToday ? 'bg-secondary/10' : ''}`}
                >
                  <p className={`text-lg font-black italic leading-none ${isToday ? 'text-primary' : 'text-black'}`}>{d.getDate()}</p>
                  {dayTotal > 0 && (
                    <p className="text-[9px] font-black font-mono bg-black text-white px-1 mt-2 inline-block rounded">{formatDuration(dayTotal)}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayEntries.slice(0, 4).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-primary border-px border-black" />
                    ))}
                    {dayEntries.length > 4 && <span className="text-[8px] font-bold">+{dayEntries.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="brutalist-card p-0 border-none max-w-lg">
          <div className="p-8 bg-primary text-white border-b-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-3xl italic font-display text-white">{t.editEntry}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.description}</label>
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full brutalist-input h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1">{t.project}</label>
              <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="w-full brutalist-input h-12 bg-white">
                <option value="">{t.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">INÍCIO</label>
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full brutalist-input h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1">FIM</label>
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full brutalist-input h-12" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 brutalist-button bg-white text-black h-12 uppercase tracking-widest text-xs">{t.cancel}</button>
              <button onClick={saveEdit} className="flex-1 brutalist-button-primary h-12 uppercase tracking-widest text-xs">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
