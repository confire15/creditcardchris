-- ============================================================
-- 1. Rewards Goals
-- ============================================================
CREATE TABLE IF NOT EXISTS rewards_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_points INTEGER NOT NULL,
  target_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rewards_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON rewards_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. Statement Credits
-- ============================================================
CREATE TABLE IF NOT EXISTS statement_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  annual_amount NUMERIC(10,2) NOT NULL,
  used_amount NUMERIC(10,2) DEFAULT 0,
  reset_month INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE statement_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own credits"
  ON statement_credits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Card sort order
-- ============================================================
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
