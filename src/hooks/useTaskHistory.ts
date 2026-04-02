import { useState, useEffect, useCallback } from 'react';
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
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);

  useEffect(() => {
    if (!taskId) { setHistory([]); return; }

    api.get<ApiHistoryEntry[]>(`/api/Tasks/${parseInt(taskId, 10)}/history`)
      .then(data => setHistory(data.map(dto => mapEntry(dto, taskId))))
      .catch(err => console.error('Error fetching task history:', err));
  }, [taskId]);

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

    if (dto) setHistory(prev => [mapEntry(dto, params.taskId), ...prev]);
  }, []);

  return { history, addHistoryEvent };
}
