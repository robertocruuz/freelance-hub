import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, Square, Pencil, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Layers, List, LayoutGrid, ChevronDown, BarChart3, Download, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import { loadImageAsBase64, buildOrgAddress, sanitizeText } from '@/lib/pdfGenerator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
}

interface ProfileInfo {
  user_id: string;
  name: string | null;
  email: string | null;
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
  const timer = useTimer();
  const { running, startTime, elapsed, description, clientId, projectId, taskId, setDescription, setClientId, setProjectId, setTaskId, startTimer, stopTimer: globalStopTimer, lastSavedTime } = timer;
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
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
  const prefillApplied = useRef(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarSettingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarSettingsRef.current && !calendarSettingsRef.current.contains(e.target as Node)) {
        setShowCalendarSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFilter, setExportFilter] = useState<'all' | 'client' | 'project'>('all');
  const [exportClientId, setExportClientId] = useState('');
  const [exportProjectId, setExportProjectId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [reportUserFilter, setReportUserFilter] = useState<string>('me');
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [workHourStart, setWorkHourStart] = useState(() => {
    const saved = localStorage.getItem('tt_work_hour_start');
    return saved ? parseInt(saved) : 0;
  });
  const [workHourEnd, setWorkHourEnd] = useState(() => {
    const saved = localStorage.getItem('tt_work_hour_end');
    return saved ? parseInt(saved) : 24;
  });

  useEffect(() => {
    localStorage.setItem('tt_work_hour_start', String(workHourStart));
    localStorage.setItem('tt_work_hour_end', String(workHourEnd));
  }, [workHourStart, workHourEnd]);

  const visibleHours = useMemo(() =>
    HOURS.filter(h => h >= workHourStart && h < workHourEnd),
    [workHourStart, workHourEnd]
  );

  // Drag state for calendar entries
  const [dragState, setDragState] = useState<{
    entryId: string;
    type: 'move' | 'resize';
    initialMouseY: number;
    initialStartMin: number;
    initialEndMin: number;
    currentStartMin: number;
    currentEndMin: number;
    dayDate: Date;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const didDragRef = useRef(false);

  const handleDragStart = (e: React.MouseEvent, entryId: string, type: 'move' | 'resize', startMin: number, endMin: number, dayDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
    const state = {
      entryId,
      type,
      initialMouseY: e.clientY,
      initialStartMin: startMin,
      initialEndMin: endMin,
      currentStartMin: startMin,
      currentEndMin: endMin,
      dayDate,
    };
    setDragState(state);
    dragStateRef.current = state;
  };

  // Create-drag state for new entries from empty space
  const [createDrag, setCreateDrag] = useState<{
    dayDate: Date;
    startMin: number;
    currentMin: number;
    gridTop: number;
  } | null>(null);
  const createDragRef = useRef(createDrag);
  createDragRef.current = createDrag;

  const [createModalData, setCreateModalData] = useState<{
    dayDate: Date;
    startMin: number;
    endMin: number;
  } | null>(null);
  const [createDesc, setCreateDesc] = useState('');
  const [createClientId, setCreateClientId] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createTaskId, setCreateTaskId] = useState('');

  const handleGridMouseDown = (e: React.MouseEvent, dayDate: Date, gridEl: HTMLDivElement) => {
    if (dragState) return;
    const rect = gridEl.getBoundingClientRect();
    const y = e.clientY - rect.top + gridEl.scrollTop;
    const minute = Math.round(y / 5) * 5 + workHourStart * 60;
    setCreateDrag({ dayDate, startMin: minute, currentMin: minute, gridTop: rect.top - gridEl.scrollTop });
    createDragRef.current = { dayDate, startMin: minute, currentMin: minute, gridTop: rect.top - gridEl.scrollTop };
  };

  useEffect(() => {
    if (!createDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cd = createDragRef.current;
      if (!cd || !calendarRef.current) return;
      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top + calendarRef.current.scrollTop;
      const minute = Math.max(workHourStart * 60, Math.min(workHourEnd * 60, Math.round(y / 5) * 5 + workHourStart * 60));
      const next = { ...cd, currentMin: minute };
      setCreateDrag(next);
      createDragRef.current = next;
    };

    const handleMouseUp = () => {
      const cd = createDragRef.current;
      setCreateDrag(null);
      createDragRef.current = null;
      if (!cd) return;

      const s = Math.min(cd.startMin, cd.currentMin);
      const e = Math.max(cd.startMin, cd.currentMin);
      if (e - s < 5) return; // too small, ignore

      setCreateModalData({ dayDate: cd.dayDate, startMin: s, endMin: e });
      setCreateDesc('');
      setCreateClientId('');
      setCreateProjectId('');
      setCreateTaskId('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [createDrag]);

  const createFilteredProjects = createClientId
    ? projects.filter(p => p.client_id === createClientId)
    : projects;

  const createFilteredTasks = createProjectId
    ? kanbanTasks.filter(t => t.project_id === createProjectId)
    : kanbanTasks;

  const saveCreate = async () => {
    if (!createModalData || !user) return;
    const { dayDate, startMin, endMin } = createModalData;
    const newStart = new Date(dayDate);
    newStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    const newEnd = new Date(dayDate);
    newEnd.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    const duration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);

    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      description: createDesc || null,
      client_id: createClientId || null,
      project_id: createProjectId || null,
      task_id: createTaskId || null,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
      duration,
    } as any);

    if (error) toast.error(error.message);
    else {
      toast.success('Registro criado');
      setCreateModalData(null);
      loadEntries();
    }
  };

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('user_id, name, email');
    if (data) setProfiles(data as ProfileInfo[]);
  }, []);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }, [user]);

  const loadKanbanTasks = useCallback(async () => {
    if (!user) return;
    
    // Fetch all accessible tasks (own, shared boards, individually shared)
    // RLS handles the permissions
    const { data: allAccessibleTasks, error } = await supabase
      .from('tasks')
      .select('id, title, project_id, column_id')
      .not('column_id', 'is', null)
      .neq('status', 'done');

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    const tasks = allAccessibleTasks || [];
    // Sort tasks by title
    tasks.sort((a, b) => a.title.localeCompare(b.title));
    
    setKanbanTasks(tasks);
  }, [user]);

  const loadEntries = useCallback(async () => {
    if (!user) return;

    // Fetch entries for the currently selected period.
    // This avoids missing records when the period contains more than the previously fetched fixed limit.
    const computeRange = () => {
      if (timeRange === 'daily') {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      }

      if (timeRange === 'weekly') {
        const start = new Date(selectedDate);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday start
        start.setDate(start.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
      }

      // monthly
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
      return { start, end };
    };

    const { start, end } = computeRange();
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const PAGE_SIZE = 1000;
    const HARD_CAP = 10000; // safety cap
    const all: TimeEntry[] = [];

    for (let from = 0; from < HARD_CAP; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .gte('start_time', startIso)
        .lt('start_time', endIso)
        .order('start_time', { ascending: false })
        .range(from, to);

      if (error) {
        toast.error(error.message);
        break;
      }

      const batch = (data || []) as TimeEntry[];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    setEntries(all);
  }, [user, timeRange, selectedDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  // Reload entries when the timer finishes saving to the DB
  useEffect(() => {
    if (lastSavedTime > 0) {
      loadEntries();
    }
  }, [lastSavedTime, loadEntries]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadKanbanTasks(); }, [loadKanbanTasks]);
  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const getProfileName = useCallback((userId: string) => {
    if (userId === user?.id) {
      const myProfile = profiles.find(p => p.user_id === userId);
      return myProfile?.name || 'Eu';
    }
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.name || profile?.email || 'Desconhecido';
  }, [profiles, user]);

  // Drag effect — must be after loadEntries is declared
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const deltaY = e.clientY - ds.initialMouseY;
      const deltaMin = Math.round(deltaY / 5) * 5;
      if (deltaMin !== 0) didDragRef.current = true;

      if (ds.type === 'move') {
        const newStart = Math.max(0, ds.initialStartMin + deltaMin);
        const duration = ds.initialEndMin - ds.initialStartMin;
        const newEnd = Math.min(24 * 60, newStart + duration);
        const adjustedStart = newEnd === 24 * 60 ? newEnd - duration : newStart;
        const next = { ...ds, currentStartMin: adjustedStart, currentEndMin: adjustedStart + duration };
        setDragState(next);
        dragStateRef.current = next;
      } else {
        const newEnd = Math.max(ds.initialStartMin + 5, Math.min(24 * 60, ds.initialEndMin + deltaMin));
        const next = { ...ds, currentEndMin: newEnd };
        setDragState(next);
        dragStateRef.current = next;
      }
    };

    const handleMouseUp = async () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      setDragState(null);
      dragStateRef.current = null;

      if (ds.currentStartMin === ds.initialStartMin && ds.currentEndMin === ds.initialEndMin) return;

      const entry = entries.find(en => en.id === ds.entryId);
      if (!entry) return;

      const baseDate = new Date(ds.dayDate);
      const newStart = new Date(baseDate);
      newStart.setHours(Math.floor(ds.currentStartMin / 60), ds.currentStartMin % 60, 0, 0);
      const newEnd = new Date(baseDate);
      newEnd.setHours(Math.floor(ds.currentEndMin / 60), ds.currentEndMin % 60, 0, 0);
      const duration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);

      const { error } = await supabase.from('time_entries').update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        duration,
      } as any).eq('id', ds.entryId);

      if (error) toast.error(error.message);
      else {
        toast.success('Registro atualizado');
        loadEntries();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, entries, loadEntries]);

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
      startTimer();
      setSearchParams({}, { replace: true });
      toast.success('Timer iniciado a partir da tarefa!');
    }
  }, [searchParams, setSearchParams]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (calendarRef.current) {
      const currentHour = new Date().getHours();
      const scrollTarget = Math.max(0, (currentHour - workHourStart - 2) * 60);
      calendarRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode]);

  const stopTimer = async () => {
    await globalStopTimer();
    loadEntries();
  };

  const confirmDeleteEntry = (id: string) => {
    setDeletingEntryId(id);
  };

  const deleteEntry = async () => {
    const idToDelete = deletingEntryId;
    console.log('[DELETE] deleteEntry called, deletingEntryId:', idToDelete);
    if (!idToDelete) {
      console.log('[DELETE] No deletingEntryId, returning early');
      return;
    }
    setDeletingEntryId(null);
    const { error, count } = await supabase.from('time_entries').delete().eq('id', idToDelete);
    console.log('[DELETE] Supabase response - error:', error, 'count:', count);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Registro excluído com sucesso');
      loadEntries();
    }
  };

  const openEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDesc(entry.description || '');
    const entryProject = projects.find(p => p.id === entry.project_id);
    setEditClientId(entry.client_id || entryProject?.client_id || '');
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
      client_id: editClientId || null,
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

  // Filtered entries — calendar/list/timesheet show only current user; report shows all (including shared)
  const filteredEntries = entries.filter((e) => {
    // For non-report views, show only the current user's entries
    if (viewMode !== 'report' && e.user_id !== user?.id) return false;
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

  // Get color for entry — uses direct client color first, then project's client, then fallback
  const getProjectColor = (pid: string | null, directClientId?: string | null) => {
    // Priority 1: direct client_id on the entry
    if (directClientId) {
      const directClient = clients.find(c => c.id === directClientId);
      if ((directClient as any)?.color) return (directClient as any).color;
    }
    // Priority 2: client from project
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
      'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(346, 87%, 60%)',
      'hsl(43, 96%, 56%)', 'hsl(283, 39%, 53%)', 'hsl(199, 89%, 48%)',
    ];
    return colors[idx % colors.length];
  };

  // Compute overlap layout for calendar entries (side-by-side when overlapping)
  const computeOverlapLayout = (dayEntries: TimeEntry[]) => {
    const items = dayEntries.map(entry => {
      const start = new Date(entry.start_time);
      const end = entry.end_time ? new Date(entry.end_time) : new Date();
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = Math.max(end.getHours() * 60 + end.getMinutes(), startMin + 10);
      return { entry, startMin, endMin, col: 0, totalCols: 1 };
    }).sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

    // Greedy column assignment
    const columns: { endMin: number }[][] = [];
    for (const item of items) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c].every(prev => prev.endMin <= item.startMin)) {
          item.col = c;
          columns[c].push({ endMin: item.endMin });
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.col = columns.length;
        columns.push([{ endMin: item.endMin }]);
      }
    }

    // Compute total columns for each overlapping group
    const totalCols = columns.length;
    for (const item of items) {
      item.totalCols = totalCols;
    }

    // More precise: find actual max overlap per group
    // Group items that transitively overlap
    const groups: typeof items[] = [];
    const visited = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      if (visited.has(i)) continue;
      const group = [items[i]];
      visited.add(i);
      const stack = [i];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (let j = 0; j < items.length; j++) {
          if (visited.has(j)) continue;
          if (items[cur].startMin < items[j].endMin && items[j].startMin < items[cur].endMin) {
            visited.add(j);
            group.push(items[j]);
            stack.push(j);
          }
        }
      }
      groups.push(group);
    }
    for (const group of groups) {
      const maxCol = Math.max(...group.map(it => it.col)) + 1;
      for (const it of group) it.totalCols = maxCol;
    }

    return items;
  };


  const [showSuggestions, setShowSuggestions] = useState(false);
  const descInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const recentDescriptions = useMemo(() => {
    const seen = new Set<string>();
    const results: { label: string; source: 'recent' | 'task'; projectId?: string | null; clientId?: string | null; taskId?: string | null }[] = [];
    
    // First priorities to Kanban tasks
    for (const t of kanbanTasks) {
      if (!seen.has(t.title.toLowerCase())) {
        seen.add(t.title.toLowerCase());
        results.push({ label: t.title, source: 'task', projectId: t.project_id, taskId: t.id });
      }
    }

    // Recent entries (unique descriptions)
    for (const e of [...entries].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())) {
      const desc = e.description?.trim();
      if (desc && !seen.has(desc.toLowerCase())) {
        seen.add(desc.toLowerCase());
        results.push({ label: desc, source: 'recent', projectId: e.project_id, clientId: e.client_id, taskId: e.task_id });
      }
      if (results.length >= 25) break;
    }
    
    return results;
  }, [entries, kanbanTasks]);

  const filteredSuggestions = useMemo(() => {
    if (!description.trim()) return recentDescriptions.slice(0, 8);
    const q = description.toLowerCase();
    return recentDescriptions.filter(s => s.label.toLowerCase().includes(q)).slice(0, 8);
  }, [description, recentDescriptions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        descInputRef.current && !descInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applySuggestion = (s: typeof recentDescriptions[0]) => {
    setDescription(s.label);
    
    let newClientId = s.clientId || '';
    let newProjectId = s.projectId || '';
    let newTaskId = s.taskId || '';

    // If suggestion has a project but no client, deduce client from project
    if (!newClientId && newProjectId) {
      const proj = projects.find(p => p.id === newProjectId);
      if (proj?.client_id) {
        newClientId = proj.client_id;
      }
    }

    setClientId(newClientId);
    setProjectId(newProjectId);
    setTaskId(newTaskId);
    setShowSuggestions(false);
  };

  return (
    <div className={cn(
      "w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-3 animate-fade-in",
      viewMode === 'report' ? "min-h-full" : "h-full min-h-0"
    )}>
      {/* Page Header */}
      <div className="flex flex-col gap-3 mb-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[2.3rem] font-extrabold text-foreground tracking-tight leading-none">Cronômetro</h1>
            <p className="text-sm text-muted-foreground">Gerencie seu tempo gasto em tarefas, projetos e clientes. Gere relatórios e exporte em pdf.</p>
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="rounded-xl border border-border bg-card shadow-sm flex-shrink-0 relative z-40">
        {/* Timer bar - Toggl style */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <div className="relative flex-1 min-w-[150px]">
          <input
            ref={descInputRef}
            placeholder="No que você está trabalhando?"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full px-3 py-2 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 top-full mt-1 w-full max-w-md z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
            >
              {!description.trim() && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  Recentes
                </div>
              )}
              {filteredSuggestions.map((s, i) => {
                const proj = s.projectId ? projects.find(p => p.id === s.projectId) : null;
                const cl = s.clientId ? clients.find(c => c.id === s.clientId) : (proj?.client_id ? clients.find(c => c.id === proj.client_id) : null);
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">{s.label}</span>
                      {(proj || cl) && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {[proj?.name, cl?.name].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    {s.source === 'task' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">tarefa</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
        <div className="flex items-center justify-between px-4 py-2.5">
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
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {([['daily', 'Dia'], ['weekly', 'Semana'], ['monthly', 'Mês']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  timeRange === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
          {/* Calendar settings gear */}
          <div className="relative" ref={calendarSettingsRef}>
            <button
              onClick={() => setShowCalendarSettings(!showCalendarSettings)}
              className={`p-1.5 rounded-md transition-colors ${showCalendarSettings ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              title="Configurações do calendário"
            >
              <Settings className="w-4 h-4" />
            </button>
            {showCalendarSettings && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-border bg-popover shadow-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Horário de trabalho</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Início</label>
                    <select
                      value={workHourStart}
                      onChange={(e) => setWorkHourStart(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Fim</label>
                    <select
                      value={workHourEnd}
                      onChange={(e) => setWorkHourEnd(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).filter(i => i > workHourStart).map(i => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => { setWorkHourStart(0); setWorkHourEnd(24); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mostrar todas as horas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Main content area */}
      <div className={cn(
        "transition-all flex-1 min-h-0",
        viewMode === 'report' ? "" : "rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      )}>
        {/* Calendar View (Weekly) */}
        {viewMode === 'calendar' && timeRange === 'weekly' && (
          <div className="h-full flex flex-col">
            {/* Day headers */}
            <div className="grid border-b border-border bg-card rounded-t-xl overflow-hidden" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
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
            <div ref={calendarRef} className="flex-1"
              onMouseDown={(e) => {
                // Only trigger on empty space (not on entry blocks)
                const target = e.target as HTMLElement;
                if (target.closest('[data-entry-block]')) return;
                if (!calendarRef.current) return;
                // Determine which day column was clicked
                const rect = calendarRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const colStart = 64;
                const colW = (rect.width - colStart) / 7;
                const dayIdx = Math.floor((x - colStart) / colW);
                if (dayIdx < 0 || dayIdx >= 7) return;
                handleGridMouseDown(e, weekDays[dayIdx], calendarRef.current);
              }}
            >
              <div className="relative overflow-hidden" style={{ minHeight: `${visibleHours.length * 60}px` }}>
                {visibleHours.map((hour) => (
                  <div key={hour} className="grid border-b border-border/30" style={{ gridTemplateColumns: '64px repeat(7, 1fr)', height: '60px' }}>
                    <div className="px-2 pt-1 text-[11px] text-muted-foreground text-right pr-3 border-r border-border">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>
                    {weekDays.map((d, di) => (
                      <div key={di} className="border-r last:border-r-0 border-border/30 relative hover:bg-muted/30 transition-colors" />
                    ))}
                  </div>
                ))}
                {/* Render time entries as blocks */}
                {weekDays.map((day, dayIdx) => {
                  const dayEntries = entries.filter(e => isSameDay(new Date(e.start_time), day));
                  const layoutItems = computeOverlapLayout(dayEntries);
                  const colWidth = `calc((100% - 64px) / 7)`;
                  return layoutItems.map((item) => {
                    const { entry, startMin, endMin, col, totalCols } = item;
                    const isDragging = dragState?.entryId === entry.id;
                    const displayStart = isDragging ? dragState.currentStartMin : startMin;
                    const displayEnd = isDragging ? dragState.currentEndMin : endMin;
                    const durationMinutes = displayEnd - displayStart;
                    const color = getProjectColor(entry.project_id, entry.client_id);
                    const entryWidth = `calc((${colWidth} - 4px) / ${totalCols})`;
                    const entryLeft = `calc(64px + ${dayIdx} * ${colWidth} + 2px + ${col} * (${colWidth} - 4px) / ${totalCols})`;

                    return (
                      <div
                        key={entry.id}
                        data-entry-block
                        className={`absolute rounded-md text-[10px] text-white overflow-hidden shadow-sm z-10 select-none ${isDragging ? 'opacity-80 ring-2 ring-white/50 z-30' : 'hover:brightness-110'}`}
                        style={{
                          top: `${displayStart - workHourStart * 60}px`,
                          height: `${Math.max(durationMinutes, 18)}px`,
                          left: entryLeft,
                          width: entryWidth,
                          backgroundColor: color,
                          cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                        onMouseDown={(e) => handleDragStart(e, entry.id, 'move', startMin, endMin, day)}
                        onClick={() => { if (!didDragRef.current) openEdit(entry); }}
                      >
                        <div className="flex items-center gap-1 truncate px-1.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {entry.description || getProjectName(entry.project_id) || '—'}
                          </span>
                        </div>
                        {durationMinutes > 30 && (
                          <p className="text-white/70 truncate px-1.5">{isDragging
                            ? `${String(Math.floor(displayStart / 60)).padStart(2, '0')}:${String(displayStart % 60).padStart(2, '0')} – ${String(Math.floor(displayEnd / 60)).padStart(2, '0')}:${String(displayEnd % 60).padStart(2, '0')}`
                            : formatDurationShort(entry.duration || 0)}</p>
                        )}
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-white/20 flex items-center justify-center"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, entry.id, 'resize', startMin, endMin, day); }}
                        >
                          <div className="w-6 h-0.5 rounded-full bg-white/50" />
                        </div>
                      </div>
                    );
                  });
                })}
                {/* Create-drag preview (weekly) */}
                {createDrag && (() => {
                  const s = Math.min(createDrag.startMin, createDrag.currentMin);
                  const e = Math.max(createDrag.startMin, createDrag.currentMin);
                  if (e - s < 5) return null;
                  const dayIdx = weekDays.findIndex(d => isSameDay(d, createDrag.dayDate));
                  if (dayIdx === -1) return null;
                  const colWidth = `calc((100% - 64px) / 7)`;
                  return (
                    <div
                      className="absolute rounded-md bg-primary/30 border-2 border-primary border-dashed z-20 pointer-events-none flex items-center justify-center"
                      style={{
                        top: `${s - workHourStart * 60}px`,
                        height: `${e - s}px`,
                        left: `calc(64px + ${dayIdx} * ${colWidth} + 2px)`,
                        width: `calc(${colWidth} - 4px)`,
                      }}
                    >
                      <span className="text-[10px] font-semibold text-primary">
                        {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')} – {String(Math.floor(e / 60)).padStart(2, '0')}:{String(e % 60).padStart(2, '0')}
                      </span>
                    </div>
                  );
                })()}
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
                        top: `${minutes - workHourStart * 60}px`,
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
            <div ref={calendarRef} className="flex-1"
              onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[data-entry-block]')) return;
                if (!calendarRef.current) return;
                handleGridMouseDown(e, selectedDate, calendarRef.current);
              }}
            >
              <div className="relative overflow-hidden" style={{ minHeight: `${visibleHours.length * 60}px` }}>
                {visibleHours.map((hour) => (
                  <div key={hour} className="grid border-b border-border/30" style={{ gridTemplateColumns: '64px 1fr', height: '60px' }}>
                    <div className="px-2 pt-1 text-[11px] text-muted-foreground text-right pr-3 border-r border-border">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>
                    <div className="relative hover:bg-muted/30 transition-colors" />
                  </div>
                ))}
                {(() => {
                  const layoutItems = computeOverlapLayout(filteredEntries);
                  return layoutItems.map((item) => {
                    const { entry, startMin, endMin, col, totalCols } = item;
                    const isDragging = dragState?.entryId === entry.id;
                    const displayStart = isDragging ? dragState.currentStartMin : startMin;
                    const displayEnd = isDragging ? dragState.currentEndMin : endMin;
                    const durationMinutes = displayEnd - displayStart;
                    const color = getProjectColor(entry.project_id, entry.client_id);
                    const availableWidth = 'calc(100% - 72px)';
                    const entryWidth = `calc(${availableWidth} / ${totalCols})`;
                    const entryLeft = `calc(68px + ${col} * ${availableWidth} / ${totalCols})`;
                    return (
                      <div
                        key={entry.id}
                        data-entry-block
                        className={`absolute rounded-md text-xs text-white overflow-hidden shadow-sm z-10 select-none ${isDragging ? 'opacity-80 ring-2 ring-white/50 z-30' : 'hover:brightness-110'}`}
                        style={{
                          top: `${displayStart - workHourStart * 60}px`,
                          height: `${Math.max(durationMinutes, 20)}px`,
                          left: entryLeft,
                          width: entryWidth,
                          backgroundColor: color,
                          cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                        onMouseDown={(e) => handleDragStart(e, entry.id, 'move', startMin, endMin, selectedDate)}
                        onClick={() => { if (!didDragRef.current) openEdit(entry); }}
                      >
                        <div className="flex items-center gap-1.5 truncate px-2 py-1">
                          <span className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {entry.description || getProjectName(entry.project_id) || '—'}
                          </span>
                          <span className="ml-auto text-white/70 flex-shrink-0">
                            {isDragging
                              ? `${String(Math.floor(displayStart / 60)).padStart(2, '0')}:${String(displayStart % 60).padStart(2, '0')} – ${String(Math.floor(displayEnd / 60)).padStart(2, '0')}:${String(displayEnd % 60).padStart(2, '0')}`
                              : formatDurationShort(entry.duration || 0)}
                          </span>
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize hover:bg-white/20 flex items-center justify-center"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, entry.id, 'resize', startMin, endMin, selectedDate); }}
                        >
                          <div className="w-8 h-0.5 rounded-full bg-white/50" />
                        </div>
                      </div>
                    );
                  });
                })()}
                {/* Create-drag preview (daily) */}
                {createDrag && (() => {
                  const s = Math.min(createDrag.startMin, createDrag.currentMin);
                  const e = Math.max(createDrag.startMin, createDrag.currentMin);
                  if (e - s < 5) return null;
                  return (
                    <div
                      className="absolute rounded-md bg-primary/30 border-2 border-primary border-dashed z-20 pointer-events-none flex items-center justify-center"
                      style={{
                        top: `${s - workHourStart * 60}px`,
                        height: `${e - s}px`,
                        left: '68px',
                        width: 'calc(100% - 72px)',
                      }}
                    >
                      <span className="text-xs font-semibold text-primary">
                        {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')} – {String(Math.floor(e / 60)).padStart(2, '0')}:{String(e % 60).padStart(2, '0')}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View (Monthly) */}
        {viewMode === 'calendar' && timeRange === 'monthly' && (
          <div className="h-full overflow-y-auto scrollbar-thin bg-card rounded-t-xl">
            <div className="grid grid-cols-7 text-center border-b border-border rounded-t-xl overflow-hidden">
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
                            style={{ width: '16px', backgroundColor: getProjectColor(e.project_id, e.client_id) }}
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
                    style={{ backgroundColor: getProjectColor(entry.project_id, entry.client_id) }}
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
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getProjectColor(entry.project_id, entry.client_id) }} />
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
          const CHART_COLORS = [
            'hsl(var(--primary))', 
            'hsl(142, 71%, 45%)', 
            'hsl(346, 87%, 60%)',
            'hsl(43, 96%, 56%)', 
            'hsl(283, 39%, 53%)', 
            'hsl(199, 89%, 48%)', 
            'hsl(var(--muted-foreground))'
          ];

          const reportUsers = Array.from(new Set(filteredEntries.map(e => e.user_id))).map(uid => ({
            id: uid,
            name: getProfileName(uid),
          }));
          const reportEntries = reportUserFilter === 'me'
            ? filteredEntries.filter(e => e.user_id === user?.id)
            : filteredEntries;

          const byProject = reportEntries.reduce<Record<string, number>>((acc, e) => {
            const name = getProjectName(e.project_id) || 'Sem projeto';
            acc[name] = (acc[name] || 0) + (e.duration || 0);
            return acc;
          }, {});
          const projectData = Object.entries(byProject).map(([name, seconds]) => ({
            name, hours: +(seconds / 3600).toFixed(2), color: getProjectColor(reportEntries.find(e => (getProjectName(e.project_id) || 'Sem projeto') === name)?.project_id || null, reportEntries.find(e => (getProjectName(e.project_id) || 'Sem projeto') === name)?.client_id),
          }));

          const byClient = reportEntries.reduce<Record<string, number>>((acc, e) => {
            // Use direct client_id first, fallback to project's client
            const directClient = e.client_id ? clients.find(c => c.id === e.client_id) : null;
            const proj = !directClient ? projects.find(p => p.id === e.project_id) : null;
            const projClient = proj?.client_id ? clients.find(c => c.id === proj.client_id) : null;
            const client = directClient || projClient;
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

          const byDay = reportEntries.reduce<Record<string, number>>((acc, e) => {
            const d = new Date(e.start_time);
            const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            acc[key] = (acc[key] || 0) + (e.duration || 0);
            return acc;
          }, {});
          const dayData = Object.entries(byDay)
            .map(([day, seconds]) => ({ day, hours: +(seconds / 3600).toFixed(2) }))
            .sort((a, b) => a.day.localeCompare(b.day));

          const reportTotal = reportEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
          const totalHours = (reportTotal / 3600).toFixed(1);


          const handleExportPDF = async () => {
            const { default: jsPDF } = await import('jspdf');

            // Fetch user profile
            let userName = '';
            let exportOrg: any = null;
            if (user) {
              const { data: profile } = await supabase.from('profiles').select('name, email').eq('user_id', user.id).maybeSingle();
              userName = profile?.name || profile?.email || user.email || '';
              
              const { data: member } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle();
              if (member?.organization_id) {
                const { data: org } = await supabase.from('organizations').select('*').eq('id', member.organization_id).maybeSingle();
                exportOrg = org;
              }
            }

            // Use all entries when custom dates are set, otherwise use filtered by period
            // Always respect user filter (me vs all)
            const baseEntries = reportUserFilter === 'me' ? entries.filter(e => e.user_id === user?.id) : entries;
            let exportEntries = (exportStartDate || exportEndDate) ? [...baseEntries] : [...reportEntries];
            if (exportFilter === 'client' && exportClientId) {
              const clientProjectIds = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
              exportEntries = exportEntries.filter(e => 
                e.client_id === exportClientId || (e.project_id && clientProjectIds.includes(e.project_id))
              );
            } else if (exportFilter === 'project') {
              if (exportProjectId) {
                exportEntries = exportEntries.filter(e => e.project_id === exportProjectId);
              } else if (exportClientId) {
                const clientProjectIds = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
                exportEntries = exportEntries.filter(e => 
                  e.client_id === exportClientId || (e.project_id && clientProjectIds.includes(e.project_id))
                );
              }
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
            const pw = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 18;
            const contentW = pw - margin * 2;
            let y = 14;

            // ── Colors ──
            const BLACK: [number, number, number] = [20, 20, 25];
            const DARK: [number, number, number] = [50, 50, 60];
            const GRAY: [number, number, number] = [100, 100, 115];
            const LIGHT_GRAY: [number, number, number] = [225, 225, 235];
            const BG_LIGHT: [number, number, number] = [250, 251, 254];
            const ACCENT: [number, number, number] = [0, 82, 255];

            const addPageFooter = () => {
              const footerY = pageH - 10;
              doc.setDrawColor(...LIGHT_GRAY);
              doc.setLineWidth(0.2);
              doc.line(margin, footerY - 4, pw - margin, footerY - 4);
              doc.setFontSize(7.5);
              doc.setTextColor(...GRAY);
              doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, footerY + 2);
              doc.text(`Parte ${doc.getCurrentPageInfo().pageNumber}`, pw - margin, footerY + 2, { align: 'right' });
            };

            const checkPageBreak = (needed: number) => {
              if (y + needed > pageH - 25) {
                addPageFooter();
                doc.addPage();
                y = 20;
              }
            };

            // ── Header: Org info (Left) + Logo (Right) ──
            y = 20;
            if (exportOrg) {
              const prevY = y;
              
              // Esquerda: Dados da Empresa
              let iy = y;
              
              const companyTitle = exportOrg.company_name || exportOrg.trade_name || '';
              if (companyTitle) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...BLACK);
                doc.text(companyTitle.toUpperCase(), margin, iy);
                iy += 4.5;
              }

              doc.setFontSize(8.5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...GRAY);
              if (exportOrg.cnpj) { doc.text(`CNPJ: ${exportOrg.cnpj}`, margin, iy); iy += 4.5; }
              if (exportOrg.business_email) { doc.text(exportOrg.business_email, margin, iy); iy += 4.5; }
              if (exportOrg.business_phone) { doc.text(exportOrg.business_phone, margin, iy); iy += 4.5; }
              if (exportOrg.website) { doc.text(exportOrg.website, margin, iy); iy += 4.5; }

              // Direita: Logo
              if (exportOrg.logo_url) {
                const logoResult = await loadImageAsBase64(exportOrg.logo_url);
                if (logoResult) {
                  const maxLogoH = 12;
                  const maxLogoW = contentW * 0.3;
                  const ratio = logoResult.width / logoResult.height;
                  let logoW = maxLogoH * ratio;
                  let logoH = maxLogoH;
                  if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / ratio; }
                  doc.addImage(logoResult.data, 'PNG', pw - margin - logoW, prevY, logoW, logoH);
                }
              }

              y = Math.max(iy + 2, prevY + 14);
            } else {
              doc.setFontSize(15);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...BLACK);
              doc.text('Empresa', margin, y);
              y += 10;
            }

            y += 8;

            // ── Title ──
            const pageTitle = 'RELATÓRIO DE ATIVIDADES';
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLACK);
            doc.text(pageTitle, pw / 2, y, { align: 'center' });
            y += 10;

            // ── Two-column blocks ──
            const blockW = contentW / 2 - 4;
            const blockH = 34; // matching budget height
            
            const resolvedClient = exportClientId ? clients.find(c => c.id === exportClientId) : 
                                  (exportProjectId ? clients.find(c => c.id === projects.find(p => p.id === exportProjectId)?.client_id) : null);
            const resolvedProject = exportProjectId ? projects.find(p => p.id === exportProjectId) : null;

            // Left Block — Client
            doc.setDrawColor(...LIGHT_GRAY);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, blockW, blockH, 2, 2, 'S');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY);
            doc.text('CLIENTE', margin + 5, y + 6);

            let by = y + 12;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            if (resolvedClient) {
              const cliNameTrunc = resolvedClient.name.length > 25 ? resolvedClient.name.substring(0, 23) + '...' : resolvedClient.name;
              doc.text(cliNameTrunc, margin + 5, by);
              by += 6;
              doc.setFontSize(8.5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...GRAY);
              if (resolvedClient.document) { 
                const docLabel = (resolvedClient.document || '').replace(/\D/g, '').length > 11 ? 'CNPJ: ' : 'CPF: ';
                doc.text(`${docLabel}${resolvedClient.document}`, margin + 5, by); 
                by += 5; 
              }
              if (resolvedClient.email) { doc.text(resolvedClient.email, margin + 5, by); by += 5; }
              if (resolvedClient.phone) { doc.text(resolvedClient.phone, margin + 5, by); }
            } else {
              doc.text('Todos os clientes', margin + 5, by);
            }

            // Right Block — Detalhes
            const rightX = margin + contentW / 2 + 4;
            doc.roundedRect(rightX, y, blockW, blockH, 2, 2, 'S');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY);
            doc.text('DETALHAMENTO DO RELATÓRIO', rightX + 5, y + 6);

            let cy = y + 12;
            doc.setFontSize(8.5);
            const drawRowRight = (label: string, val: string, rowY: number) => {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...DARK);
              doc.text(label, rightX + 5, rowY);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...GRAY);
              const valTrunc = val.length > 25 ? val.substring(0, 23) + '...' : val;
              doc.text(valTrunc, rightX + 25, rowY);
            };

            const periodLabel = exportStartDate && exportEndDate
              ? `${exportStartDate.split('-').reverse().join('/')} a ${exportEndDate.split('-').reverse().join('/')}`
              : dateLabel();
            
            drawRowRight('Período:', periodLabel, cy); cy += 5.5;
            drawRowRight('Filtro:', reportUserFilter === 'me' ? 'Somente eu' : 'Todos os membros', cy); cy += 5.5;
            drawRowRight('Projeto:', resolvedProject ? resolvedProject.name : 'Todos', cy); cy += 5.5;
            drawRowRight('Registros:', String(exportEntries.length), cy);

            y += blockH + 12;

            // ── Items Table ──
            doc.setFillColor(...DARK);
            doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);

            const col1 = margin + 5;
            const col2 = col1 + contentW * 0.35;
            const col3 = col2 + contentW * 0.25;
            const col4 = margin + contentW - 5; // Duração right alignment

            doc.text('DESCRIÇÃO', col1, y + 6.5);
            doc.text('PROJETO', col2, y + 6.5);
            doc.text('MEMBRO / DATA', col3, y + 6.5);
            const durText = 'DURAÇÃO';
            doc.text(durText, col4 - doc.getTextWidth(durText), y + 6.5);
            y += 15;

            exportEntries
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .forEach((entry) => {
                const descText = sanitizeText(entry.description || getTaskName(entry.task_id) || '—');
                const wrappedDesc = doc.splitTextToSize(descText, col2 - col1 - 5);
                const rowH = Math.max(10, wrappedDesc.length * 5 + 4);

                checkPageBreak(rowH + 5);

                // Thin bottom border like in budgets
                doc.setDrawColor(...LIGHT_GRAY);
                doc.setLineWidth(0.1);
                doc.line(margin, y + rowH - 5, pw - margin, y + rowH - 5);

                const projName = getProjectName(entry.project_id) || '—';
                const d = new Date(entry.start_time);
                const durStr = entry.duration ? formatDurationShort(entry.duration) : '—';
                const entryUserName = getProfileName(entry.user_id) || userName || '—';
                const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...DARK);
                for (let i = 0; i < wrappedDesc.length; i++) {
                  doc.text(wrappedDesc[i], col1, y + (i * 4.5));
                }

                doc.setTextColor(...GRAY);
                const projTrunc = projName.length > 20 ? projName.substring(0, 18) + '...' : projName;
                doc.text(projTrunc, col2, y);

                const memberTrunc = entryUserName.length > 18 ? entryUserName.substring(0, 15) + '...' : entryUserName;
                doc.text(`${memberTrunc} • ${dateStr}`, col3, y);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...DARK);
                doc.text(durStr, col4 - doc.getTextWidth(durStr), y);

                y += rowH;
              });

            y += 8;

            // ── Totals ──
            const totalsX = margin + contentW - 75;
            
            y += 6;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...ACCENT);
            doc.text('TOTAL DE HORAS:', totalsX, y);
            
            const totalText = formatDurationShort(exportTotal);
            const totalW = doc.getTextWidth(totalText);
            doc.text(totalText, pw - margin - totalW, y);
            
            y += 6;
            
            // Add thin separator line after total
            doc.setDrawColor(...LIGHT_GRAY);
            doc.setLineWidth(0.1);
            doc.line(totalsX - 5, y, pw - margin, y);
            
            y += 4;
            
            addPageFooter();

            // save
            doc.save(`relatorio-tempo-${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF exportado com sucesso!');
            setShowExportPanel(false);
          };


          return (
            <div className="w-full py-2 space-y-6">
             {(() => {
                const expFilteredProjects = exportClientId
                  ? projects.filter(p => p.client_id === exportClientId)
                  : projects;

                // Live preview of what will be exported
                let previewEntries = (exportStartDate || exportEndDate) ? [...entries] : [...reportEntries];
                if (reportUserFilter === 'me') {
                  previewEntries = previewEntries.filter(e => e.user_id === user?.id);
                }
                if (exportFilter === 'client' && exportClientId) {
                  const ids = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
                  previewEntries = previewEntries.filter(e => 
                    e.client_id === exportClientId || (e.project_id && ids.includes(e.project_id))
                  );
                } else if (exportFilter === 'project') {
                  if (exportProjectId) {
                    previewEntries = previewEntries.filter(e => e.project_id === exportProjectId);
                  } else if (exportClientId) {
                    const ids = projects.filter(p => p.client_id === exportClientId).map(p => p.id);
                    previewEntries = previewEntries.filter(e => 
                      e.client_id === exportClientId || (e.project_id && ids.includes(e.project_id))
                    );
                  }
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
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Relatório de Tempo</h2>
                        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalHours}h</span> · {reportEntries.length} registros</p>
                      </div>
                    </div>

                    {/* Filters bar - compact inline layout */}
                    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm relative z-30">
                      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                        {/* User filter pills */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 p-1">
                          {[
                            { value: 'me', label: 'Somente eu' },
                            { value: 'all', label: 'Todos' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setReportUserFilter(opt.value)}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                reportUserFilter === opt.value
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <div className="w-px h-6 bg-border" />

                        {/* Filter type pills */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 p-1">
                          {filterTypes.map((ft) => (
                            <button
                              key={ft.value}
                              onClick={() => { setExportFilter(ft.value); setExportClientId(''); setExportProjectId(''); }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                exportFilter === ft.value
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {ft.icon}
                              {ft.label}
                            </button>
                          ))}
                        </div>

                        <div className="w-px h-6 bg-border" />

                        {/* Inline selects for client/project */}
                        {(exportFilter === 'client' || exportFilter === 'project') && (
                          <CompactClientSelect
                            clients={clients}
                            value={exportClientId}
                            onChange={(v) => { setExportClientId(v); setExportProjectId(''); }}
                            placeholder="Cliente"
                          />
                        )}

                        {exportFilter === 'project' && (
                          <Select value={exportProjectId || "all"} onValueChange={(v) => setExportProjectId(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-auto min-w-[140px] px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium focus:ring-2 focus:ring-ring h-[30px]">
                              <SelectValue placeholder="Todos os projetos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os projetos</SelectItem>
                              {expFilteredProjects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "w-auto min-w-[200px] px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium flex items-center justify-start gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                                  (!exportStartDate && !exportEndDate) ? "text-muted-foreground" : "text-foreground"
                                )}
                              >
                                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                                {exportStartDate ? (
                                  exportEndDate ? (
                                    <>
                                      {format(parseISO(exportStartDate), 'dd/MM/yyyy')} - {format(parseISO(exportEndDate), 'dd/MM/yyyy')}
                                    </>
                                  ) : (
                                    format(parseISO(exportStartDate), 'dd/MM/yyyy')
                                  )
                                ) : (
                                  <span>Filtrar por período</span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="range"
                                selected={{
                                  from: exportStartDate ? parseISO(exportStartDate) : undefined,
                                  to: exportEndDate ? parseISO(exportEndDate) : undefined,
                                }}
                                onSelect={(range: any) => {
                                  setExportStartDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                                  setExportEndDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                                }}
                                initialFocus
                                numberOfMonths={2}
                                locale={ptBR}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Clear filters */}
                        {(exportFilter !== 'all' || exportStartDate || exportEndDate) && (
                          <>
                            <div className="w-px h-6 bg-border" />
                            <button
                              onClick={() => { setExportFilter('all'); setExportClientId(''); setExportProjectId(''); setExportStartDate(''); setExportEndDate(''); }}
                              className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                            >
                              Limpar
                            </button>
                          </>
                        )}

                        {/* Spacer + Export button */}
                        <div className="ml-auto flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-foreground tabular-nums leading-none">{previewHours}h</p>
                            <p className="text-[10px] text-muted-foreground">{previewEntries.length} registros</p>
                          </div>
                          <button
                            onClick={handleExportPDF}
                            disabled={previewEntries.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Exportar PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {reportEntries.length === 0 ? (
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
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium w-8">
                            <button
                              type="button"
                              onClick={() => {
                                const allNames = projectData.map(p => p.name);
                                const allCollapsed = allNames.every(n => collapsedProjects.has(n));
                                if (allCollapsed) {
                                  setCollapsedProjects(new Set());
                                } else {
                                  setCollapsedProjects(new Set(allNames));
                                }
                              }}
                              className="p-0.5 rounded hover:bg-muted transition-colors"
                              title={projectData.every(p => collapsedProjects.has(p.name)) ? 'Expandir todos' : 'Recolher todos'}
                            >
                              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${projectData.every(p => collapsedProjects.has(p.name)) ? '-rotate-90' : 'rotate-0'}`} />
                            </button>
                          </th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Projeto</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Cliente</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Usuário</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Registros</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">Horas</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.sort((a, b) => b.hours - a.hours).map((p, i) => {
                          const projEntries = reportEntries
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
                                <td className="py-2.5 px-3 text-muted-foreground">—</td>
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
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-2 pl-4">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        <span className="text-foreground text-xs">{desc}</span>
                                        <span className="text-muted-foreground text-[10px]">· {dateStr}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3"></td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{getProfileName((entry as any).user_id)}</td>
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
                          <td colSpan={3} className="py-2.5 px-3 font-semibold text-foreground">Total</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">{reportEntries.length}</td>
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

      {/* Create entry dialog */}
      <Dialog open={!!createModalData} onOpenChange={() => setCreateModalData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo registro de tempo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {createModalData && (
              <div className="text-sm text-muted-foreground">
                {createModalData.dayDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {String(Math.floor(createModalData.startMin / 60)).padStart(2, '0')}:{String(createModalData.startMin % 60).padStart(2, '0')}
                {' – '}
                {String(Math.floor(createModalData.endMin / 60)).padStart(2, '0')}:{String(createModalData.endMin % 60).padStart(2, '0')}
                {' · '}
                {formatDurationShort((createModalData.endMin - createModalData.startMin) * 60)}
              </div>
            )}
            <input
              placeholder="No que você estava trabalhando?"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <CompactClientSelect clients={clients} value={createClientId} onChange={(v) => { setCreateClientId(v); setCreateProjectId(''); setCreateTaskId(''); }} placeholder="Cliente" fullWidth />
            <select
              value={createProjectId}
              onChange={(e) => { setCreateProjectId(e.target.value); setCreateTaskId(''); }}
              disabled={!createClientId}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{createClientId ? t.project : 'Selecione um cliente primeiro'}</option>
              {createFilteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={createTaskId}
              onChange={(e) => setCreateTaskId(e.target.value)}
              disabled={!createProjectId}
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{createProjectId ? 'Selecione a tarefa' : 'Selecione um projeto primeiro'}</option>
              {createFilteredTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCreateModalData(null)} className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium">{t.cancel}</button>
              <button onClick={saveCreate} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t.save}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingPage;
