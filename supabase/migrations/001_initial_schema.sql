-- ============================================
-- SPENDING CATEGORIES (reference table)
-- ============================================
CREATE TABLE public.spending_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- CARD TEMPLATES (pre-built card database)
-- ============================================
CREATE TABLE public.card_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  network TEXT NOT NULL,
  annual_fee DECIMAL(10,2) DEFAULT 0,
  reward_type TEXT NOT NULL,
  reward_unit TEXT NOT NULL,
  base_reward_rate DECIMAL(5,2) DEFAULT 1.0,
  image_url TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- CARD TEMPLATE REWARDS (reward structure per template)
-- ============================================
CREATE TABLE public.card_template_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.spending_categories(id) ON DELETE CASCADE NOT NULL,
  multiplier DECIMAL(5,2) NOT NULL,
  cap_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(card_template_id, category_id)
);

-- ============================================
-- USER CARDS (user's wallet)
-- ============================================
CREATE TABLE public.user_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_template_id UUID REFERENCES public.card_templates(id),
  nickname TEXT,
  custom_name TEXT,
  custom_issuer TEXT,
  custom_network TEXT,
  custom_reward_type TEXT,
  custom_reward_unit TEXT,
  custom_base_reward_rate DECIMAL(5,2),
  custom_color TEXT,
  last_four TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- USER CARD REWARDS (overrides or custom reward rates)
-- ============================================
CREATE TABLE public.user_card_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.spending_categories(id) ON DELETE CASCADE NOT NULL,
  multiplier DECIMAL(5,2) NOT NULL,
  cap_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_card_id, category_id)
);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.spending_categories(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  merchant TEXT,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rewards_earned DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_user_card_id ON public.transactions(user_card_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_card_template_rewards_template ON public.card_template_rewards(card_template_id);
CREATE INDEX idx_user_card_rewards_card ON public.user_card_rewards(user_card_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- spending_categories: readable by everyone
ALTER TABLE public.spending_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories"
  ON public.spending_categories FOR SELECT USING (true);

-- card_templates: readable by everyone
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card templates"
  ON public.card_templates FOR SELECT USING (true);

-- card_template_rewards: readable by everyone
ALTER TABLE public.card_template_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card template rewards"
  ON public.card_template_rewards FOR SELECT USING (true);

-- user_cards: users can only CRUD their own cards
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cards"
  ON public.user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards"
  ON public.user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards"
  ON public.user_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards"
  ON public.user_cards FOR DELETE USING (auth.uid() = user_id);

-- user_card_rewards: scoped through user_cards ownership
ALTER TABLE public.user_card_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own card rewards"
  ON public.user_card_rewards FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_cards WHERE user_cards.id = user_card_rewards.user_card_id AND user_cards.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own card rewards"
  ON public.user_card_rewards FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_cards WHERE user_cards.id = user_card_rewards.user_card_id AND user_cards.user_id = auth.uid())
  );
CREATE POLICY "Users can update own card rewards"
  ON public.user_card_rewards FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_cards WHERE user_cards.id = user_card_rewards.user_card_id AND user_cards.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own card rewards"
  ON public.user_card_rewards FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_cards WHERE user_cards.id = user_card_rewards.user_card_id AND user_cards.user_id = auth.uid())
  );

-- transactions: users can only CRUD their own
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE USING (auth.uid() = user_id);
