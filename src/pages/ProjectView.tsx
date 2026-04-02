import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Task, Project, CircleState } from '@/types/task';
import { AppHeader } from '@/components/AppHeader';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

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

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // Fetch project + tasks
  useEffect(() => {
    if (!user || !projectId) return;

    const numericId = parseInt(projectId, 10);
    if (isNaN(numericId)) return;

    const fetchData = async () => {
      setLoading(true);

      const [projData, allTasks] = await Promise.all([
        api.get<ApiProject>(`/api/Projects/${numericId}`),
        api.get<ApiTask[]>('/api/Tasks'),
      ]);

      const p: Project = {
        id: projData.id.toString(),
        name: projData.name,
        color: projData.color ?? undefined,
        notes: projData.notes ?? undefined,
        createdAt: projData.createdAt,
      };
      setProject(p);
      setNotesValue(p.notes || '');

      const projectTasks = allTasks
        .filter(t => t.projectId === numericId && !t.archived)
        .map(mapTask);
      setTasks(projectTasks);

      setLoading(false);
    };

    fetchData().catch(err => {
      console.error('Error loading project:', err);
      setLoading(false);
    });
  }, [user, projectId]);

  // Save project description
  const saveNotes = useCallback(async () => {
    if (!projectId || !project) return;
    const numericId = parseInt(projectId, 10);

    try {
      await api.put(`/api/Projects/${numericId}`, {
        id: numericId,
        name: project.name,
        color: project.color ?? null,
        notes: notesValue || null,
      });
      setProject(prev => prev ? { ...prev, notes: notesValue || undefined } : prev);
      toast.success('Description saved');
    } catch {
      toast.error('Failed to save description');
    }
    setEditingNotes(false);
  }, [projectId, project, notesValue]);

  // Add/update a marker
  const addMarker = useCallback(async (taskId: string, date: string, state: CircleState) => {
    const numericTaskId = parseInt(taskId, 10);
    await api.put(`/api/DayMarkers/${numericTaskId}/${date}`, { state });

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newMarkers = [...t.markers];
      const idx = newMarkers.findIndex(m => m.date === date);
      if (idx >= 0) {
        newMarkers[idx] = { ...newMarkers[idx], state };
      } else {
        newMarkers.push({ date, state });
      }
      return { ...t, markers: newMarkers };
    }));
  }, []);

  // Remove a marker
  const removeMarker = useCallback(async (taskId: string, date: string) => {
    const numericTaskId = parseInt(taskId, 10);
    await api.delete(`/api/DayMarkers/${numericTaskId}/${date}`);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, markers: t.markers.filter(m => m.date !== date) };
    }));
  }, []);

  // Categorize tasks into kanban columns
  const columns = useMemo(() => {
    const toBePlanned: Task[] = [];
    const planned: Task[] = [];
    const ongoing: Task[] = [];
    const completed: Task[] = [];

    tasks.forEach(task => {
      const hasCompleted = task.markers.some(m => m.state === 'completed');
      const hasStarted = task.markers.some(m => m.state === 'started');
      const hasPlanned = task.markers.some(m => m.state === 'planned');
      const hasAnyMarker = task.markers.length > 0;

      if (hasCompleted) {
        completed.push(task);
      } else if (hasStarted) {
        ongoing.push(task);
      } else if (hasPlanned || (hasAnyMarker && !hasCompleted && !hasStarted)) {
        planned.push(task);
      } else {
        toBePlanned.push(task);
      }
    });

    const sortDesc = (a: Task, b: Task) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    return {
      toBePlanned: toBePlanned.sort(sortDesc),
      planned: planned.sort(sortDesc),
      ongoing: ongoing.sort(sortDesc),
      completed: completed.sort(sortDesc),
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AppHeader />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Project header */}
        <div className="flex-shrink-0 border-b border-border px-4 md:px-6 py-4 md:py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to tasks
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              {project.name}
            </h1>
          </div>

          {/* Editable description */}
          {editingNotes ? (
            <div className="max-w-xl">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add a project description..."
                className="min-h-[80px] bg-background"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveNotes}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setNotesValue(project.notes || '');
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left max-w-xl"
            >
              {project.notes || 'Add a description...'}
            </button>
          )}
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          <KanbanBoard
            columns={columns}
            projectColor={project.color}
            onMoveTask={async (taskId, targetColumn) => {
              return await handleMoveTask(taskId, targetColumn);
            }}
            onDateAssigned={async (taskId, date) => {
              await addMarker(taskId, date, 'planned');
            }}
            onDateRemoved={async (taskId, date) => {
              await removeMarker(taskId, date);
            }}
          />
        </div>
      </div>
    </div>
  );

  async function handleMoveTask(taskId: string, targetColumn: string): Promise<boolean> {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (targetColumn === 'completed') {
      const today = new Date().toISOString().split('T')[0];
      const latestMarker = [...task.markers]
        .filter(m => m.state === 'planned' || m.state === 'started')
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (latestMarker) {
        await addMarker(taskId, latestMarker.date, 'completed');
      } else {
        await addMarker(taskId, today, 'completed');
      }
      return true;
    }

    if (targetColumn === 'ongoing') {
      const today = new Date().toISOString().split('T')[0];
      const latestPlanned = [...task.markers]
        .filter(m => m.state === 'planned')
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (latestPlanned) {
        await addMarker(taskId, latestPlanned.date, 'started');
      } else {
        await addMarker(taskId, today, 'started');
      }
      return true;
    }

    if (targetColumn === 'planned') {
      const hasPlannedDate = task.markers.some(m => m.state === 'planned');
      if (!hasPlannedDate) return false;
      return true;
    }

    if (targetColumn === 'toBePlanned') {
      for (const marker of task.markers.filter(m => m.state !== 'completed')) {
        await removeMarker(taskId, marker.date);
      }
      return true;
    }

    return true;
  }
}
