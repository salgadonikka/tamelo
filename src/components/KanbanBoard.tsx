import { useState } from 'react';
import { Task } from '@/types/task';
import { KanbanColumn } from './KanbanColumn';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';

interface KanbanColumns {
  toBePlanned: Task[];
  planned: Task[];
  ongoing: Task[];
  completed: Task[];
}

interface KanbanBoardProps {
  columns: KanbanColumns;
  projectColor?: string;
  onMoveTask: (taskId: string, targetColumn: string) => Promise<boolean>;
  onDateAssigned: (taskId: string, date: string) => Promise<void>;
  onDateRemoved: (taskId: string, date: string) => Promise<void>;
}

const COLUMN_CONFIG = [
  { id: 'toBePlanned', title: 'To be planned', emptyText: 'No unplanned tasks' },
  { id: 'planned', title: 'Planned', emptyText: 'No planned tasks' },
  { id: 'ongoing', title: 'Ongoing', emptyText: 'No ongoing tasks' },
  { id: 'completed', title: 'Completed', emptyText: 'No completed tasks' },
] as const;

export function KanbanBoard({ columns, projectColor, onMoveTask, onDateAssigned, onDateRemoved }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDateTask, setPendingDateTask] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const allTasks = [...columns.toBePlanned, ...columns.planned, ...columns.ongoing, ...columns.completed];
  const activeTask = allTasks.find(t => t.id === activeId);

  const getColumnForTask = (taskId: string): string | null => {
    for (const [key, tasks] of Object.entries(columns)) {
      if (tasks.some(t => t.id === taskId)) return key;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumn: string | null = null;

    // Check if dropped on a column droppable
    if (['toBePlanned', 'planned', 'ongoing', 'completed'].includes(overId)) {
      targetColumn = overId;
    } else {
      // Dropped on another task — find its column
      targetColumn = getColumnForTask(overId);
    }

    if (!targetColumn) return;

    const sourceColumn = getColumnForTask(taskId);
    if (sourceColumn === targetColumn) return;

    const allowed = await onMoveTask(taskId, targetColumn);
    if (!allowed && targetColumn === 'planned') {
      // Need to show date picker
      setPendingDateTask(taskId);
    }
  };

  const handleDateSelected = async (taskId: string, date: string) => {
    await onDateAssigned(taskId, date);
    setPendingDateTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 md:p-6 h-full min-w-max">
        {COLUMN_CONFIG.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            emptyText={col.emptyText}
            tasks={columns[col.id]}
            projectColor={projectColor}
            pendingDateTaskId={col.id === 'planned' ? pendingDateTask : null}
            onDateSelected={handleDateSelected}
            onDateCancelled={() => setPendingDateTask(null)}
            onDateAssigned={onDateAssigned}
            onDateRemoved={onDateRemoved}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanCard task={activeTask} projectColor={projectColor} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
