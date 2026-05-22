CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_type text NOT NULL,
  prompt_version text NOT NULL,
  model_provider text,
  status text NOT NULL DEFAULT 'running',
  compact_input_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  error text,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agent_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  priority integer NOT NULL DEFAULT 50,
  confidence numeric(4,3) NOT NULL DEFAULT 0.75,
  title text NOT NULL,
  rationale text NOT NULL,
  source_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
  proposed_action jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid REFERENCES public.agent_recommendations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_created
  ON public.agent_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_recommendations_user_status
  ON public.agent_recommendations(user_id, status, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_recommendations_run
  ON public.agent_recommendations(run_id);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_recommendation
  ON public.agent_feedback(recommendation_id);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own agent runs" ON public.agent_runs;
DROP POLICY IF EXISTS "Users manage own agent recommendations" ON public.agent_recommendations;
DROP POLICY IF EXISTS "Users manage own agent feedback" ON public.agent_feedback;

CREATE POLICY "Users manage own agent runs"
  ON public.agent_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own agent recommendations"
  ON public.agent_recommendations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own agent feedback"
  ON public.agent_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
