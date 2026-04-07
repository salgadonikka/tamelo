import { format, startOfDay, startOfWeek } from 'date-fns';
import { Task, WeekInfo, Project, CircleState } from '@/types/task';
import { TaskCircle } from './TaskCircle';
import { cn } from '@/lib/utils';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';


interface TaskRowProps {
  task: Task;
  weekInfo: WeekInfo;
  project?: Project;
  isSelected: boolean;
  onSelect: () => void;
  onCycleMarker: (date: Date) => void;
}

type ArrowDescriptor =
  | { type: 'same-week'; fromIndex: number; toIndex: number }
  | { type: 'outgoing'; fromIndex: number }
  | { type: 'incoming'; toIndex: number };

export function TaskRow({
  task,
  weekInfo,
  project,
  isSelected,
  onSelect,
  onCycleMarker
}: TaskRowProps) {
  const deviceType = useDeviceType();
  const colWidth = deviceType !== 'mobile' ? 40 : 32;
  const gutterWidth = deviceType !== 'mobile' ? 24 : 20;
  const circleRadius = 12; // w-6 = 24px → r = 12
  const arrowY = 20; // py-2 (8px) + half-circle (12px)

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

  // Compute rollover arrows: draw arrows between consecutive planned/started markers
  const arrowDescriptors = useMemo<ArrowDescriptor[]>(() => {
    const sortedMarkers = [...task.markers]
      .filter(m => m.state !== 'empty')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedMarkers.length < 2) return [];

    const visibleDateStrings = visibleDays.map(d => format(d, 'yyyy-MM-dd'));
    const viewStartStr = visibleDateStrings[0];
    const viewEndStr = visibleDateStrings[visibleDateStrings.length - 1];

    const results: ArrowDescriptor[] = [];

    for (let i = 0; i < sortedMarkers.length - 1; i++) {
      const src = sortedMarkers[i];
      // Only planned/started markers trigger a rollover arrow
      if (src.state !== 'planned' && src.state !== 'started') continue;

      const dst = sortedMarkers[i + 1];
      const fromIndex = visibleDateStrings.indexOf(src.date);
      const toIndex = visibleDateStrings.indexOf(dst.date);

      if (fromIndex >= 0 && toIndex >= 0) {
        results.push({ type: 'same-week', fromIndex, toIndex });
      } else if (fromIndex >= 0 && dst.date > viewEndStr) {
        results.push({ type: 'outgoing', fromIndex });
      } else if (src.date < viewStartStr && toIndex >= 0) {
        results.push({ type: 'incoming', toIndex });
      }
    }

    return results;
  }, [task.markers, visibleDays]);

  const markerId = `rollover-arrow-${task.id}`;

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
        <div className="flex day-columns-grid relative">
          {/* Rollover arrows overlay */}
          {arrowDescriptors.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={markerId}
                  markerWidth="5"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 5 2, 0 4"
                    className="fill-muted-foreground/50"
                  />
                </marker>
              </defs>
              {arrowDescriptors.map((arrow, i) => {
                if (arrow.type === 'same-week') {
                  const x1 = arrow.fromIndex * colWidth + colWidth / 2 + circleRadius + 1;
                  const x2 = arrow.toIndex * colWidth + colWidth / 2 - circleRadius - 1;
                  return (
                    <line
                      key={i}
                      x1={x1} y1={arrowY}
                      x2={x2} y2={arrowY}
                      strokeWidth="1"
                      className="stroke-muted-foreground/40"
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                }
                if (arrow.type === 'outgoing') {
                  const x1 = arrow.fromIndex * colWidth + colWidth / 2 + circleRadius + 1;
                  const x2 = visibleDays.length * colWidth + gutterWidth - 2;
                  return (
                    <line
                      key={i}
                      x1={x1} y1={arrowY}
                      x2={x2} y2={arrowY}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                      className="stroke-muted-foreground/40"
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                }
                if (arrow.type === 'incoming') {
                  const x1 = -gutterWidth + 2;
                  const x2 = arrow.toIndex * colWidth + colWidth / 2 - circleRadius - 1;
                  return (
                    <line
                      key={i}
                      x1={x1} y1={arrowY}
                      x2={x2} y2={arrowY}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                      className="stroke-muted-foreground/40"
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                }
                return null;
              })}
            </svg>
          )}
          {visibleDays.map((day) => {
            const state = getMarkerState(day);
            const editable = canEdit(day);
            return (
              <div key={day.toISOString()} className="w-8 md:w-10 flex justify-center py-2 relative z-10">
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
