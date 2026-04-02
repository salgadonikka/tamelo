import { useState } from 'react';
import { format } from 'date-fns';
import { Task } from '@/types/task';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Calendar, GripVertical, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface KanbanCardProps {
  task: Task;
  projectColor?: string;
  isDragOverlay?: boolean;
  showDatePicker?: boolean;
  onDateSelected?: (date: string) => void;
  onDateCancelled?: () => void;
  onDateAssigned?: (taskId: string, date: string) => Promise<void>;
  onDateRemoved?: (taskId: string, date: string) => Promise<void>;
}

export function KanbanCard({
  task,
  projectColor,
  isDragOverlay,
  showDatePicker,
  onDateSelected,
  onDateCancelled,
  onDateAssigned,
  onDateRemoved,
}: KanbanCardProps) {
  const [editDateOpen, setEditDateOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Get relevant dates from markers
  const activeDates = task.markers
    .filter(m => m.state !== 'empty')
    .sort((a, b) => a.date.localeCompare(b.date));

  const latestDate = activeDates.length > 0 ? activeDates[activeDates.length - 1] : null;

  if (isDragOverlay) {
    return (
      <div className="paper-card p-3 w-64 md:w-72 opacity-90 shadow-lg rotate-2">
        <p className="text-sm text-foreground font-medium">{task.title}</p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "paper-card p-3 group transition-shadow",
        isDragging && "opacity-30",
        "hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium break-words line-clamp-3">
            {task.title}
          </p>

          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">
              {task.notes}
            </p>
          )}

          {/* Date display / edit */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {activeDates.map(marker => (
              <span
                key={marker.date}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md",
                  marker.state === 'completed' && "bg-primary/15 text-primary",
                  marker.state === 'started' && "bg-accent text-accent-foreground",
                  marker.state === 'planned' && "bg-muted text-muted-foreground"
                )}
              >
                {format(new Date(marker.date + 'T00:00:00'), 'MMM d')}
                {onDateRemoved && marker.state !== 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateRemoved(task.id, marker.date);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {/* Add/edit date button */}
            <Popover open={showDatePicker || editDateOpen} onOpenChange={(open) => {
              if (!open && showDatePicker) {
                onDateCancelled?.();
              }
              setEditDateOpen(open);
            }}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {activeDates.length === 0 ? 'Set date' : '+'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={latestDate ? new Date(latestDate.date + 'T00:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      if (showDatePicker) {
                        onDateSelected?.(dateStr);
                      } else {
                        onDateAssigned?.(task.id, dateStr);
                      }
                      setEditDateOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
