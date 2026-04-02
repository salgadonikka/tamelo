
CREATE TABLE public.task_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their tasks"
ON public.task_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_notes.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can create notes for their tasks"
ON public.task_notes FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_notes.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can update notes for their tasks"
ON public.task_notes FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_notes.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can delete notes for their tasks"
ON public.task_notes FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_notes.task_id AND tasks.user_id = auth.uid()));

CREATE TRIGGER handle_task_notes_updated_at
  BEFORE UPDATE ON public.task_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
