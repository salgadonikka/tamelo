-- Task history table to track all activity on a task
CREATE TABLE task_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL,
  event_type  TEXT        NOT NULL,
  -- field_name: which field changed, or the date (YYYY-MM-DD) for marker events
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_history_task_id_created ON task_history(task_id, created_at DESC);

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task history"
  ON task_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own task history"
  ON task_history FOR INSERT
  WITH CHECK (user_id = auth.uid());
