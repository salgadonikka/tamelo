import { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, Project, DayMarker, CircleState } from '@/types/task';
import { format, startOfWeek, endOfWeek, addDays, isBefore, isSameDay, startOfDay } from 'date-fns';
import { useDeviceType, getNavStep, getDayCount } from './useDeviceType';
import { useAuth } from './useAuth';
import { api } from '@/lib/apiClient';

export type SortOption = 'date';
export type CompletedVisibility = 'show-week' | 'hide-all' | 'show-all';

// --- API DTO shapes (as returned by Tamelo.Api) ---
interface ApiDayMarker { date: string; state: string; }
interface ApiTask { id: number; title: string; notes: string | null; projectId: number | null; markers: ApiDayMarker[]; createdAt: string; archived: boolean; sortOrder: number; }
interface ApiProject { id: number; name: string; color: string | null; notes: string | null; createdAt: string; }

function mapTask(dto: ApiTask): Task {
  return {
    id: dto.id.toString(),
    title: dto.title,
    notes: dto.notes ?? undefined,
    projectId: dto.projectId?.toString(),
    markers: dto.markers.map(m => ({ date: m.date, state: m.state as CircleState })),
    createdAt: dto.createdAt,
    archived: dto.archived,
    sortOrder: dto.sortOrder,
  };
}

function mapProject(dto: ApiProject): Project {
  return {
    id: dto.id.toString(),
    name: dto.name,
    color: dto.color ?? undefined,
    notes: dto.notes ?? undefined,
    createdAt: dto.createdAt,
  };
}

