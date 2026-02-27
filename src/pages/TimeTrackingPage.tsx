import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface TimeEntry {
  id: string;
  project: string;
  description: string;
  start: number;
  end: number;
  duration: number;
}

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const TimeTrackingPage = () => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, startTime]);

  const startTimer = () => {
    setStartTime(Date.now());
    setElapsed(0);
    setRunning(true);
  };

  const stopTimer = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const end = Date.now();
    const entry: TimeEntry = {
      id: Date.now().toString(),
      project: project || 'Sem projeto',
      description: description || '-',
      start: startTime,
      end,
      duration: end - startTime,
    };
    setEntries((prev) => [entry, ...prev]);
    setElapsed(0);
    setDescription('');
  };

  const todayTotal = entries
    .filter((e) => new Date(e.start).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.duration, 0);

  const weekTotal = entries.reduce((sum, e) => sum + e.duration, 0);

  // Generate week days
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Timer bar */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
        <input
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder={t.project}
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="w-40 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="font-mono text-lg font-semibold text-foreground w-24 text-center">
          {formatDuration(elapsed)}
        </span>
        {running ? (
          <button onClick={stopTimer} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm">
            <Square className="w-4 h-4" /> {t.stopTimer}
          </button>
        ) : (
          <button onClick={startTimer} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            <Play className="w-4 h-4" /> {t.startTimer}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground">{t.todayTotal}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(todayTotal)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground">{t.weekTotal}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(weekTotal)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground">{t.billable}</p>
          <p className="text-xl font-bold font-display text-foreground">{formatDuration(weekTotal)}</p>
        </div>
      </div>

      {/* Week calendar grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-2" />
          {weekDays.map((d, i) => (
            <div key={i} className={`p-3 text-center text-xs font-medium border-l border-border ${
              d.toDateString() === now.toDateString() ? 'bg-primary/5 text-primary' : 'text-muted-foreground'
            }`}>
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
                  const ed = new Date(e.start);
                  return ed.toDateString() === d.toDateString() && ed.getHours() === hour;
                });
                return (
                  <div key={i} className="border-l border-border/50 relative hover:bg-accent/30 transition-colors cursor-pointer min-h-[40px]">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="absolute inset-x-1 top-1 bg-primary/20 text-primary text-[10px] rounded px-1 py-0.5 truncate">
                        {entry.project}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold font-display">{t.timeTracking}</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm">
              <div>
                <span className="font-semibold text-foreground">{entry.project}</span>
                <span className="text-muted-foreground ml-2">{entry.description}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-mono font-semibold text-foreground">{formatDuration(entry.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeTrackingPage;
