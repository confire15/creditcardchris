CREATE TABLE IF NOT EXISTS public.survey_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  version integer NOT NULL DEFAULT 1,
  question_template text NOT NULL,
  topic text NOT NULL,
  target_segment jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_prompts_active
  ON public.survey_prompts(is_active, topic)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id uuid REFERENCES public.survey_prompts(id) ON DELETE SET NULL,
  prompt_slug text NOT NULL,
  prompt_version integer NOT NULL,
  raw_answer text NOT NULL,
  ai_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  sentiment text,
  theme text,
  severity integer,
  classifier_version text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_created
  ON public.survey_responses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_responses_prompt
  ON public.survey_responses(prompt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_responses_theme
  ON public.survey_responses(theme, created_at DESC)
  WHERE theme IS NOT NULL;

ALTER TABLE public.survey_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read survey prompts" ON public.survey_prompts;
CREATE POLICY "Authenticated read survey prompts"
  ON public.survey_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users insert own survey responses" ON public.survey_responses;
CREATE POLICY "Users insert own survey responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own survey responses" ON public.survey_responses;
CREATE POLICY "Users read own survey responses"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = user_id);

INSERT INTO public.survey_prompts (slug, version, topic, question_template)
VALUES
  ('first-run', 1, 'onboarding', 'What were you trying to figure out about your cards when you opened the app today?'),
  ('best-card-finder', 1, 'best_card', 'Last time you used Best Card Finder, did it match what your card''s app or statement said? If not, what was off?'),
  ('keep-or-cancel', 1, 'keep_or_cancel', 'Is there a card you''re torn about keeping? What would help you decide?'),
  ('alerts-relevance', 1, 'alerts', 'Of the alerts you''ve received this month, which one actually changed your behavior?'),
  ('missing-feature', 1, 'roadmap', 'What''s the one thing you wish Credit Card Chris did that it doesn''t today?')
ON CONFLICT (slug) DO NOTHING;
