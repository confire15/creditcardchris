CREATE TABLE public.card_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_template_id UUID REFERENCES public.card_templates(id),
  custom_card_name TEXT,
  issuer TEXT NOT NULL,
  applied_on DATE NOT NULL,
  outcome TEXT NOT NULL,
  approved_on DATE,
  is_business_card BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own applications" ON public.card_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own applications" ON public.card_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own applications" ON public.card_applications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own applications" ON public.card_applications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_card_apps_user_applied ON public.card_applications(user_id, applied_on DESC);
