import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minimize2 } from 'lucide-react';
import { Project } from '@/types/task';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (title: string) => void;
  projectId: string | undefined;
  onProjectChange: (projectId: string | undefined) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  projects: Project[];
  onSave: () => void;
  onCancel: () => void;
}

export function NewTaskDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  projectId,
  onProjectChange,
  notes,
  onNotesChange,
  projects,
  onSave,
  onCancel,
}: NewTaskDialogProps) {
  const handleMinimize = () => {
    onOpenChange(false);
  };

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="font-display text-lg">New Task</DialogTitle>
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Minimize dialog"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Task title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Task Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring font-body"
              autoFocus
            />
          </div>

          {/* Project dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project</label>
            <Select
              value={projectId || 'none'}
              onValueChange={(val) => onProjectChange(val === 'none' ? undefined : val)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="No Project" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="none">No Project</SelectItem>
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
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any notes or details..."
              className="min-h-[120px] bg-background resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
