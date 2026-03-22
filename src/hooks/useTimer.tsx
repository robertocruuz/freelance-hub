import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TimerContextType {
  running: boolean;
  startTime: number;
  elapsed: number;
  description: string;
  clientId: string;
  projectId: string;
  taskId: string;
  setDescription: (v: string) => void;
  setClientId: (v: string) => void;
  setProjectId: (v: string) => void;
  setTaskId: (v: string) => void;
  startTimer: () => void;
  stopTimer: (onSuccess?: () => void) => Promise<void>;
  lastSavedTime: number;
}

const TimerContext = createContext<TimerContextType>({
  running: false,
  startTime: 0,
  elapsed: 0,
  description: '',
  clientId: '',
  projectId: '',
  taskId: '',
  setDescription: () => {},
  setClientId: () => {},
  setProjectId: () => {},
  setTaskId: () => {},
  startTimer: () => {},
  stopTimer: async () => {},
  lastSavedTime: 0,
});

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const intervalRef = useRef<number>();

  // Restore from localStorage on mount
  const [running, setRunning] = useState(() => {
    return localStorage.getItem('timer_running') === 'true';
  });
  const [startTime, setStartTime] = useState(() => {
    const saved = localStorage.getItem('timer_startTime');
    return saved ? parseInt(saved) : 0;
  });
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState(() => localStorage.getItem('timer_description') || '');
  const [clientId, setClientId] = useState(() => localStorage.getItem('timer_clientId') || '');
  const [projectId, setProjectId] = useState(() => localStorage.getItem('timer_projectId') || '');
  const [taskId, setTaskId] = useState(() => localStorage.getItem('timer_taskId') || '');
  const [lastSavedTime, setLastSavedTime] = useState(0);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('timer_running', String(running));
    localStorage.setItem('timer_startTime', String(startTime));
    localStorage.setItem('timer_description', description);
    localStorage.setItem('timer_clientId', clientId);
    localStorage.setItem('timer_projectId', projectId);
    localStorage.setItem('timer_taskId', taskId);
  }, [running, startTime, description, clientId, projectId, taskId]);

  // Tick interval
  useEffect(() => {
    if (running && startTime > 0) {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, startTime]);

  const startTimer = useCallback(() => {
    setStartTime(Date.now());
    setElapsed(0);
    setRunning(true);
  }, []);

  const stopTimer = useCallback(async (onSuccess?: () => void) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (!user) return;
    const end = new Date();
    const start = new Date(startTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      client_id: clientId || null,
      project_id: projectId || null,
      task_id: taskId || null,
      description: description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      if (taskId) {
        const durationH = Math.floor(duration / 3600);
        const durationM = Math.floor((duration % 3600) / 60);
        const durationS = duration % 60;
        const durationStr = `${String(durationH).padStart(2, '0')}:${String(durationM).padStart(2, '0')}:${String(durationS).padStart(2, '0')}`;
        await supabase.from('task_activity_logs').insert({
          task_id: taskId,
          user_id: user.id,
          action: 'time_tracked',
          details: {
            duration,
            duration_formatted: durationStr,
            description: description || null,
          },
        } as any);
      }
      setElapsed(0);
      setDescription('');
      setClientId('');
      setProjectId('');
      setTaskId('');
      setLastSavedTime(Date.now());
      onSuccess?.();
    }
  }, [user, startTime, clientId, projectId, taskId, description]);

  return (
    <TimerContext.Provider value={{
      running, startTime, elapsed,
      description, clientId, projectId, taskId,
      setDescription, setClientId, setProjectId, setTaskId,
      startTimer, stopTimer, lastSavedTime,
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
