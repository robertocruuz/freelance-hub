import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface KanbanBoard {
  id: string;
  user_id: string;
  name: string;
  client_id: string | null;
  project_id: string | null;
  position: number;
  created_at: string;
}

export interface KanbanColumn {
  id: string;
  user_id: string;
  name: string;
  position: number;
  wip_limit: number | null;
  created_at: string;
  board_id: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  column_id: string | null;
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string | null;
  complexity: number;
  estimated_value: number;
  real_value: number;
  position: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  position: number;
  items: TaskChecklistItem[];
}

export interface TaskChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  due_date: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

export interface TaskLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

const DEFAULT_COLUMNS = [
  { name: 'Para Fazer', position: 0 },
  { name: 'Em Andamento', position: 1 },
  { name: 'Alteração', position: 2 },
  { name: 'Concluído', position: 3 },
  { name: 'Arquivado', position: 4 },
];

export const useKanban = (activeBoardId?: string | null) => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [loading, setLoading] = useState(true);

  // Board operations
  const loadBoards = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('kanban_boards')
      .select('*')
      .order('position', { ascending: true });
    if (data) setBoards(data);
    return data || [];
  }, [user]);

  const addBoard = async (name: string, clientId?: string | null, projectId?: string | null) => {
    if (!user) return;
    const position = boards.length;
    const { data } = await supabase
      .from('kanban_boards')
      .insert({ name, position, user_id: user.id, client_id: clientId || null, project_id: projectId || null })
      .select()
      .single();
    if (data) {
      setBoards((prev) => [...prev, data]);
      // Create default columns for the new board
      const inserts = DEFAULT_COLUMNS.map((col) => ({
        ...col,
        user_id: user.id,
        board_id: data.id,
      }));
      const { data: newCols } = await supabase
        .from('kanban_columns')
        .insert(inserts)
        .select('*');
      if (newCols) setColumns((prev) => [...prev, ...newCols]);
    }
    return data;
  };

  const updateBoard = async (id: string, updates: Partial<KanbanBoard>) => {
    await supabase.from('kanban_boards').update(updates).eq('id', id);
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBoard = async (id: string) => {
    // Columns will cascade delete; tasks in those columns lose their column_id
    // First delete tasks that belong to columns of this board
    const boardCols = columns.filter(c => c.board_id === id);
    const colIds = boardCols.map(c => c.id);
    if (colIds.length > 0) {
      // Delete tasks in those columns
      for (const colId of colIds) {
        await supabase.from('tasks').delete().eq('column_id', colId);
      }
    }
    await supabase.from('kanban_boards').delete().eq('id', id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setColumns((prev) => prev.filter((c) => c.board_id !== id));
    setTasks((prev) => prev.filter((t) => !colIds.includes(t.column_id || '')));
  };

  const loadColumns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('kanban_columns')
      .select('*')
      .order('position', { ascending: true });

    if (data) {
      setColumns(data);
    }
  }, [user]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true });
    if (data) setTasks(data);
  }, [user]);

  const loadLabels = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('task_labels')
      .select('*')
      .order('name', { ascending: true });
    if (data) setLabels(data);
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadBoards(), loadColumns(), loadTasks(), loadLabels()]);
    setLoading(false);
  }, [loadBoards, loadColumns, loadTasks, loadLabels]);

  useEffect(() => { load(); }, [load]);

  // Filtered columns and tasks for active board
  const boardColumns = activeBoardId
    ? columns.filter((c) => c.board_id === activeBoardId).sort((a, b) => a.position - b.position)
    : columns.filter((c) => !c.board_id).sort((a, b) => a.position - b.position);

  const boardColumnIds = new Set(boardColumns.map((c) => c.id));
  const boardTasks = tasks.filter((t) => t.column_id && boardColumnIds.has(t.column_id));

  // Column operations
  const addColumn = async (name: string) => {
    if (!user) return;
    const position = boardColumns.length;
    const { data } = await supabase
      .from('kanban_columns')
      .insert({ name, position, user_id: user.id, board_id: activeBoardId || null })
      .select()
      .single();
    if (data) setColumns((prev) => [...prev, data]);
  };

  const updateColumn = async (id: string, updates: Partial<KanbanColumn>) => {
    await supabase.from('kanban_columns').update(updates).eq('id', id);
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteColumn = async (id: string) => {
    await supabase.from('kanban_columns').delete().eq('id', id);
    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const reorderColumns = async (newColumns: KanbanColumn[]) => {
    setColumns((prev) => {
      const otherCols = prev.filter((c) => !newColumns.find((nc) => nc.id === c.id));
      return [...otherCols, ...newColumns];
    });
    const updates = newColumns.map((col, i) => ({ id: col.id, position: i, name: col.name, user_id: col.user_id }));
    for (const u of updates) {
      await supabase.from('kanban_columns').update({ position: u.position }).eq('id', u.id);
    }
  };

  // Task operations
  const addTask = async (columnId: string, title: string) => {
    if (!user) return;
    const colTasks = tasks.filter((t) => t.column_id === columnId);
    const position = colTasks.length;
    const { data } = await supabase
      .from('tasks')
      .insert({ title, column_id: columnId, position, user_id: user.id })
      .select()
      .single();
    if (data) setTasks((prev) => [...prev, data]);
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (updates.column_id) {
      const targetCol = columns.find((c) => c.id === updates.column_id);
      if (targetCol && targetCol.name === 'Concluído' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }
    await supabase.from('tasks').update(updates).eq('id', id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    const updates: Partial<Task> = { column_id: newColumnId, position: newPosition };
    const targetCol = columns.find((c) => c.id === newColumnId);
    if (targetCol?.name === 'Concluído') {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from('tasks').update(updates).eq('id', taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  // Checklist operations
  const getChecklists = async (taskId: string): Promise<TaskChecklist[]> => {
    const { data: checklists } = await supabase
      .from('task_checklists')
      .select('*')
      .eq('task_id', taskId)
      .order('position');

    if (!checklists) return [];

    const result: TaskChecklist[] = [];
    for (const cl of checklists) {
      const { data: items } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('checklist_id', cl.id)
        .order('position');
      result.push({ ...cl, items: items || [] });
    }
    return result;
  };

  const addChecklist = async (taskId: string, title: string) => {
    const { data } = await supabase
      .from('task_checklists')
      .insert({ task_id: taskId, title })
      .select()
      .single();
    return data;
  };

  const addChecklistItem = async (checklistId: string, title: string) => {
    const { data } = await supabase
      .from('task_checklist_items')
      .insert({ checklist_id: checklistId, title })
      .select()
      .single();
    return data;
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    await supabase
      .from('task_checklist_items')
      .update({ is_completed: isCompleted })
      .eq('id', itemId);
  };

  const deleteChecklist = async (id: string) => {
    await supabase.from('task_checklists').delete().eq('id', id);
  };

  const deleteChecklistItem = async (id: string) => {
    await supabase.from('task_checklist_items').delete().eq('id', id);
  };

  // Comments
  const getComments = async (taskId: string): Promise<TaskComment[]> => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    return data || [];
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, user_id: user.id, content })
      .select()
      .single();
    return data;
  };

  // Activity logs
  const getActivityLogs = async (taskId: string): Promise<TaskActivityLog[]> => {
    const { data } = await supabase
      .from('task_activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    return data || [];
  };

  const logActivity = async (taskId: string, action: string, details: Record<string, any> = {}) => {
    if (!user) return;
    await supabase
      .from('task_activity_logs')
      .insert({ task_id: taskId, user_id: user.id, action, details });
  };

  // Labels
  const addLabel = async (name: string, color: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('task_labels')
      .insert({ name, color, user_id: user.id })
      .select()
      .single();
    if (data) setLabels((prev) => [...prev, data]);
    return data;
  };

  const getTaskLabels = async (taskId: string): Promise<TaskLabel[]> => {
    const { data } = await supabase
      .from('task_label_assignments')
      .select('label_id')
      .eq('task_id', taskId);
    if (!data) return [];
    const labelIds = data.map((d) => d.label_id);
    return labels.filter((l) => labelIds.includes(l.id));
  };

  const assignLabel = async (taskId: string, labelId: string) => {
    await supabase
      .from('task_label_assignments')
      .insert({ task_id: taskId, label_id: labelId });
  };

  const removeLabel = async (taskId: string, labelId: string) => {
    await supabase
      .from('task_label_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId);
  };

  return {
    boards, columns: boardColumns, tasks: boardTasks, labels, loading, reload: load,
    addBoard, updateBoard, deleteBoard,
    addColumn, updateColumn, deleteColumn, reorderColumns,
    addTask, updateTask, deleteTask, moveTask,
    getChecklists, addChecklist, addChecklistItem, toggleChecklistItem, deleteChecklist, deleteChecklistItem,
    getComments, addComment,
    getActivityLogs, logActivity,
    addLabel, getTaskLabels, assignLabel, removeLabel,
  };
};
