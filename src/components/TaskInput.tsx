import { useState, KeyboardEvent } from 'react';
import { Plus, Maximize2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/types/task';
import { NewTaskDialog } from './NewTaskDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskInputProps {
  onAdd: (title: string, projectId?: string, notes?: string) => void;
  projects: Project[];
}

export function TaskInput({ onAdd, projects }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onAdd(trimmed, projectId, notes || undefined);
      setTitle('');
      setProjectId(undefined);
      setNotes('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleDialogSave = () => {
    handleSubmit();
  };

  const handleDialogCancel = () => {
    setTitle('');
    setProjectId(undefined);
    setNotes('');
  };

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <>
      <div 
        className={cn(
          'flex items-center gap-2 px-4 py-3 border-b border-border transition-colors',
          isFocused && 'bg-secondary/30'
        )}
      >
        <button
          onClick={handleSubmit}
          className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="Add task"
        >
          <Plus className="w-5 h-5" />
        </button>
        
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Add a task... just write whatever's on your mind"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 font-body"
        />

        {/* Project dropdown */}
        <Select
          value={projectId || 'none'}
          onValueChange={(val) => setProjectId(val === 'none' ? undefined : val)}
        >
          <SelectTrigger className="w-[100px] md:w-[140px] h-8 text-xs bg-background border-border flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {selectedProject ? (
                <>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <span className="truncate">{selectedProject.name}</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Project</span>
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="none">
              <span className="text-muted-foreground">No Project</span>
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Maximize button */}
        <button
          onClick={() => setDialogOpen(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Expand task input"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* New Task Dialog */}
      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={title}
        onTitleChange={setTitle}
        projectId={projectId}
        onProjectChange={setProjectId}
        notes={notes}
        onNotesChange={setNotes}
        projects={projects}
        onSave={handleDialogSave}
        onCancel={handleDialogCancel}
      />
    </>
  );
}
