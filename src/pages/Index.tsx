import { useState } from 'react';
import { useTaskStore } from '@/hooks/useTaskStore';
import { TaskList } from '@/components/TaskList';
import { TaskDetail } from '@/components/TaskDetail';
import { ProjectPanel } from '@/components/ProjectPanel';
import { MiniProjectPanel } from '@/components/MiniProjectPanel';
import { MobileOverlay } from '@/components/MobileOverlay';
import { AppHeader } from '@/components/AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const {
    tasks,
    allTasks,
    groupedTasks,
    projects,
    weekInfo,
    currentWeekOffset,
    selectedTask,
    selectedTaskId,
    showCompleted,
    collapsedProjects,
    selectedProjectFilter,
    loading,
    setShowCompleted,
    setSelectedTaskId,
    setSelectedProjectFilter,
    toggleProjectCollapse,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    cycleMarkerState,
    addProject,
    deleteProject,
    reorderTask,
    sortTasksByDate,
  } = useTaskStore();

  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean | null>(null);

  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
  const effectiveSidebarExpanded = sidebarExpanded ?? !isTablet;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AppHeader onOpenProjects={() => setMobileProjectsOpen(true)} />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 md:border-r md:border-border min-h-0 flex flex-col min-w-0 overflow-hidden">
          <TaskList
            tasks={tasks}
            groupedTasks={groupedTasks}
            projects={projects}
            weekInfo={weekInfo}
            currentWeekOffset={currentWeekOffset}
            selectedTaskId={selectedTaskId}
            completedVisibility={showCompleted}
            collapsedProjects={collapsedProjects}
            onCompletedVisibilityChange={setShowCompleted}
            onToggleCollapse={toggleProjectCollapse}
            onSelectTask={setSelectedTaskId}
            onAddTask={addTask}
            onCycleMarker={cycleMarkerState}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onCurrentWeek={goToCurrentWeek}
            onReorderTask={reorderTask}
            onSortByDate={sortTasksByDate}
          />
        </div>

        {/* Right panel - Desktop/Tablet only (independent scroll) */}
        <div className="hidden md:flex md:flex-col min-h-0 flex-shrink-0">
          {selectedTask ? (
            <div className="w-72 lg:w-80 xl:w-96 flex-1 overflow-y-auto">
              <TaskDetail
                task={selectedTask}
                projects={projects}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={(updates) => updateTask(selectedTask.id, updates)}
                onDelete={() => deleteTask(selectedTask.id)}
                onArchive={() => archiveTask(selectedTask.id)}
              />
            </div>
          ) : effectiveSidebarExpanded ? (
            <div className="w-72 lg:w-80 xl:w-96 flex-1 overflow-y-auto">
              <ProjectPanel
                projects={projects}
                tasks={allTasks}
                selectedProjectFilter={selectedProjectFilter}
                onAddProject={addProject}
                onDeleteProject={deleteProject}
                onSelectProject={(id) => setSelectedProjectFilter(id)}
                onCollapse={() => setSidebarExpanded(false)}
              />
            </div>
          ) : (
            <MiniProjectPanel
              projects={projects}
              tasks={allTasks}
              selectedProjectFilter={selectedProjectFilter}
              onSelectProject={(id) => setSelectedProjectFilter(id)}
              onExpand={() => setSidebarExpanded(true)}
            />
          )}
        </div>
      </div>

      {/* Mobile overlays */}
      <MobileOverlay
        isOpen={mobileProjectsOpen}
        onClose={() => setMobileProjectsOpen(false)}
        title="Projects"
      >
        <ProjectPanel
          projects={projects}
          tasks={allTasks}
          selectedProjectFilter={selectedProjectFilter}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onSelectProject={(id) => setSelectedProjectFilter(id)}
        />
      </MobileOverlay>

      <MobileOverlay
        isOpen={!!selectedTask && isMobile}
        onClose={() => setSelectedTaskId(null)}
        title="Task Details"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            projects={projects}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(updates) => updateTask(selectedTask.id, updates)}
            onDelete={() => deleteTask(selectedTask.id)}
            onArchive={() => archiveTask(selectedTask.id)}
          />
        )}
      </MobileOverlay>
    </div>
  );
};

export default Index;
