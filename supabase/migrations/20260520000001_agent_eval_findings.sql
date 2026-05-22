CREATE TABLE IF NOT EXISTS public.agent_eval_findings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE NOT NULL,
  recommendation_id uuid REFERENCES public.agent_recommendations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  judge_version text NOT NULL,
  model text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning text,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_eval_findings_user_created
  ON public.agent_eval_findings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_eval_findings_flagged
  ON public.agent_eval_findings(flagged, created_at DESC)
  WHERE flagged = true;

CREATE INDEX IF NOT EXISTS idx_agent_eval_findings_recommendation
  ON public.agent_eval_findings(recommendation_id);

ALTER TABLE public.agent_eval_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own agent eval findings" ON public.agent_eval_findings;
CREATE POLICY "Users read own agent eval findings"
  ON public.agent_eval_findings FOR SELECT
  USING (auth.uid() = user_id);
