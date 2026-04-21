import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading: loading } = useQuery({
    queryKey: ['task-notes', taskId],
    queryFn: async () => {
      const data = await api.get<ApiTaskNote[]>(`/api/TaskNotes/${parseInt(taskId!, 10)}`);
      return data.map(mapNote);
    },
    enabled: !!taskId,
  });

  const addNote = useCallback(async (content: string) => {
    if (!taskId) return null;

    const dto = await api.post<ApiTaskNote>('/api/TaskNotes', {
      taskItemId: parseInt(taskId, 10),
      content,
    });

    const newNote = mapNote(dto);
    queryClient.setQueryData<TaskNote[]>(
      ['task-notes', taskId],
      old => [newNote, ...(old ?? [])]
    );
    return newNote;
  }, [taskId, queryClient]);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    await api.put(`/api/TaskNotes/${parseInt(noteId, 10)}`, { content });
    queryClient.setQueryData<TaskNote[]>(
      ['task-notes', taskId],
      old => (old ?? []).map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n)
    );
  }, [taskId, queryClient]);

  const deleteNote = useCallback(async (noteId: string) => {
    await api.delete(`/api/TaskNotes/${parseInt(noteId, 10)}`);
    queryClient.setQueryData<TaskNote[]>(
      ['task-notes', taskId],
      old => (old ?? []).filter(n => n.id !== noteId)
    );
  }, [taskId, queryClient]);

  return { notes, loading, addNote, updateNote, deleteNote };
}
