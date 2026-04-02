-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create day_markers table
CREATE TABLE public.day_markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  state TEXT NOT NULL DEFAULT 'empty' CHECK (state IN ('empty', 'planned', 'started', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_markers ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view their own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Tasks RLS policies
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" 
  ON public.tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
  ON public.tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks FOR DELETE 
  USING (auth.uid() = user_id);

-- Day markers RLS policies (access through task ownership)
CREATE POLICY "Users can view markers for their tasks" 
  ON public.day_markers FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = day_markers.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can create markers for their tasks" 
  ON public.day_markers FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = day_markers.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can update markers for their tasks" 
  ON public.day_markers FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = day_markers.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can delete markers for their tasks" 
  ON public.day_markers FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = day_markers.task_id AND tasks.user_id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_day_markers_task_id ON public.day_markers(task_id);
CREATE INDEX idx_day_markers_date ON public.day_markers(date);