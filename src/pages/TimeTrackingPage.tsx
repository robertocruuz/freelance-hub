import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight, Clock, Briefcase, User, MoreVertical, LayoutGrid, List } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">{t.timeTracking}</h1>
          <p className="text-slate-500 font-medium">Log your hours and stay productive.</p>
        </div>
      </div>

      {/* Modern Timer bar */}
      <div className="clean-card p-4 md:p-6 bg-slate-900 text-white flex flex-col lg:flex-row items-center gap-6 shadow-xl">
        <div className="flex-1 w-full lg:w-auto">
          <input
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 border-none rounded-xl px-5 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue/50 outline-none font-semibold transition-all"
          />
        </div>
        <div className="w-full lg:w-72">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-slate-800 border-none rounded-xl px-5 py-3 text-white focus:ring-2 focus:ring-brand-blue/50 outline-none font-semibold transition-all appearance-none cursor-pointer"
          >
            <option value="" className="text-slate-400">{t.project}</option>
            {projects.map((p) => {
              const client = clients.find(c => c.id === p.client_id);
              return (
                <option key={p.id} value={p.id} className="text-slate-900">
                  {p.name}{client ? ` (${client.name})` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex items-center gap-8 ml-auto">
          <div className="text-center min-w-[120px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time Elapsed</p>
            <span className="font-display font-bold text-4xl tracking-tighter tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
          {running ? (
            <button
              onClick={stopTimer}
              className="w-16 h-16 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/20"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={startTimer}
              className="w-16 h-16 rounded-2xl bg-brand-blue hover:bg-brand-blue/90 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
            >
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="clean-card group">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.todayTotal}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{formatDuration(todayTotal)}</h3>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="clean-card group bg-brand-blue text-white border-none shadow-brand-blue/10">
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
            {viewMode === 'daily' ? t.todayTotal : viewMode === 'weekly' ? t.weekTotal : t.monthlyView}
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white tabular-nums">{formatDuration(totalFiltered)}</h3>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="clean-card group bg-brand-pink text-slate-900 border-none">
          <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-2">{t.billable}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{formatDuration(totalFiltered)}</h3>
            <div className="w-10 h-10 rounded-xl bg-slate-900/5 flex items-center justify-center text-slate-900/40">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* View mode toggle + navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                viewMode === mode
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {mode === 'daily' ? t.dailyView : mode === 'weekly' ? t.weeklyView : t.monthlyView}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:shadow-md transition-all text-slate-400 hover:text-brand-blue"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-bold text-slate-700 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
            {dateLabel()}
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:shadow-md transition-all text-slate-400 hover:text-brand-blue"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Daily view: clean list */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="clean-card py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-slate-300" />
              </div>
              <p className="font-bold text-slate-400 tracking-tight">{t.noEntries}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="clean-card group hover:border-brand-blue/20 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 p-5">
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 truncate mb-1">{entry.description || '—'}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Briefcase className="w-3 h-3" />
                      {getProjectName(entry.project_id) || 'NO PROJECT'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="font-bold text-xl text-slate-900 tabular-nums">{formatDuration(entry.duration || 0)}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </p>
                  </div>

                  <div className="flex gap-1 border-l border-slate-100 pl-6">
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-3 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-blue transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-3 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly view: compact grid */}
      {viewMode === 'weekly' && (
        <div className="clean-card p-0 overflow-hidden border-none shadow-xl">
          <div className="grid grid-cols-7 bg-slate-900 text-white">
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              return (
                <div key={i} className={cn(
                  "p-4 text-center border-r border-slate-800 last:border-r-0",
                  isToday ? 'bg-brand-blue text-white' : ''
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">
                    {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className="text-xl font-bold">{d.getDate()}</p>
                  <p className="text-[10px] font-bold mt-2 opacity-80">{formatDuration(dayTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-slate-50 bg-white max-h-[500px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="p-16 text-center font-bold text-slate-300">{t.noEntries}</div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-8 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{entry.description || '—'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">{getProjectName(entry.project_id)}</span>
                      <span className="text-[10px] font-bold text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(entry.start_time).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="font-bold text-lg text-slate-900 tabular-nums">{formatDuration(entry.duration || 0)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(entry)} className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-brand-blue transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                       <button onClick={() => deleteEntry(entry.id)} className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monthly view: calendar grid */}
      {viewMode === 'monthly' && (
        <div className="clean-card p-0 overflow-hidden border-none shadow-xl bg-white">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-4">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: monthStart.getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-b border-r border-slate-50" />
            ))}
            {monthDays.map((d) => {
              const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.getDate()}
                  onClick={() => { setSelectedDate(d); setViewMode('daily'); }}
                  className={cn(
                    "p-4 min-h-[120px] border-b border-r border-slate-50 text-left transition-all group relative",
                    isToday ? 'bg-brand-blue/5' : 'hover:bg-slate-50'
                  )}
                >
                  <span className={cn(
                    "text-lg font-bold",
                    isToday ? 'text-brand-blue' : 'text-slate-900'
                  )}>{d.getDate()}</span>

                  {dayTotal > 0 && (
                    <div className="mt-2">
                       <p className="text-[10px] font-bold text-slate-500 tabular-nums">
                         {formatDuration(dayTotal)}
                       </p>
                       <div className="mt-2 flex gap-1 flex-wrap">
                        {dayEntries.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
                        ))}
                        {dayEntries.length > 3 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        )}
                      </div>
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
        <DialogContent className="rounded-[2rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-slate-900">{t.editEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">{t.description}</label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">{t.project}</label>
              <select
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all appearance-none cursor-pointer"
              >
                <option value="">{t.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Start Time</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">End Time</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button onClick={() => setEditingEntry(null)} className="flex-1 btn-outline">
                {t.cancel}
              </button>
              <button onClick={saveEdit} className="flex-1 btn-primary">
                {t.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
