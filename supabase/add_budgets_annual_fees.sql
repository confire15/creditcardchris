-- Monthly spending budgets per category
CREATE TABLE IF NOT EXISTS spending_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES spending_categories(id) ON DELETE CASCADE NOT NULL,
  monthly_limit NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

ALTER TABLE spending_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets"
  ON spending_budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Annual fee date on user cards
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS annual_fee_date DATE;

-- Public profiles for shareable dashboard
CREATE TABLE IF NOT EXISTS public_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  member_since TIMESTAMPTZ NOT NULL,
  cards_count INTEGER DEFAULT 0,
  total_rewards NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable by anyone"
  ON public_profiles FOR SELECT USING (true);

CREATE POLICY "Users can manage their own public profile"
  ON public_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
