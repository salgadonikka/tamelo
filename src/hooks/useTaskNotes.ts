import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/apiClient';

export interface TaskNote {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiTaskNote { id: number; taskItemId: number; content: string; createdAt: string; lastModified: string; }

function mapNote(dto: ApiTaskNote): TaskNote {
  return {
    id: dto.id.toString(),
    taskId: dto.taskItemId.toString(),
    content: dto.content,
    createdAt: dto.createdAt,
    updatedAt: dto.lastModified,
  };
}

export function useTaskNotes(taskId: string | null) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) { setNotes([]); return; }

    setLoading(true);
    api.get<ApiTaskNote[]>(`/api/TaskNotes/${parseInt(taskId, 10)}`)
      .then(data => setNotes(data.map(mapNote)))
      .catch(err => console.error('Error fetching notes:', err))
      .finally(() => setLoading(false));
  }, [taskId]);

  const addNote = useCallback(async (content: string) => {
    if (!taskId) return null;

    const dto = await api.post<ApiTaskNote>('/api/TaskNotes', {
      taskItemId: parseInt(taskId, 10),
      content,
    });

    const newNote = mapNote(dto);
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, [taskId]);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    await api.put(`/api/TaskNotes/${parseInt(noteId, 10)}`, { content });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    await api.delete(`/api/TaskNotes/${parseInt(noteId, 10)}`);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  return { notes, loading, addNote, updateNote, deleteNote };
}
