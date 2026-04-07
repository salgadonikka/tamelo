import { useState, useEffect, useMemo } from 'react';
import { Task, Project, TaskHistoryEntry } from '@/types/task';
import { X, Trash2, Archive, FolderOpen, Plus, Pencil, MessageSquare, CircleDot, Clock, FilePen, FolderInput, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTaskNotes, TaskNote } from '@/hooks/useTaskNotes';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskDetailProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onArchive: () => void;
}

type TimelineEntry =
  | { type: 'history'; event: TaskHistoryEntry; timestamp: string }
  | { type: 'note'; note: TaskNote; timestamp: string }
  | { type: 'created'; timestamp: string };

function historyLabel(event: TaskHistoryEntry, projects: Project[]): string {
  switch (event.eventType) {
    case 'title_updated':
      return event.oldValue
        ? `Title changed from "${event.oldValue}" to "${event.newValue}"`
        : `Title set to "${event.newValue}"`;
    case 'description_updated':
      if (!event.newValue) return 'Description removed';
      return event.oldValue ? 'Description updated' : 'Description added';
    case 'project_assigned': {
      const name = projects.find(p => p.id === event.newValue)?.name ?? event.newValue;
      return `Added to project: ${name}`;
    }
    case 'project_removed': {
      const name = projects.find(p => p.id === event.oldValue)?.name ?? event.oldValue;
      return `Removed from project: ${name}`;
    }
    case 'project_changed': {
      const from = projects.find(p => p.id === event.oldValue)?.name ?? event.oldValue;
      const to = projects.find(p => p.id === event.newValue)?.name ?? event.newValue;
      return `Moved from "${from}" to "${to}"`;
    }
    case 'archived':
      return 'Task archived';
    case 'unarchived':
      return 'Task unarchived';
    case 'marker_set':
      return `Marked as ${event.newValue} on ${event.fieldName ? format(new Date(event.fieldName), 'MMM d') : ''}`;
    case 'marker_updated':
      return `Changed from ${event.oldValue} to ${event.newValue} on ${event.fieldName ? format(new Date(event.fieldName), 'MMM d') : ''}`;
    case 'marker_removed':
      return `Removed ${event.oldValue} marker on ${event.fieldName ? format(new Date(event.fieldName), 'MMM d') : ''}`;
    default:
      return event.eventType.replace(/_/g, ' ');
  }
}

function historyIcon(eventType: TaskHistoryEntry['eventType']) {
  switch (eventType) {
    case 'title_updated':
    case 'description_updated':
      return <FilePen className="w-2.5 h-2.5 text-accent-foreground" />;
    case 'project_assigned':
    case 'project_removed':
    case 'project_changed':
      return <FolderInput className="w-2.5 h-2.5 text-accent-foreground" />;
    case 'archived':
    case 'unarchived':
      return <ArchiveRestore className="w-2.5 h-2.5 text-accent-foreground" />;
    case 'marker_set':
    case 'marker_updated':
    case 'marker_removed':
      return <CircleDot className="w-2.5 h-2.5 text-accent-foreground" />;
    default:
      return <Clock className="w-2.5 h-2.5 text-accent-foreground" />;
  }
}

function markerDotClass(state: string) {
  if (state === 'completed') return 'bg-circle-completed';
  if (state === 'started') return 'bg-circle-started';
  return 'bg-circle-empty';
}

export function TaskDetail({
  task,
  projects,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
}: TaskDetailProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.notes || '');
  const [projectId, setProjectId] = useState(task.projectId);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const { notes, addNote, updateNote, deleteNote } = useTaskNotes(task.id);
  const { history, addHistoryEvent, refetchHistory } = useTaskHistory(task.id);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.notes || '');
    setProjectId(task.projectId);
  }, [task]);

  // Refetch history when markers change (backend records marker history on each cycle)
  useEffect(() => {
    refetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.markers]);

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      await addHistoryEvent({ taskId: task.id, eventType: 'title_updated', oldValue: task.title, newValue: trimmed });
      onUpdate({ title: trimmed });
    }
  };

  const handleDescriptionBlur = async () => {
    const newDesc = description || undefined;
    if (description !== (task.notes || '')) {
      await addHistoryEvent({ taskId: task.id, eventType: 'description_updated', oldValue: task.notes ?? null, newValue: newDesc ?? null });
      onUpdate({ notes: newDesc });
    }
  };

  const handleProjectChange = async (newProjectId: string) => {
    const value = newProjectId === 'none' ? undefined : newProjectId;
    setProjectId(value);

    const hadProject = !!task.projectId;
    const hasNewProject = !!value;
    const eventType = hadProject && hasNewProject ? 'project_changed' : hasNewProject ? 'project_assigned' : 'project_removed';
    await addHistoryEvent({ taskId: task.id, eventType, oldValue: task.projectId ?? null, newValue: value ?? null });

    onUpdate({ projectId: value });
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    await addNote(newNoteContent.trim());
    setNewNoteContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    await updateNote(noteId, editingNoteContent.trim());
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const selectedProject = projects.find(p => p.id === projectId);

  // Build timeline: history events + notes + "created" anchor, sorted newest first
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    // History events (excludes 'created' — shown as the anchor entry below)
    history.forEach(h => {
      if (h.eventType !== 'created') {
        entries.push({ type: 'history', event: h, timestamp: h.createdAt });
      }
    });

    // User notes
    notes.forEach(n => {
      entries.push({ type: 'note', note: n, timestamp: n.createdAt });
    });

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Always show "Task created" as the final (oldest) anchor
    entries.push({ type: 'created', timestamp: task.createdAt });

    return entries;
  }, [history, notes, task.createdAt]);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Task Details
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Task
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="What needs doing?"
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Project
          </label>
          <Select value={projectId || 'none'} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  {selectedProject ? (
                    <>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 inline-block"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      {selectedProject.name}
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      No project
                    </>
                  )}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  No project
                </span>
              </SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 inline-block"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
            placeholder="Add a description..."
          />
        </div>

        {/* Add Note */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Add Note
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              placeholder="Write a note..."
            />
            <button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline / History */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-3">
            History
          </label>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-3">
              {timeline.map((entry, index) => {
                if (entry.type === 'created') {
                  return (
                    <div key="created" className="flex items-start gap-3 pl-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-card bg-muted">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-medium text-foreground">Task created</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (entry.type === 'history') {
                  const ev = entry.event;
                  const isMarkerEvent = ev.eventType.startsWith('marker_');
                  return (
                    <div key={`history-${ev.id}`} className="flex items-start gap-3 pl-1">
                      {isMarkerEvent ? (
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-card',
                          markerDotClass(ev.newValue ?? ev.oldValue ?? ''),
                        )}>
                          <CircleDot className="w-3 h-3 text-card" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-card bg-accent">
                          {historyIcon(ev.eventType)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-medium text-foreground">{historyLabel(ev, projects)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ev.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                }

                const note = entry.note;
                const isEditing = editingNoteId === note.id;
                return (
                  <div key={`note-${note.id}`} className="flex items-start gap-3 pl-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-card bg-accent">
                      <MessageSquare className="w-2.5 h-2.5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(note.id)}
                            className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(note.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-foreground break-words">{note.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <button
          onClick={onArchive}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
