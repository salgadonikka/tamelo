import { Task } from '@/types/task';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  emptyText: string;
  tasks: Task[];
  projectColor?: string;
  pendingDateTaskId: string | null;
  onDateSelected: (taskId: string, date: string) => Promise<void>;
  onDateCancelled: () => void;
  onDateAssigned: (taskId: string, date: string) => Promise<void>;
  onDateRemoved: (taskId: string, date: string) => Promise<void>;
}

export function KanbanColumn({
  id,
  title,
  emptyText,
  tasks,
  projectColor,
  pendingDateTaskId,
  onDateSelected,
  onDateCancelled,
  onDateAssigned,
  onDateRemoved,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-64 md:w-72 flex-shrink-0 rounded-xl border border-border bg-card/50 transition-colors",
        isOver && "border-primary/50 bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-6">{emptyText}</p>
        ) : (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              projectColor={projectColor}
              showDatePicker={pendingDateTaskId === task.id}
              onDateSelected={(date) => onDateSelected(task.id, date)}
              onDateCancelled={onDateCancelled}
              onDateAssigned={onDateAssigned}
              onDateRemoved={onDateRemoved}
            />
          ))
        )}
      </div>
    </div>
  );
}
