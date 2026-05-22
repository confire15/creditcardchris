CREATE TABLE IF NOT EXISTS public.user_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL,
  action_type text NOT NULL,
  title text NOT NULL,
  rationale text NOT NULL,
  priority integer NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  confidence numeric(4,3) NOT NULL DEFAULT 0.75 CHECK (confidence >= 0 AND confidence <= 1),
  source_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
  proposed_action jsonb DEFAULT '{}'::jsonb NOT NULL,
  value_estimate_cents integer,
  due_at timestamptz,
  expires_at timestamptz,
  snoozed_until timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'started', 'completed', 'dismissed', 'snoozed', 'stale')),
  recurrence_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_actions_user_recurrence
  ON public.user_actions(user_id, recurrence_key);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_status_priority
  ON public.user_actions(user_id, status, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_due
  ON public.user_actions(user_id, due_at)
  WHERE status IN ('active', 'started', 'snoozed');

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own actions" ON public.user_actions;
CREATE POLICY "Users manage own actions"
  ON public.user_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
