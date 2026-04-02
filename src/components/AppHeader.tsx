import { FolderOpen } from "lucide-react";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  onOpenProjects?: () => void;
}

export function AppHeader({ onOpenProjects }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 md:px-4 py-1.5 md:py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-primary" />
          </div>
          <div>
            <h1 className="font-display text-sm md:text-lg font-semibold text-foreground leading-tight">
              Tamelo - The Procrastinator's To Do List
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Low pressure. Real progress.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile projects button */}
        <button
          onClick={onOpenProjects}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Open projects"
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
