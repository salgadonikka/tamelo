import { Project, Task } from '@/types/task';
import { cn } from '@/lib/utils';
import { FolderOpen, PanelLeftOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MiniProjectPanelProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectFilter?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  onExpand: () => void;
}

export function MiniProjectPanel({
  projects,
  tasks,
  selectedProjectFilter,
  onSelectProject,
  onExpand,
}: MiniProjectPanelProps) {
  const getTaskCount = (projectId: string) =>
    tasks.filter(t => t.projectId === projectId && !t.archived).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col bg-card border-r border-border w-14">
        {/* Expand button */}
        <div className="flex items-center justify-center p-2 border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onExpand}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>

        {/* All Tasks icon */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 flex flex-col items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectProject?.(null)}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  selectedProjectFilter === null
                    ? "bg-primary/10 ring-2 ring-primary/50"
                    : "hover:bg-muted"
                )}
                aria-label="All Tasks"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              All Tasks ({tasks.filter(t => !t.archived).length})
            </TooltipContent>
          </Tooltip>

          {/* Project icons */}
          {projects.map((project) => {
            const initial = project.name.charAt(0).toUpperCase();
            const count = getTaskCount(project.id);

            return (
              <Tooltip key={project.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectProject?.(project.id)}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors",
                      selectedProjectFilter === project.id
                        ? "ring-2 ring-primary/50"
                        : "hover:bg-muted"
                    )}
                    style={{ backgroundColor: `${project.color}25`, color: project.color }}
                    aria-label={project.name}
                  >
                    {initial}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {project.name} ({count})
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
