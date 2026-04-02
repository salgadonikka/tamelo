export type CircleState = 'empty' | 'planned' | 'started' | 'completed';

export type HistoryEventType =
  | 'created'
  | 'title_updated'
  | 'description_updated'
  | 'project_assigned'
  | 'project_removed'
  | 'project_changed'
  | 'archived'
  | 'unarchived'
  | 'marker_set'
  | 'marker_updated'
  | 'marker_removed';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  eventType: HistoryEventType;
  fieldName: string | null; // date (YYYY-MM-DD) for marker events
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface DayMarker {
  date: string; // ISO date string (YYYY-MM-DD)
  state: CircleState;
  createdAt?: string; // actual DB created_at timestamp
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  projectId?: string;
  markers: DayMarker[];
  createdAt: string;
  archived: boolean;
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  notes?: string;
  createdAt: string;
}

export interface WeekInfo {
  startDate: Date;
  endDate: Date;
  days: Date[];
}
