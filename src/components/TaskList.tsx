import { Task, WeekInfo, Project } from '@/types/task';
import { TaskRow } from './TaskRow';
import { TaskInput } from './TaskInput';
import { WeekHeader } from './WeekHeader';
import { Eye, EyeOff, ChevronDown, ChevronRight, FolderOpen, Folder, CheckCircle2, ArrowUpDown } from 'lucide-react';
import { CompletedVisibility } from '@/hooks/useTaskStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TaskGroup {
  project: Project | null;
  tasks: Task[];
}

interface TaskListProps {
  tasks: Task[];
  groupedTasks: TaskGroup[];
  projects: Project[];
  weekInfo: WeekInfo;
  currentWeekOffset: number;
  selectedTaskId: string | null;
  completedVisibility: CompletedVisibility;
  collapsedProjects: Set<string>;
  onCompletedVisibilityChange: (v: CompletedVisibility) => void;
  onToggleCollapse: (projectId: string) => void;
  onSelectTask: (taskId: string | null) => void;
  onAddTask: (title: string, projectId?: string, notes?: string) => void;
  onCycleMarker: (taskId: string, date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onReorderTask: (taskId: string, newProjectId: string | undefined, newSortOrder: number) => void;
  onSortByDate: () => void;
}

const completedLabels: Record<CompletedVisibility, { icon: typeof Eye; label: string }> = {
  'show-week': { icon: Eye, label: 'This week' },
  'hide-all': { icon: EyeOff, label: 'Hidden' },
  'show-all': { icon: CheckCircle2, label: 'All' },
};

export function TaskList({
  tasks,
  groupedTasks,
  projects,
  weekInfo,
  currentWeekOffset,
  selectedTaskId,
  completedVisibility,
  collapsedProjects,
  onCompletedVisibilityChange,
  onToggleCollapse,
  onSelectTask,
  onAddTask,
  onCycleMarker,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onReorderTask,
  onSortByDate,
}: TaskListProps) {
  const getProject = (projectId?: string) =>
    projects.find(p => p.id === projectId);

  const getProjectId = (project: Project | null) =>
    project?.id || 'no-project';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allTaskIds = groupedTasks.flatMap(g => g.tasks.map(t => t.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetProjectId: string | undefined;
    let targetIndex = 0;

    for (const group of groupedTasks) {
      const overIndex = group.tasks.findIndex(t => t.id === overId);
      if (overIndex !== -1) {
        targetProjectId = group.project?.id;
        targetIndex = overIndex;
        break;
      }
    }

    onReorderTask(activeId, targetProjectId, targetIndex);
  };

  const CurrentIcon = completedLabels[completedVisibility].icon;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Frozen header section */}
      <div className="flex-shrink-0 bg-background z-10">
        <div className="flex items-center justify-between px-3 md:px-4 py-1 md:py-2 border-b border-border gap-2">
          <h1 className="font-display text-sm md:text-lg font-semibold text-foreground">Tasks</h1>
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onSortByDate}
                    className="flex items-center text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors px-1.5 md:px-2 py-1 rounded-md hover:bg-muted/50"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Sort by date</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors px-1.5 md:px-2 py-1 rounded-md hover:bg-muted/50">
                <CurrentIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{completedLabels[completedVisibility].label}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                <DropdownMenuItem onClick={() => onCompletedVisibilityChange('show-week')}>
                  <Eye className="w-4 h-4 mr-2" /> This week's completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCompletedVisibilityChange('hide-all')}>
                  <EyeOff className="w-4 h-4 mr-2" /> Hide all completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCompletedVisibilityChange('show-all')}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Show all completed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="px-3 md:px-4 pt-2 md:pt-4">
          <WeekHeader
            weekInfo={weekInfo}
            currentWeekOffset={currentWeekOffset}
            onPreviousWeek={onPreviousWeek}
            onNextWeek={onNextWeek}
            onCurrentWeek={onCurrentWeek}
          />
        </div>

        <TaskInput onAdd={onAddTask} projects={projects} />
      </div>

      {/* Scrollable task list with DnD */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-display text-lg">No tasks yet</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Add whatever's on your mind. No pressure.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border/30">
                {groupedTasks.map(({ project, tasks: groupTasks }) => {
                  const projectId = getProjectId(project);
                  const isCollapsed = collapsedProjects.has(projectId);

                  return (
                    <Collapsible
                      key={projectId}
                      open={!isCollapsed}
                      onOpenChange={() => onToggleCollapse(projectId)}
                    >
                      <CollapsibleTrigger className="block w-full min-w-0 max-w-full overflow-hidden text-left">
                        <div className={cn(
                          "flex w-full min-w-0 max-w-full items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer overflow-hidden",
                          "border-l-2",
                          project ? "" : "border-l-muted-foreground/30"
                        )} style={project ? { borderLeftColor: project.color } : undefined}>
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          {isCollapsed ? (
                            <Folder className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="block flex-1 min-w-0 truncate whitespace-nowrap text-left font-medium text-sm text-foreground">
                            {project?.name || 'No Project'}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap tabular-nums">
                            ({groupTasks.length})
                          </span>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="divide-y divide-border/50">
                          {groupTasks.map((task) => (
                            <div key={task.id} className="pl-1 md:pl-4">
                              <TaskRow
                                task={task}
                                weekInfo={weekInfo}
                                project={getProject(task.projectId)}
                                isSelected={task.id === selectedTaskId}
                                onSelect={() => onSelectTask(task.id === selectedTaskId ? null : task.id)}
                                onCycleMarker={(date) => onCycleMarker(task.id, date)}
                              />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
