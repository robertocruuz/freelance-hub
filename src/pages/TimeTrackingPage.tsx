import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
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

  const navigate = (dir: number) => {
    const d = new Date(selectedDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + dir);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

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

  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

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
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-foreground pb-8">
        <div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter uppercase italic leading-[0.8]">
            {t.timeTracking}
          </h1>
          <p className="text-xl font-bold text-muted-foreground mt-4 uppercase tracking-widest italic">Acompanhe seu tempo real</p>
        </div>
        <div className="bg-accent p-4 border-4 border-foreground shadow-brutalist rotate-2">
           <span className="text-xs font-black uppercase tracking-widest">Total Hoje:</span>
           <p className="text-2xl font-black italic">{formatDuration(todayTotal)}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className={`brutalist-card p-6 flex flex-wrap items-center gap-4 transition-colors ${running ? 'bg-secondary/10 border-primary' : 'bg-card'}`}>
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest ml-1">O que você está fazendo?</label>
          <input
            placeholder={t.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full brutalist-input h-12"
          />
        </div>
        <div className="w-full md:w-64 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t.project}</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full brutalist-input h-12"
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
        <div className="flex flex-col items-center justify-center px-6 min-w-[120px]">
           <span className="text-[10px] font-black uppercase tracking-widest mb-1">Duração</span>
           <span className="font-mono text-3xl font-black text-foreground">
            {formatDuration(elapsed)}
          </span>
        </div>
        <div className="shrink-0">
          {running ? (
            <button onClick={stopTimer} className="w-16 h-16 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0 rounded-full border-4">
              <Square className="w-8 h-8 fill-current" />
            </button>
          ) : (
            <button onClick={startTimer} className="w-16 h-16 brutalist-button-primary flex items-center justify-center p-0 rounded-full border-4">
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b-4 border-foreground pb-4">
        <div className="flex items-center gap-2">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 border-2 border-foreground rounded font-black uppercase text-[10px] tracking-widest transition-all ${viewMode === mode ? 'bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] translate-y-[-1px]' : 'bg-background hover:bg-secondary/20'}`}
            >
              {mode === 'daily' ? t.dailyView : mode === 'weekly' ? t.weeklyView : t.monthlyView}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 brutalist-button flex items-center justify-center p-0"><ChevronLeft className="w-6 h-6" /></button>
          <div className="bg-card border-2 border-foreground px-6 py-2 rounded flex items-center gap-3">
            <Calendar className="w-5 h-5" />
            <span className="font-black uppercase text-xs tracking-widest italic">{dateLabel()}</span>
          </div>
          <button onClick={() => navigate(1)} className="w-10 h-10 brutalist-button flex items-center justify-center p-0"><ChevronRight className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Daily view */}
      {viewMode === 'daily' && (
        <div className="space-y-6">
          {filteredEntries.length === 0 ? (
            <div className="brutalist-card p-20 text-center bg-muted/20 border-dashed">
              <Clock className="w-16 h-16 mx-auto mb-6 opacity-40" />
              <p className="font-black uppercase tracking-widest text-muted-foreground">{t.noEntries}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredEntries.map((entry, idx) => (
                <div key={entry.id} className={`brutalist-card p-6 flex flex-wrap items-center justify-between gap-6 bg-card ${idx % 2 === 0 ? 'rotate-[-0.2deg]' : 'rotate-[0.2deg]'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-black uppercase tracking-tight italic leading-none truncate mb-2">{entry.description || '—'}</p>
                    <div className="flex items-center gap-3">
                       <span className="px-2 py-0.5 bg-secondary border border-foreground rounded text-[9px] font-black uppercase tracking-widest">
                        {getProjectName(entry.project_id) || 'Sem projeto'}
                       </span>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                       </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="font-mono text-3xl font-black italic">{formatDuration(entry.duration || 0)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(entry)} className="w-10 h-10 brutalist-button bg-background flex items-center justify-center p-0"><Pencil className="w-5 h-5" /></button>
                      <button onClick={() => deleteEntry(entry.id)} className="w-10 h-10 brutalist-button bg-destructive text-destructive-foreground flex items-center justify-center p-0"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly & Monthly views kept simplified with brutalist touches */}
      {(viewMode === 'weekly' || viewMode === 'monthly') && (
        <div className="brutalist-card bg-card overflow-hidden border-4">
          <div className="p-12 text-center space-y-4">
             <Calendar className="w-20 h-20 mx-auto text-primary opacity-20" />
             <h3 className="text-2xl font-black italic uppercase tracking-tighter">Visualização {viewMode === 'weekly' ? 'Semanal' : 'Mensal'}</h3>
             <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">
               Total no período: <span className="text-foreground">{formatDuration(totalFiltered)}</span>
             </p>
             <button onClick={() => setViewMode('daily')} className="brutalist-button-primary mt-6">Voltar para visão diária</button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="bg-card border-8 border-foreground p-8 max-w-md rounded-none shadow-brutalist-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter border-b-4 border-foreground pb-4">{t.editEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">{t.description}</label>
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full brutalist-input" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">{t.project}</label>
              <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="w-full brutalist-input">
                <option value="">{t.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest">Início</label>
                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full brutalist-input" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest">Fim</label>
                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full brutalist-input" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 brutalist-button bg-background">{t.cancel}</button>
              <button onClick={saveEdit} className="flex-1 brutalist-button-primary">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