export function useTaskStore() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const deviceType = useDeviceType();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState<CompletedVisibility>('show-week');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch data from API
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setProjects([]);
      setLoading(false);
      setHasFetched(false);
      return;
    }

    if (hasFetched) return;

    const fetchData = async () => {
      setHasFetched(true);
      setLoading(true);

      const [projectsData, tasksData] = await Promise.all([
        api.get<ApiProject[]>('/api/Projects'),
        api.get<ApiTask[]>('/api/Tasks'),
      ]);

      setProjects(projectsData.map(mapProject));
      setTasks(tasksData.map(mapTask));
      setLoading(false);
    };

    fetchData().catch(err => {
      console.error('Error fetching data:', err);
      setLoading(false);
    });
  }, [user, hasFetched]);

  // Calculate visible days based on device type and day offset
  const dayCount = getDayCount(deviceType);
  const navStep = getNavStep(deviceType);

  const weekInfo = useMemo(() => {
    const today = startOfDay(new Date());
    let start: Date;
    if (deviceType === 'desktop') {
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      start = addDays(weekStart, dayOffset);
    } else {
      start = addDays(today, dayOffset);
    }
    const days = Array.from({ length: dayCount }, (_, i) => addDays(start, i));
    const endDate = days[days.length - 1];
    return { startDate: start, endDate, days };
  }, [dayOffset, dayCount, deviceType]);

  useEffect(() => {
    setDayOffset(0);
  }, [deviceType]);

  const currentWeekOffset = dayOffset;

  const goToPreviousWeek = useCallback(() => setDayOffset(prev => prev - navStep), [navStep]);
  const goToNextWeek    = useCallback(() => setDayOffset(prev => prev + navStep), [navStep]);
  const goToCurrentWeek = useCallback(() => setDayOffset(0), []);

  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
  }, []);

  const collapseAllProjects = useCallback(() => {
    const allProjectIds = new Set(projects.map(p => p.id));
    allProjectIds.add('no-project');
    setCollapsedProjects(allProjectIds);
  }, [projects]);

  const expandAllProjects = useCallback(() => setCollapsedProjects(new Set()), []);

  // Add a new task
  const addTask = useCallback(async (title: string, projectId?: string, notes?: string) => {
    if (!user) return null;

    const dto = await api.post<ApiTask>('/api/Tasks', {
      title,
      projectId: projectId ? parseInt(projectId, 10) : null,
      notes: notes ?? null,
    });

    const newTask = mapTask(dto);
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, [user]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const id = parseInt(taskId, 10);
    const body: Record<string, unknown> = { id };
    if (updates.title     !== undefined) body.title     = updates.title;
    if (updates.notes     !== undefined) body.notes     = updates.notes;
    if ('projectId' in updates)          body.projectId = updates.projectId ? parseInt(updates.projectId, 10) : null;
    if (updates.sortOrder !== undefined) body.sortOrder = updates.sortOrder;

    if (updates.archived !== undefined) {
      await api.patch(`/api/Tasks/${id}/archive`, { archived: updates.archived });
    } else if (Object.keys(body).length > 0) {
      await api.put(`/api/Tasks/${id}`, body);
    }

    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, ...updates } : task));
  }, []);

  // Reorder tasks (drag & drop)
  const reorderTask = useCallback(async (taskId: string, newProjectId: string | undefined, newSortOrder: number) => {
    const id = parseInt(taskId, 10);

    setTasks(prev => {
      const updated = [...prev];
      const taskIndex = updated.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;

      const task = { ...updated[taskIndex], projectId: newProjectId, sortOrder: newSortOrder };
      updated[taskIndex] = task;

      const groupTasks = updated
        .filter(t => (t.projectId || undefined) === (newProjectId || undefined) && !t.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const withoutMoved = groupTasks.filter(t => t.id !== taskId);
      withoutMoved.splice(newSortOrder, 0, task);

      withoutMoved.forEach((t, i) => {
        const idx = updated.findIndex(u => u.id === t.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], sortOrder: i, projectId: updated[idx].id === taskId ? newProjectId : updated[idx].projectId };
      });

      return updated;
    });

    await api.patch(`/api/Tasks/${id}/reorder`, {
      newSortOrder,
      newProjectId: newProjectId ? parseInt(newProjectId, 10) : null,
    });
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    await api.delete(`/api/Tasks/${parseInt(taskId, 10)}`);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  }, [selectedTaskId]);

  // Archive task
  const archiveTask = useCallback(async (taskId: string) => {
    await updateTask(taskId, { archived: true });
  }, [updateTask]);

  // Cycle marker state for a specific day
  const cycleMarkerState = useCallback(async (taskId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const now = startOfDay(new Date());
    const targetDay = startOfDay(date);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const isCurrentWeek = targetDay >= weekStart && targetDay <= weekEnd;
    const isPastDay = isBefore(targetDay, now) && !isSameDay(targetDay, now);
    const isFutureWeek = targetDay > weekEnd;
    const isPastWeek = targetDay < weekStart;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const existingMarker = task.markers.find(m => m.date === dateStr);
    let newState: CircleState | null = null;

    if (isPastWeek) {
      return;
    } else if (isFutureWeek) {
      if (!existingMarker || existingMarker.state === 'empty') newState = 'planned';
      else if (existingMarker.state === 'planned') newState = null;
      else return;
    } else if (isCurrentWeek && isPastDay) {
      if (!existingMarker || existingMarker.state === 'empty' || existingMarker.state === 'planned') newState = 'started';
      else if (existingMarker.state === 'started') newState = 'completed';
      else if (existingMarker.state === 'completed') newState = null;
    } else {
      if (!existingMarker || existingMarker.state === 'empty') newState = 'planned';
      else if (existingMarker.state === 'planned') newState = 'started';
      else if (existingMarker.state === 'started') newState = 'completed';
      else if (existingMarker.state === 'completed') newState = null;
    }

    const id = parseInt(taskId, 10);
    const markerTimestamp = new Date().toISOString();

    if (newState === null) {
      await api.delete(`/api/DayMarkers/${id}/${dateStr}`);
    } else {
      await api.put(`/api/DayMarkers/${id}/${dateStr}`, { state: newState });
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      let newMarkers = [...t.markers];
      if (newState === null) {
        newMarkers = newMarkers.filter(m => m.date !== dateStr);
      } else if (existingMarker) {
        newMarkers = newMarkers.map(m => m.date === dateStr ? { ...m, state: newState, createdAt: markerTimestamp } : m);
      } else {
        newMarkers.push({ date: dateStr, state: newState, createdAt: markerTimestamp });
      }
      return { ...t, markers: newMarkers };
    }));
  }, [tasks]);

  // Add project
  const addProject = useCallback(async (name: string) => {
    if (!user) return null;

    const colors = [
      'hsl(150, 25%, 40%)',
      'hsl(200, 40%, 50%)',
      'hsl(15, 45%, 55%)',
      'hsl(280, 30%, 50%)',
      'hsl(45, 50%, 50%)',
    ];

    const dto = await api.post<ApiProject>('/api/Projects', {
      name,
      color: colors[projects.length % colors.length],
    });

    const newProject = mapProject(dto);
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, [user, projects.length]);

  // Update project
  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    const id = parseInt(projectId, 10);
    const body: Record<string, unknown> = {};
    if (updates.name  !== undefined) body.name  = updates.name;
    if (updates.color !== undefined) body.color = updates.color;
    if (updates.notes !== undefined) body.notes = updates.notes;

    if (Object.keys(body).length > 0) {
      await api.put(`/api/Projects/${id}`, body);
    }

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId: string) => {
    await api.delete(`/api/Projects/${parseInt(projectId, 10)}`);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.map(task => task.projectId === projectId ? { ...task, projectId: undefined } : task));
  }, []);

  // Sort tasks by date
  const sortTasksByDate = useCallback(async () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const getEarliest = (task: Task) => {
      const weekMarkers = task.markers
        .filter(m => { const d = new Date(m.date); return d >= weekStart && d <= weekEnd; })
        .map(m => new Date(m.date).getTime());
      return weekMarkers.length > 0 ? Math.min(...weekMarkers) : null;
    };

    const byProject = new Map<string | undefined, Task[]>();
    tasks.filter(t => !t.archived).forEach(t => {
      const arr = byProject.get(t.projectId) || [];
      arr.push(t);
      byProject.set(t.projectId, arr);
    });

    const updates: { id: string; sortOrder: number }[] = [];
    byProject.forEach(groupTasks => {
      groupTasks.sort((a, b) => {
        const aDate = getEarliest(a);
        const bDate = getEarliest(b);
        if (aDate !== null && bDate !== null) return aDate - bDate;
        if (aDate !== null) return -1;
        if (bDate !== null) return 1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      groupTasks.forEach((t, i) => { if (t.sortOrder !== i) updates.push({ id: t.id, sortOrder: i }); });
    });

    if (updates.length > 0) {
      setTasks(prev => prev.map(t => { const u = updates.find(u => u.id === t.id); return u ? { ...t, sortOrder: u.sortOrder } : t; }));
      await Promise.all(updates.map(u => api.patch(`/api/Tasks/${parseInt(u.id, 10)}/reorder`, { newSortOrder: u.sortOrder })));
    }
  }, [tasks]);

  const getEarliestWeekDate = useCallback((task: Task) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEndDate = endOfWeek(now, { weekStartsOn: 0 });
    const weekMarkers = task.markers
      .filter(m => { const d = new Date(m.date); return d >= weekStart && d <= weekEndDate; })
      .map(m => new Date(m.date).getTime());
    return weekMarkers.length > 0 ? Math.min(...weekMarkers) : null;
  }, []);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });

    let result = tasks.filter(task => {
      if (task.archived) return false;

      const completedMarkers = task.markers.filter(m => m.state === 'completed');
      const hasCompleted = completedMarkers.length > 0;

      if (hasCompleted) {
        const hasCompletedThisWeek = completedMarkers.some(m => { const d = new Date(m.date); return d >= currentWeekStart && d <= currentWeekEnd; });
        const hasAnyMarkerThisWeek = task.markers.some(m => { const d = new Date(m.date); return d >= currentWeekStart && d <= currentWeekEnd; });

        if (showCompleted === 'hide-all') {
          const allCompleted = completedMarkers.length === task.markers.length && task.markers.length > 0;
          if (allCompleted) return false;
        } else if (showCompleted === 'show-week') {
          if (!hasCompletedThisWeek && !hasAnyMarkerThisWeek) return false;
        }
      }

      if (selectedProjectFilter !== null) {
        if (selectedProjectFilter === 'no-project') { if (task.projectId) return false; }
        else { if (task.projectId !== selectedProjectFilter) return false; }
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const aDate = getEarliestWeekDate(a);
      const bDate = getEarliestWeekDate(b);
      if (aDate !== null && bDate !== null) return aDate - bDate;
      if (aDate !== null) return -1;
      if (bDate !== null) return 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return result;
  }, [tasks, showCompleted, selectedProjectFilter, getEarliestWeekDate]);

  const groupedTasks = useMemo(() => {
    const groups: { project: Project | null; tasks: Task[] }[] = [];
    const tasksByProject = new Map<string | null, Task[]>();

    filteredTasks.forEach(task => {
      const key = task.projectId || null;
      const existing = tasksByProject.get(key) || [];
      existing.push(task);
      tasksByProject.set(key, existing);
    });

    tasksByProject.forEach(groupTasks => groupTasks.sort((a, b) => a.sortOrder - b.sortOrder));

    projects.forEach(project => {
      const projectTasks = tasksByProject.get(project.id);
      if (projectTasks && projectTasks.length > 0) groups.push({ project, tasks: projectTasks });
    });

    const unassignedTasks = tasksByProject.get(null);
    if (unassignedTasks && unassignedTasks.length > 0) groups.push({ project: null, tasks: unassignedTasks });

    return groups;
  }, [filteredTasks, projects]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    groupedTasks,
    projects,
    weekInfo,
    currentWeekOffset,
    selectedTask,
    selectedTaskId,
    showCompleted,
    collapsedProjects,
    selectedProjectFilter,
    loading,
    setShowCompleted,
    setSelectedTaskId,
    setSelectedProjectFilter,
    toggleProjectCollapse,
    collapseAllProjects,
    expandAllProjects,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    reorderTask,
    cycleMarkerState,
    sortTasksByDate,
    addProject,
    updateProject,
    deleteProject,
  };
}
