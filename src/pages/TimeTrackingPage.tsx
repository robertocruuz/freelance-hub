import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, Square, Pencil, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Layers, List, LayoutGrid, ChevronDown, BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
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

interface Project {
  id: string;
  name: string;
  client_id: string | null;
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

type ViewMode = 'calendar' | 'list' | 'timesheet' | 'report';
type TimeRange = 'daily' | 'weekly' | 'monthly';

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatDurationShort = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES_SHORT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const DAY_NAMES_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const CompactClientSelect = ({ clients, value, onChange, placeholder = 'Cliente', fullWidth = false }: {
  clients: { id: string; name: string; color?: string | null }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = clients.find(c => c.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : 'max-w-[160px]'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-1 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-ring ${fullWidth ? 'w-full px-4 py-2 bg-muted text-sm' : 'px-2 py-1.5 bg-transparent'}`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {selected ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: (selected as any).color || 'hsl(var(--muted-foreground))' }} />
              <span className="text-foreground truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          <button type="button" onClick={() => { onChange(''); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors ${!value ? 'bg-muted font-medium' : ''}`}>
            <span className="text-muted-foreground">{placeholder}</span>
          </button>
          {clients.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors ${c.id === value ? 'bg-muted font-medium' : ''}`}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: (c as any).color || 'hsl(var(--muted-foreground))' }} />
              <span className="truncate text-foreground">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TimeTrackingPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editTaskId, setEditTaskId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const { clients } = useClients();
  const intervalRef = useRef<number>();
  const prefillApplied = useRef(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFilter, setExportFilter] = useState<'all' | 'client' | 'project'>('all');
  const [exportClientId, setExportClientId] = useState('');
  const [exportProjectId, setExportProjectId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
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

  const filteredProjects = clientId
    ? projects.filter(p => p.client_id === clientId)
    : projects;

  const editFilteredProjects = editClientId
    ? projects.filter(p => p.client_id === editClientId)
    : projects;

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
      if (project) {
        const proj = projects.find(p => p.id === project);
        if (proj?.client_id) setClientId(proj.client_id);
        setProjectId(project);
      }
      if (task) setTaskId(task);
      setStartTime(Date.now());
      setElapsed(0);
      setRunning(true);
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

  // Scroll to current hour on mount
  useEffect(() => {
    if (calendarRef.current) {
      const currentHour = new Date().getHours();
      const scrollTarget = Math.max(0, (currentHour - 2) * 60);
      calendarRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode]);

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
      // Log activity on the task if linked
      if (taskId) {
        const projectName = getProjectName(projectId || null);
        const durationStr = formatDuration(duration);
        await supabase.from('task_activity_logs').insert({
          task_id: taskId,
          user_id: user.id,
          action: 'time_tracked',
          details: {
            duration,
            duration_formatted: durationStr,
            description: description || null,
            project_name: projectName || null,
          },
        } as any);
      }
      setElapsed(0);
      setDescription('');
      setClientId('');
      setProjectId('');
      setTaskId('');
      loadEntries();
    }
  };

  const confirmDeleteEntry = (id: string) => {
    setDeletingEntryId(id);
  };

  const deleteEntry = async () => {
    if (!deletingEntryId) return;
    const { error } = await supabase.from('time_entries').delete().eq('id', deletingEntryId);
    if (error) toast.error(error.message);
    else toast.success('Registro excluído com sucesso');
    setDeletingEntryId(null);
    loadEntries();
  };

  const openEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDesc(entry.description || '');
    const entryProject = projects.find(p => p.id === entry.project_id);
    setEditClientId(entryProject?.client_id || '');
    setEditProjectId(entry.project_id || '');
    setEditTaskId(entry.task_id || '');
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
      task_id: editTaskId || null,
      start_time: newStart.toISOString(),
      end_time: newEnd?.toISOString() || null,
      duration,
    } as any).eq('id', editingEntry.id);

    if (error) toast.error(error.message);
    else {
      setEditingEntry(null);
      loadEntries();
    }
  };

  const getProjectName = (pid: string | null) => {
    if (!pid) return '';
    return projects.find(pr => pr.id === pid)?.name || '';
  };

  const getTaskName = (tid: string | null) => {
    if (!tid) return '';
    return kanbanTasks.find(tk => tk.id === tid)?.title || '';
  };

  const editFilteredTasks = editProjectId
    ? kanbanTasks.filter(t => t.project_id === editProjectId)
    : kanbanTasks;

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    if (timeRange === 'daily') d.setDate(d.getDate() + dir);
    else if (timeRange === 'weekly') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  // Week calculations
  const weekStart = useMemo(() => {
    const ws = new Date(selectedDate);
    const day = ws.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    ws.setDate(ws.getDate() + diff);
    ws.setHours(0, 0, 0, 0);
    return ws;
  }, [selectedDate]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }), [weekStart]);

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    const ed = new Date(e.start_time);
    if (timeRange === 'daily') return isSameDay(ed, selectedDate);
    if (timeRange === 'weekly') {
      const we = new Date(weekStart);
      we.setDate(weekStart.getDate() + 7);
      return ed >= weekStart && ed < we;
    }
    return ed.getMonth() === selectedDate.getMonth() && ed.getFullYear() === selectedDate.getFullYear();
  });

  const totalFiltered = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Monthly grid
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthDays = Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
  });

  const weekNumber = getWeekNumber(selectedDate);

  const dateLabel = () => {
    if (timeRange === 'daily') return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (timeRange === 'weekly') {
      const we = new Date(weekStart);
      we.setDate(weekStart.getDate() + 6);
      return `Esta semana · S${weekNumber}`;
    }
    return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Get color for entry — uses client color if available, falls back to project-based color
  const getProjectColor = (pid: string | null) => {
    if (pid) {
      const project = projects.find(p => p.id === pid);
      if (project?.client_id) {
        const client = clients.find(c => c.id === project.client_id);
        if ((client as any)?.color) return (client as any).color;
      }
    }
    if (!pid) return 'hsl(var(--primary))';
    const idx = projects.findIndex(p => p.id === pid);
    const colors = [
      'hsl(280 70% 60%)', 'hsl(200 80% 55%)', 'hsl(150 60% 45%)',
      'hsl(35 90% 55%)', 'hsl(340 75% 55%)', 'hsl(180 60% 45%)',
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="max-w-full mx-auto space-y-0 animate-fade-in h-full flex flex-col">
      {/* Timer bar - Toggl style */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <input
          placeholder="No que você está trabalhando?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 min-w-[150px] px-3 py-2 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <CompactClientSelect clients={clients} value={clientId} onChange={(v) => { setClientId(v); setProjectId(''); setTaskId(''); }} placeholder="Cliente" />
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setTaskId(''); }}
            disabled={!clientId}
            className="max-w-[160px] px-2 py-1.5 rounded-lg bg-transparent border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
          >
            <option value="">{clientId ? t.project : 'Cliente primeiro'}</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={!projectId}
            className="max-w-[160px] px-2 py-1.5 rounded-lg bg-transparent border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
          >
            <option value="">{projectId ? 'Tarefa' : 'Projeto primeiro'}</option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 ml-2">
          <span className="font-mono text-lg font-semibold text-foreground tabular-nums min-w-[80px] text-right">
            {formatDuration(elapsed)}
          </span>
          {running ? (
            <button
              onClick={stopTimer}
              className="w-11 h-11 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={startTimer}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-sm font-medium text-foreground transition-colors">
            <CalendarIcon className="w-4 h-4" />
            <span className="capitalize">{dateLabel()}</span>
          </button>
          <button onClick={() => navigateDate(1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-3 text-sm text-muted-foreground font-medium">
            TOTAL: <span className="text-foreground font-semibold">{formatDuration(totalFiltered)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="daily">Dia</option>
            <option value="weekly">Semana</option>
            <option value="monthly">Mês</option>
          </select>
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {([
              { key: 'calendar' as ViewMode, label: 'Calendário', icon: LayoutGrid },
              { key: 'list' as ViewMode, label: 'Lista', icon: List },
              { key: 'timesheet' as ViewMode, label: 'Timesheet', icon: Layers },
              { key: 'report' as ViewMode, label: 'Relatório', icon: BarChart3 },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {/* Calendar View (Weekly) */}
        {viewMode === 'calendar' && timeRange === 'weekly' && (
          <div className="h-full flex flex-col">
            {/* Day headers */}
            <div className="grid border-b border-border bg-card" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
              <div className="p-2 border-r border-border" />
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, new Date());
                const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
                const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
                return (
                  <div key={i} className={`px-2 py-2.5 text-center border-r last:border-r-0 border-border ${isToday ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-2xl font-bold ${isToday ? 'text-primary bg-primary/10 w-9 h-9 rounded-full flex items-center justify-center' : 'text-foreground'}`}>
                        {d.getDate()}
                      </span>
                      <div className="text-left">
                        <p className={`text-[10px] font-bold tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {DAY_NAMES_SHORT[i]}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(dayTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Time grid */}
            <div ref={calendarRef} className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
                {HOURS.map((hour) => (
                  <div key={hour} className="grid border-b border-border/30" style={{ gridTemplateColumns: '64px repeat(7, 1fr)', height: '60px' }}>
                    <div className="px-2 pt-1 text-[11px] text-muted-foreground text-right pr-3 border-r border-border">
                      {hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
                    </div>
                    {weekDays.map((d, di) => (
                      <div key={di} className="border-r last:border-r-0 border-border/30 relative hover:bg-muted/30 transition-colors" />
                    ))}
                  </div>
                ))}
                {/* Render time entries as blocks */}
                {weekDays.map((day, dayIdx) => {
                  const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), day));
                  return dayEntries.map((entry) => {
                    const start = new Date(entry.start_time);
                    const end = entry.end_time ? new Date(entry.end_time) : new Date();
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                    const durationMinutes = Math.max(endMinutes - startMinutes, 10);
                    const top = startMinutes;
                    const height = durationMinutes;
                    const colWidth = `calc((100% - 64px) / 7)`;
                    const left = `calc(64px + ${dayIdx} * ${colWidth})`;
                    const color = getProjectColor(entry.project_id);

                    return (
                      <button
                        key={entry.id}
                        onClick={() => openEdit(entry)}
                        className="absolute rounded-md px-1.5 py-0.5 text-[10px] text-white overflow-hidden cursor-pointer hover:brightness-110 transition-all shadow-sm group z-10"
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 18)}px`,
                          left,
                          width: `calc(${colWidth} - 4px)`,
                          marginLeft: '2px',
                          backgroundColor: color,
                        }}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {entry.description || getProjectName(entry.project_id) || '—'}
                          </span>
                        </div>
                        {height > 30 && (
                          <p className="text-white/70 truncate">{formatDurationShort(entry.duration || 0)}</p>
                        )}
                      </button>
                    );
                  });
                })}
                {/* Current time indicator */}
                {weekDays.some(d => isSameDay(d, new Date())) && (() => {
                  const now = new Date();
                  const todayIdx = weekDays.findIndex(d => isSameDay(d, now));
                  if (todayIdx === -1) return null;
                  const minutes = now.getHours() * 60 + now.getMinutes();
                  const colWidth = `calc((100% - 64px) / 7)`;
                  return (
                    <div
                      className="absolute pointer-events-none z-20"
                      style={{
                        top: `${minutes}px`,
                        left: `calc(64px + ${todayIdx} * ${colWidth})`,
                        width: colWidth,
                      }}
                    >
                      <div className="relative">
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-destructive" />
                        <div className="h-[2px] bg-destructive" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View (Daily) */}
        {viewMode === 'calendar' && timeRange === 'daily' && (
          <div className="h-full flex flex-col">
            <div ref={calendarRef} className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
                {HOURS.map((hour) => (
                  <div key={hour} className="grid border-b border-border/30" style={{ gridTemplateColumns: '64px 1fr', height: '60px' }}>
                    <div className="px-2 pt-1 text-[11px] text-muted-foreground text-right pr-3 border-r border-border">
                      {hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
                    </div>
                    <div className="relative hover:bg-muted/30 transition-colors" />
                  </div>
                ))}
                {filteredEntries.map((entry) => {
                  const start = new Date(entry.start_time);
                  const end = entry.end_time ? new Date(entry.end_time) : new Date();
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const endMinutes = end.getHours() * 60 + end.getMinutes();
                  const durationMinutes = Math.max(endMinutes - startMinutes, 10);
                  const color = getProjectColor(entry.project_id);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => openEdit(entry)}
                      className="absolute rounded-md px-2 py-1 text-xs text-white overflow-hidden cursor-pointer hover:brightness-110 transition-all shadow-sm z-10"
                      style={{
                        top: `${startMinutes}px`,
                        height: `${Math.max(durationMinutes, 20)}px`,
                        left: '68px',
                        width: 'calc(100% - 72px)',
                        backgroundColor: color,
                      }}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {entry.description || getProjectName(entry.project_id) || '—'}
                        </span>
                        <span className="ml-auto text-white/70">{formatDurationShort(entry.duration || 0)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View (Monthly) */}
        {viewMode === 'calendar' && timeRange === 'monthly' && (
          <div className="h-full overflow-y-auto scrollbar-thin bg-card">
            <div className="grid grid-cols-7 text-center border-b border-border">
              {DAY_NAMES_SHORT.map(d => (
                <div key={d} className="p-2.5 text-xs font-bold tracking-wider text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} className="p-2 min-h-[80px] border-b border-r border-border/30" />
              ))}
              {monthDays.map((d) => {
                const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), d));
                const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={d.getDate()}
                    onClick={() => { setSelectedDate(d); setTimeRange('daily'); }}
                    className={`p-2 min-h-[80px] border-b border-r border-border/30 text-left hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
                  >
                    <p className={`text-xs font-semibold ${isToday ? 'text-primary-foreground bg-primary w-6 h-6 rounded-full flex items-center justify-center' : 'text-foreground'}`}>
                      {d.getDate()}
                    </p>
                    {dayTotal > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{formatDuration(dayTotal)}</p>
                    )}
                    {dayEntries.length > 0 && (
                      <div className="mt-1 flex gap-0.5 flex-wrap">
                        {dayEntries.slice(0, 3).map((e, i) => (
                          <div
                            key={i}
                            className="h-1.5 rounded-full"
                            style={{ width: '16px', backgroundColor: getProjectColor(e.project_id) }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-1.5">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t.noEntries}</p>
                <p className="text-xs mt-1">Inicie o timer para registrar seu tempo</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getProjectColor(entry.project_id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.description || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {[getProjectName(entry.project_id), getTaskName(entry.task_id)].filter(Boolean).join(' · ') || 'Sem projeto'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground tabular-nums min-w-[70px] text-right">
                      {formatDuration(entry.duration || 0)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(entry)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => confirmDeleteEntry(entry.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Timesheet View */}
        {viewMode === 'timesheet' && (
          <div className="h-full overflow-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Descrição</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Projeto</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Tarefa</th>
                  {timeRange === 'weekly' && weekDays.map((d, i) => {
                    const isToday = isSameDay(d, new Date());
                    return (
                      <th key={i} className={`text-center px-2 py-3 font-semibold min-w-[70px] ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        <span className="text-[10px] block tracking-wider text-muted-foreground">{DAY_NAMES_SHORT[i]}</span>
                        <span>{d.getDate()}</span>
                      </th>
                    );
                  })}
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Total</th>
                  <th className="px-2 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={timeRange === 'weekly' ? 11 : 6} className="text-center py-12 text-muted-foreground text-sm">
                      {t.noEntries}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getProjectColor(entry.project_id) }} />
                          <span className="truncate max-w-[180px]">{entry.description || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{getProjectName(entry.project_id) || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{getTaskName(entry.task_id) || '—'}</td>
                      {timeRange === 'weekly' && weekDays.map((d, i) => {
                        const isEntryDay = isSameDay(new Date(entry.start_time), d);
                        return (
                          <td key={i} className="text-center px-2 py-3 tabular-nums text-xs">
                            {isEntryDay ? formatDuration(entry.duration || 0) : ''}
                          </td>
                        );
                      })}
                      <td className="text-center px-4 py-3 font-mono font-semibold tabular-nums">
                        {formatDuration(entry.duration || 0)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(entry)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => confirmDeleteEntry(entry.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredEntries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={timeRange === 'weekly' ? 3 : 3} className="px-4 py-3 font-semibold text-foreground">Total</td>
                    {timeRange === 'weekly' && weekDays.map((d, i) => {
                      const dayEntries = filteredEntries.filter(e => isSameDay(new Date(e.start_time), d));
                      const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
                      return (
                        <td key={i} className="text-center px-2 py-3 font-mono font-semibold text-xs tabular-nums">
                          {dayTotal > 0 ? formatDuration(dayTotal) : ''}
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-3 font-mono font-bold text-foreground tabular-nums">
                      {formatDuration(totalFiltered)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Report View */}
        {viewMode === 'report' && (() => {
          const CHART_COLORS = ['hsl(280, 70%, 60%)', 'hsl(200, 80%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(35, 90%, 55%)', 'hsl(340, 75%, 55%)', 'hsl(180, 60%, 45%)', 'hsl(60, 70%, 50%)', 'hsl(310, 60%, 55%)'];

          const byProject = filteredEntries.reduce<Record<string, number>>((acc, e) => {
            const name = getProjectName(e.project_id) || 'Sem projeto';
            acc[name] = (acc[name] || 0) + (e.duration || 0);
            return acc;
          }, {});
          const projectData = Object.entries(byProject).map(([name, seconds]) => ({
            name, hours: +(seconds / 3600).toFixed(2), color: getProjectColor(filteredEntries.find(e => (getProjectName(e.project_id) || 'Sem projeto') === name)?.project_id || null),
          }));

          const byClient = filteredEntries.reduce<Record<string, number>>((acc, e) => {
            const proj = projects.find(p => p.id === e.project_id);
            const client = proj?.client_id ? clients.find(c => c.id === proj.client_id) : null;
            const name = client?.name || 'Sem cliente';
            acc[name] = (acc[name] || 0) + (e.duration || 0);
            return acc;
          }, {});
          const clientData = Object.entries(byClient).map(([name, seconds], i) => ({
            name, hours: +(seconds / 3600).toFixed(2), color: (() => {
              const client = clients.find(c => c.name === name);
              return (client as any)?.color || CHART_COLORS[i % CHART_COLORS.length];
            })(),
          }));

          const byDay = filteredEntries.reduce<Record<string, number>>((acc, e) => {
            const d = new Date(e.start_time);
            const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            acc[key] = (acc[key] || 0) + (e.duration || 0);
            return acc;
          }, {});
          const dayData = Object.entries(byDay)
            .map(([day, seconds]) => ({ day, hours: +(seconds / 3600).toFixed(2) }))
            .sort((a, b) => a.day.localeCompare(b.day));

          const totalHours = (totalFiltered / 3600).toFixed(1);


          const handleExportPDF = async () => {
            const { default: jsPDF } = await import('jspdf');

            // Fetch user profile
            let userName = '';
            if (user) {
              const { data: profile } = await supabase.from('profiles').select('name, email').eq('user_id', user.id).maybeSingle();
              userName = profile?.name || profile?.email || user.email || '';
            }

            // Use all entries when custom dates are set, otherwise use filtered by period
            let exportEntries = (exportStartDate || exportEndDate) ? [...entries] : [...filteredEntries];
            if (exportFilter === 'client' && exportClientId) {
              const clientProjectIds = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
              exportEntries = exportEntries.filter(e => e.project_id && clientProjectIds.includes(e.project_id));
            } else if (exportFilter === 'project' && exportProjectId) {
              exportEntries = exportEntries.filter(e => e.project_id === exportProjectId);
            }
            if (exportStartDate) {
              exportEntries = exportEntries.filter(e => new Date(e.start_time) >= new Date(exportStartDate + 'T00:00:00'));
            }
            if (exportEndDate) {
              exportEntries = exportEntries.filter(e => new Date(e.start_time) <= new Date(exportEndDate + 'T23:59:59'));
            }

            if (exportEntries.length === 0) {
              toast.error('Nenhum registro encontrado para os filtros selecionados');
              return;
            }

            const exportTotal = exportEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
            const exportTotalHours = (exportTotal / 3600).toFixed(1);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;

            const checkPageBreak = (needed: number) => {
              if (y + needed > 275) { doc.addPage(); y = 20; }
            };

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório de Tempo', 14, y); y += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            if (userName) { doc.text(`Responsável: ${userName}`, 14, y); y += 5; }
            const periodLabel = exportStartDate && exportEndDate
              ? `Período: ${new Date(exportStartDate).toLocaleDateString('pt-BR')} a ${new Date(exportEndDate).toLocaleDateString('pt-BR')}`
              : `Período: ${dateLabel()}`;
            doc.text(periodLabel, 14, y); y += 5;
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 14, y); y += 8;
            doc.setTextColor(0, 0, 0);

            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y); y += 8;

            // Client info if filtering by client
            if (exportFilter === 'client' && exportClientId) {
              const client = clients.find(c => c.id === exportClientId);
              if (client) {
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text('Cliente', 14, y); y += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Nome: ${client.name}`, 18, y); y += 5;
                if (client.email) { doc.text(`Email: ${client.email}`, 18, y); y += 5; }
                if (client.phone) { doc.text(`Telefone: ${client.phone}`, 18, y); y += 5; }
                if (client.document) { doc.text(`Documento: ${client.document}`, 18, y); y += 5; }
                y += 4;
              }
            }

            // Project info if filtering by project
            if (exportFilter === 'project' && exportProjectId) {
              const proj = projects.find(p => p.id === exportProjectId);
              if (proj) {
                const projClient = proj.client_id ? clients.find(c => c.id === proj.client_id) : null;
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text('Projeto', 14, y); y += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Nome: ${proj.name}`, 18, y); y += 5;
                if (projClient) {
                  doc.text(`Cliente: ${projClient.name}`, 18, y); y += 5;
                  if (projClient.email) { doc.text(`Email: ${projClient.email}`, 18, y); y += 5; }
                  if (projClient.phone) { doc.text(`Telefone: ${projClient.phone}`, 18, y); y += 5; }
                }
                y += 4;
              }
            }

            // Summary
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumo', 14, y); y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total de horas: ${exportTotalHours}h`, 18, y); y += 5;
            doc.text(`Total de registros: ${exportEntries.length}`, 18, y); y += 10;

            // Detailed task listing
            checkPageBreak(30);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Detalhamento', 14, y); y += 8;

            // Table header
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(245, 245, 245);
            doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
            doc.text('Data', 16, y);
            doc.text('Descrição / Tarefa', 42, y);
            doc.text('Projeto', 115, y);
            doc.text('Início', 152, y);
            doc.text('Fim', 170, y);
            doc.text('Duração', 186, y);
            y += 8;

            doc.setFont('helvetica', 'normal');
            exportEntries
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .forEach((entry) => {
                checkPageBreak(8);
                const d = new Date(entry.start_time);
                const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const desc = entry.description || getTaskName(entry.task_id) || '—';
                const projName = getProjectName(entry.project_id) || '—';
                const startStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const endStr = entry.end_time ? new Date(entry.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
                const durStr = entry.duration ? formatDurationShort(entry.duration) : '—';

                doc.setFontSize(9);
                doc.text(dateStr, 16, y);
                const descTruncated = desc.length > 40 ? desc.substring(0, 37) + '...' : desc;
                doc.text(descTruncated, 42, y);
                const projTruncated = projName.length > 20 ? projName.substring(0, 17) + '...' : projName;
                doc.text(projTruncated, 115, y);
                doc.text(startStr, 152, y);
                doc.text(endStr, 170, y);
                doc.text(durStr, 186, y);
                y += 6;

                // light separator
                doc.setDrawColor(230, 230, 230);
                doc.line(14, y - 2, pageWidth - 14, y - 2);
              });

            // Footer total
            checkPageBreak(12);
            y += 4;
            doc.setDrawColor(100, 100, 100);
            doc.line(14, y - 2, pageWidth - 14, y - 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Total: ${exportTotalHours}h (${exportEntries.length} registros)`, 16, y + 3);

            doc.save(`relatorio-tempo-${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF exportado com sucesso!');
            setShowExportPanel(false);
          };


          return (
            <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Relatório de Tempo</h2>
                  <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalHours}h</span> · {filteredEntries.length} registros</p>
                </div>
                <button
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportPanel ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showExportPanel && (() => {
                const expFilteredProjects = exportClientId
                  ? projects.filter(p => p.client_id === exportClientId)
                  : projects;

                // Live preview of what will be exported
                let previewEntries = (exportStartDate || exportEndDate) ? [...entries] : [...filteredEntries];
                if (exportFilter === 'client' && exportClientId) {
                  const ids = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
                  previewEntries = previewEntries.filter(e => e.project_id && ids.includes(e.project_id));
                } else if (exportFilter === 'project' && exportProjectId) {
                  previewEntries = previewEntries.filter(e => e.project_id === exportProjectId);
                }
                if (exportStartDate) previewEntries = previewEntries.filter(e => new Date(e.start_time) >= new Date(exportStartDate + 'T00:00:00'));
                if (exportEndDate) previewEntries = previewEntries.filter(e => new Date(e.start_time) <= new Date(exportEndDate + 'T23:59:59'));
                const previewTotal = previewEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
                const previewHours = (previewTotal / 3600).toFixed(1);

                const selectedClient = exportClientId ? clients.find(c => c.id === exportClientId) : null;
                const selectedProject = exportProjectId ? projects.find(p => p.id === exportProjectId) : null;

                const filterTypes = [
                  { value: 'all' as const, label: 'Tudo', icon: <Layers className="w-3.5 h-3.5" /> },
                  { value: 'client' as const, label: 'Cliente', icon: <span className="w-3.5 h-3.5 rounded-full border-2 border-current" /> },
                  { value: 'project' as const, label: 'Projeto', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                ];

                return (
                  <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
                    {/* Header with live stats */}
                    <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Download className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Configurar Exportação</h3>
                          <p className="text-xs text-muted-foreground">Selecione os filtros e gere o relatório</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-lg font-bold text-foreground tabular-nums">{previewHours}h</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{previewEntries.length} registros</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Filter type toggle */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de filtro</label>
                        <div className="flex gap-2">
                          {filterTypes.map((ft) => (
                            <button
                              key={ft.value}
                              onClick={() => { setExportFilter(ft.value); setExportClientId(''); setExportProjectId(''); }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                exportFilter === ft.value
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {ft.icon}
                              {ft.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic filter fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(exportFilter === 'client' || exportFilter === 'project') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                            <CompactClientSelect
                              clients={clients}
                              value={exportClientId}
                              onChange={(v) => { setExportClientId(v); setExportProjectId(''); }}
                              placeholder={exportFilter === 'client' ? 'Selecione o cliente' : 'Filtrar por cliente'}
                              fullWidth
                            />
                          </div>
                        )}

                        {exportFilter === 'project' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Projeto</label>
                            <select
                              value={exportProjectId}
                              onChange={(e) => setExportProjectId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Todos os projetos</option>
                              {expFilteredProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Data início</label>
                          <input
                            type="date"
                            value={exportStartDate}
                            onChange={(e) => setExportStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Data fim</label>
                          <input
                            type="date"
                            value={exportEndDate}
                            onChange={(e) => setExportEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      {/* Active filters badges */}
                      {(exportFilter !== 'all' || exportStartDate || exportEndDate) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                          {exportFilter !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {exportFilter === 'client' ? 'Cliente' : 'Projeto'}
                              {selectedClient && `: ${selectedClient.name}`}
                              {selectedProject && `: ${selectedProject.name}`}
                            </span>
                          )}
                          {exportStartDate && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                              De: {new Date(exportStartDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {exportEndDate && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                              Até: {new Date(exportEndDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <button
                            onClick={() => { setExportFilter('all'); setExportClientId(''); setExportProjectId(''); setExportStartDate(''); setExportEndDate(''); }}
                            className="text-xs text-destructive hover:underline"
                          >
                            Limpar tudo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {previewEntries.length === 0
                          ? 'Nenhum registro encontrado para os filtros'
                          : `${previewEntries.length} registros serão exportados`}
                      </p>
                      <button
                        onClick={handleExportPDF}
                        disabled={previewEntries.length === 0}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Gerar PDF
                      </button>
                    </div>
                  </div>
                );
              })()}

              {filteredEntries.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sem dados para o período selecionado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Horas por Projeto</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={projectData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="h" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}h`, 'Horas']}
                        />
                        <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                          {projectData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Horas por Cliente</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={clientData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, hours }) => `${name} (${hours}h)`} labelLine={false} style={{ fontSize: '11px' }}>
                          {clientData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}h`, 'Horas']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Horas por Dia</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="h" />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}h`, 'Horas']}
                        />
                        <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Resumo Detalhado</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium w-8"></th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Projeto</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Cliente</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Registros</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Horas</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.sort((a, b) => b.hours - a.hours).map((p, i) => {
                          const projEntries = filteredEntries
                            .filter(e => (getProjectName(e.project_id) || 'Sem projeto') === p.name)
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                          const proj = projects.find(pr => pr.name === p.name);
                          const client = proj?.client_id ? clients.find(c => c.id === proj.client_id) : null;
                          const pct = +totalHours > 0 ? ((p.hours / (+totalHours)) * 100).toFixed(1) : '0';
                          const isExpanded = !collapsedProjects.has(p.name);
                          const toggleExpand = () => {
                            setCollapsedProjects(prev => {
                              const next = new Set(prev);
                              if (next.has(p.name)) next.delete(p.name);
                              else next.add(p.name);
                              return next;
                            });
                          };
                          return (
                            <React.Fragment key={i}>
                              <tr
                                onClick={toggleExpand}
                                className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                              >
                                <td className="py-2.5 px-3">
                                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="font-medium text-foreground">{p.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">{client?.name || '—'}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{projEntries.length}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">{p.hours}h</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{pct}%</td>
                              </tr>
                              {isExpanded && projEntries.map((entry) => {
                                const d = new Date(entry.start_time);
                                const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
                                const startStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                const endStr = entry.end_time ? new Date(entry.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
                                const desc = entry.description || getTaskName(entry.task_id) || 'Sem descrição';
                                const dur = entry.duration ? formatDurationShort(entry.duration) : '—';
                                return (
                                  <tr key={entry.id} className="border-b border-border/10 bg-muted/10 hover:bg-muted/30 transition-colors">
                                    <td className="py-2 px-3"></td>
                                    <td className="py-2 px-3" colSpan={2}>
                                      <div className="flex items-center gap-2 pl-4">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        <span className="text-foreground text-xs">{desc}</span>
                                        <span className="text-muted-foreground text-[10px]">· {dateStr}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-right text-xs tabular-nums text-muted-foreground">{startStr} – {endStr}</td>
                                    <td className="py-2 px-3 text-right text-xs tabular-nums font-medium text-foreground">{dur}</td>
                                    <td className="py-2 px-3"></td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td className="py-2.5 px-3"></td>
                          <td colSpan={2} className="py-2.5 px-3 font-semibold text-foreground">Total</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">{filteredEntries.length}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">{totalHours}h</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

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
            <CompactClientSelect clients={clients} value={editClientId} onChange={(v) => { setEditClientId(v); setEditProjectId(''); setEditTaskId(''); }} placeholder="Cliente" fullWidth />
            <select
              value={editProjectId}
              onChange={(e) => { setEditProjectId(e.target.value); setEditTaskId(''); }}
              disabled={!editClientId}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{editClientId ? t.project : 'Selecione um cliente primeiro'}</option>
              {editFilteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={editTaskId}
              onChange={(e) => setEditTaskId(e.target.value)}
              disabled={!editProjectId}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{editProjectId ? 'Selecione a tarefa' : 'Selecione um projeto primeiro'}</option>
              {editFilteredTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
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
              <button
                onClick={() => {
                  if (editingEntry) {
                    setEditingEntry(null);
                    confirmDeleteEntry(editingEntry.id);
                  }
                }}
                className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t.deleteEntry}
              </button>
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
              <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de tempo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimeTrackingPage;
