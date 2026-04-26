CREATE TABLE public.card_subs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  reward_amount NUMERIC(10,2) NOT NULL,
  reward_unit TEXT NOT NULL,
  required_spend NUMERIC(10,2) NOT NULL,
  current_spend NUMERIC(10,2) DEFAULT 0 NOT NULL,
  deadline DATE NOT NULL,
  is_met BOOLEAN DEFAULT false NOT NULL,
  met_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_card_id)
);

ALTER TABLE public.card_subs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subs" ON public.card_subs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON public.card_subs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subs" ON public.card_subs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subs" ON public.card_subs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_card_subs_user_id ON public.card_subs(user_id);
CREATE INDEX idx_card_subs_deadline ON public.card_subs(deadline) WHERE is_met = false;
