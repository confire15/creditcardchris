-- Card applications tracker
CREATE TABLE IF NOT EXISTS card_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  applied_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied, cancelled
  bonus_offer TEXT,
  annual_fee NUMERIC(10,2) DEFAULT 0,
  credit_score_used INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE card_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own applications"
  ON card_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Points expiration date on user cards
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS points_expiration_date DATE;
