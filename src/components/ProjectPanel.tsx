import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, Task } from '@/types/task';
import { Plus, FolderOpen, MoreHorizontal, Trash2, Archive, PanelLeftClose, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectPanelProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectFilter?: string | null;
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectProject?: (projectId: string | null) => void;
  onCollapse?: () => void;
}

export function ProjectPanel({
  projects,
  tasks,
  selectedProjectFilter,
  onAddProject,
  onDeleteProject,
  onSelectProject,
  onCollapse,
}: ProjectPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAddProject = () => {
    const trimmed = newProjectName.trim();
    if (trimmed) {
      onAddProject(trimmed);
      setNewProjectName('');
      setIsAdding(false);
    }
  };

  const getTaskCount = (projectId: string) => 
    tasks.filter(t => t.projectId === projectId && !t.archived).length;

  const getCompletedCount = (projectId: string) =>
    tasks.filter(t => 
      t.projectId === projectId && 
      !t.archived && 
      t.markers.some(m => m.state === 'completed')
    ).length;

  // Count unassigned tasks
  const unassignedCount = tasks.filter(t => !t.projectId && !t.archived).length;
  const archivedCount = tasks.filter(t => t.archived).length;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Projects
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Add project"
          >
            <Plus className="w-5 h-5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Add project input */}
        {isAdding && (
          <div className="paper-card p-3 animate-fade-up">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddProject();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewProjectName('');
                }
              }}
              onBlur={() => {
                if (!newProjectName.trim()) {
                  setIsAdding(false);
                }
              }}
              placeholder="Project name..."
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewProjectName('');
                }}
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* All tasks tile */}
        <div 
          className={cn(
            "project-tile cursor-pointer transition-colors",
            selectedProjectFilter === null && "ring-2 ring-primary/50 bg-primary/5"
          )}
          onClick={() => onSelectProject?.(null)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">All Tasks</h3>
              <p className="text-xs text-muted-foreground">
                {tasks.filter(t => !t.archived).length} tasks
              </p>
            </div>
          </div>
        </div>

        {/* Project tiles */}
        {projects.map((project) => {
          const taskCount = getTaskCount(project.id);
          const completedCount = getCompletedCount(project.id);
          
          return (
            <div 
              key={project.id} 
              className={cn(
                "project-tile relative group cursor-pointer transition-colors",
                selectedProjectFilter === project.id && "ring-2 ring-primary/50 bg-primary/5"
              )}
              onClick={() => onSelectProject?.(project.id)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${project.color}20` }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {taskCount} tasks · {completedCount} done
                  </p>
                </div>
                
                {/* Menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === project.id ? null : project.id);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Dropdown menu */}
              {menuOpenId === project.id && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/${project.id}`);
                      setMenuOpenId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                      setMenuOpenId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned tasks */}
        {unassignedCount > 0 && (
          <div 
            className={cn(
              "project-tile opacity-70 cursor-pointer transition-colors",
              selectedProjectFilter === 'no-project' && "ring-2 ring-primary/50 bg-primary/5 opacity-100"
            )}
            onClick={() => onSelectProject?.('no-project')}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-muted-foreground/40" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-muted-foreground">No Project</h3>
                <p className="text-xs text-muted-foreground/70">
                  {unassignedCount} tasks
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Archive */}
        {archivedCount > 0 && (
          <div className="project-tile opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Archive className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-muted-foreground">Archive</h3>
                <p className="text-xs text-muted-foreground/70">
                  {archivedCount} tasks
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Projects help organize, but aren't required
        </p>
      </div>
    </div>
  );
}
