
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_archive_days integer NOT NULL DEFAULT 30;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
