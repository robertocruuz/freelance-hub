import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';

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

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

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
      .limit(50);
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

  const todayEntries = entries.filter((e) => new Date(e.start_time).toDateString() === new Date().toDateString());
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const weekTotal = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 p-4 rounded-3xl glass">
        <input
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl glass-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
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

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass text-center">
          <p className="text-xs text-muted-foreground">{t.todayTotal}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(todayTotal)}</p>
        </div>
        <div className="p-4 rounded-2xl glass text-center">
          <p className="text-xs text-muted-foreground">{t.weekTotal}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(weekTotal)}</p>
        </div>
        <div className="p-4 rounded-2xl glass text-center">
          <p className="text-xs text-muted-foreground">{t.billable}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(weekTotal)}</p>
        </div>
      </div>

      <div className="rounded-3xl glass overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-2" />
          {weekDays.map((d, i) => (
            <div key={i} className={`p-3 text-center text-xs font-medium border-l border-border ${d.toDateString() === now.toDateString() ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}>
              <div>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
              <div className="text-lg font-bold text-foreground">{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="max-h-[400px] overflow-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[40px]">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3">{`${hour}:00`}</div>
              {weekDays.map((d, i) => {
                const dayEntries = entries.filter((e) => {
                  const ed = new Date(e.start_time);
                  return ed.toDateString() === d.toDateString() && ed.getHours() === hour;
                });
                return (
                  <div key={i} className="border-l border-border/50 relative hover:bg-accent/30 transition-colors cursor-pointer min-h-[40px]">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="absolute inset-x-1 top-1 bg-primary/20 text-primary text-[10px] rounded px-1 py-0.5 truncate">
                        {entry.description || '-'}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold font-display">{t.timeTracking}</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 rounded-2xl glass text-sm">
              <span className="text-foreground">{entry.description || '-'}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                <span className="font-mono font-semibold text-foreground">{formatDuration(entry.duration || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeTrackingPage;
