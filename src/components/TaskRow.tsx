import { format, startOfDay, startOfWeek } from 'date-fns';
import { Task, WeekInfo, Project, CircleState } from '@/types/task';
import { TaskCircle } from './TaskCircle';
import { cn } from '@/lib/utils';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface TaskRowProps {
  task: Task;
  weekInfo: WeekInfo;
  project?: Project;
  isSelected: boolean;
  onSelect: () => void;
  onCycleMarker: (date: Date) => void;
}

export function TaskRow({ 
  task, 
  weekInfo, 
  project, 
  isSelected,
  onSelect,
  onCycleMarker 
}: TaskRowProps) {
  const now = startOfDay(new Date());
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
  const visibleDays = weekInfo.days;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getMarkerState = (date: Date): CircleState => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const marker = task.markers.find(m => m.date === dateStr);
    return marker?.state || 'empty';
  };

  const canEdit = (date: Date): boolean => {
    const targetDay = startOfDay(date);
    const isPastWeek = targetDay < currentWeekStart;
    return !isPastWeek;
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        'task-row group min-w-0 overflow-hidden',
        isSelected && 'bg-primary/5 border-l-2 border-l-primary',
        isDragging && 'opacity-50 z-50 shadow-lg bg-background'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 md:p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
      >
        <GripVertical className="w-3 h-3 md:w-4 md:h-4" />
      </button>

      {/* Task info - clickable area */}
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 overflow-hidden text-left flex items-center gap-1.5 md:gap-3 group"
      >
        {project && (
          <div 
            className="w-0.5 md:w-1 h-5 md:h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
        )}
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={cn(
            'text-sm md:text-base text-foreground break-words line-clamp-2',
            task.markers.some(m => m.state === 'completed') && 'text-muted-foreground'
          )}>
            {task.title}
          </p>
          {task.notes && (
            <p className="text-xs text-muted-foreground break-words line-clamp-1 mt-0.5">
              {task.notes}
            </p>
          )}
        </div>

        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>

      {/* Day circles */}
      <div className="flex items-center flex-shrink-0">
        <div className="w-[20px] md:w-6" />
        <div className="flex day-columns-grid">
          {visibleDays.map((day) => {
            const state = getMarkerState(day);
            const editable = canEdit(day);
            return (
              <div key={day.toISOString()} className="w-8 md:w-10 flex justify-center py-2">
                <TaskCircle
                  state={state}
                  onClick={() => onCycleMarker(day)}
                  disabled={!editable}
                  size="md"
                />
              </div>
            );
          })}
        </div>
        <div className="w-[20px] md:w-6" />
      </div>
    </div>
  );
}
