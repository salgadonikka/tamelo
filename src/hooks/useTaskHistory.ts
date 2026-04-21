import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { TaskHistoryEntry, HistoryEventType } from '@/types/task';

interface ApiHistoryEntry { id: number; eventType: string; fieldName: string | null; oldValue: string | null; newValue: string | null; createdAt: string; }

function mapEntry(dto: ApiHistoryEntry, taskId: string): TaskHistoryEntry {
  return {
    id: dto.id.toString(),
    taskId,
    eventType: dto.eventType as HistoryEventType,
    fieldName: dto.fieldName,
    oldValue: dto.oldValue,
    newValue: dto.newValue,
    createdAt: dto.createdAt,
  };
}

export function useTaskHistory(taskId: string | null) {
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['task-history', taskId],
    queryFn: async () => {
      const data = await api.get<ApiHistoryEntry[]>(`/api/Tasks/${parseInt(taskId!, 10)}/history`);
      return data.map(dto => mapEntry(dto, taskId!));
    },
    enabled: !!taskId,
    staleTime: 0, // Always fetch fresh history when a task is opened
  });

  const addHistoryEvent = useCallback(async (params: {
    taskId: string;
    eventType: HistoryEventType;
    fieldName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
  }) => {
    const dto = await api.post<ApiHistoryEntry>(
      `/api/Tasks/${parseInt(params.taskId, 10)}/history`,
      {
        eventType: params.eventType,
        fieldName: params.fieldName ?? null,
        oldValue:  params.oldValue  ?? null,
        newValue:  params.newValue  ?? null,
      }
    ).catch(err => { console.error('Error writing task history:', err); return null; });

    if (dto) {
      const newEntry = mapEntry(dto, params.taskId);
      queryClient.setQueryData<TaskHistoryEntry[]>(
        ['task-history', params.taskId],
        old => [newEntry, ...(old ?? [])]
      );
    }
  }, [queryClient]);

  return { history, addHistoryEvent };
}
