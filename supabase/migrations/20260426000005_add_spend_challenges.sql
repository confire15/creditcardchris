CREATE TABLE IF NOT EXISTS public.spend_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.spending_categories(id),
  source TEXT NOT NULL DEFAULT 'manual',
  source_ref UUID,
  title TEXT NOT NULL,
  reward_description TEXT,
  target_spend NUMERIC(10,2) NOT NULL,
  current_spend NUMERIC(10,2) DEFAULT 0 NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_met BOOLEAN DEFAULT false NOT NULL,
  met_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.spend_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spend challenges"
  ON public.spend_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own spend challenges"
  ON public.spend_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own spend challenges"
  ON public.spend_challenges FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own spend challenges"
  ON public.spend_challenges FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_spend_challenges_user_active ON public.spend_challenges(user_id) WHERE is_met = false;
