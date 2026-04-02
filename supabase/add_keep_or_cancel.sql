-- Keep or Cancel feature: downgrade paths + user category spend estimates
-- Run this in the Supabase SQL editor

-- ── card_downgrade_paths (public reference table) ────────────────────────
CREATE TABLE IF NOT EXISTS card_downgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_template_id UUID NOT NULL REFERENCES card_templates(id) ON DELETE CASCADE,
  to_template_id UUID NOT NULL REFERENCES card_templates(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('downgrade', 'product_change')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_template_id, to_template_id)
);

-- Public read access
ALTER TABLE card_downgrade_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read downgrade paths"
  ON card_downgrade_paths FOR SELECT
  USING (true);

-- Seed known downgrade / product-change paths
-- Chase
INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Chase to request. Your Ultimate Rewards points transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Chase Sapphire Reserve' AND t.name = 'Chase Freedom Unlimited'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Chase to request. Your Ultimate Rewards points transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Chase Sapphire Reserve' AND t.name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Chase to request. Your Ultimate Rewards points transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Chase Sapphire Reserve' AND t.name = 'Chase Sapphire Preferred'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Chase to request. Your Ultimate Rewards points transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Chase Sapphire Preferred' AND t.name = 'Chase Freedom Unlimited'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Chase to request. Your Ultimate Rewards points transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Chase Sapphire Preferred' AND t.name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

-- Amex
INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'downgrade', 'Call Amex to downgrade. Membership Rewards points stay in your account.'
FROM card_templates f, card_templates t
WHERE f.name = 'Amex Platinum Card' AND t.name = 'Amex Gold Card'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'downgrade', 'Call Amex to downgrade. Membership Rewards points stay in your account.'
FROM card_templates f, card_templates t
WHERE f.name = 'Amex Platinum Card' AND t.name = 'Amex Green Card'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'downgrade', 'Call Amex to downgrade. Membership Rewards points stay in your account.'
FROM card_templates f, card_templates t
WHERE f.name = 'Amex Gold Card' AND t.name = 'Amex Green Card'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Amex to request. Your Membership Rewards points stay in your account.'
FROM card_templates f, card_templates t
WHERE f.name = 'Amex Blue Cash Preferred' AND t.name = 'Amex Blue Cash Everyday'
ON CONFLICT DO NOTHING;

-- Capital One
INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Capital One to request. Miles transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Capital One Venture X' AND t.name = 'Capital One Quicksilver'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Capital One to request. Miles transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Capital One Venture X' AND t.name = 'Capital One Venture'
ON CONFLICT DO NOTHING;

INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Capital One to request. Miles transfer to the new card.'
FROM card_templates f, card_templates t
WHERE f.name = 'Capital One Venture' AND t.name = 'Capital One Quicksilver'
ON CONFLICT DO NOTHING;

-- Citi
INSERT INTO card_downgrade_paths (from_template_id, to_template_id, relationship, notes)
SELECT f.id, t.id, 'product_change', 'Call Citi to request product change. Thank You Points transfer.'
FROM card_templates f, card_templates t
WHERE f.name = 'Citi Premier' AND t.name = 'Citi Double Cash'
ON CONFLICT DO NOTHING;

-- ── user_category_spend (user-scoped, RLS) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_category_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES spending_categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'default' CHECK (source IN ('manual', 'transaction', 'default')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

ALTER TABLE user_category_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own category spend"
  ON user_category_spend FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category spend"
  ON user_category_spend FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category spend"
  ON user_category_spend FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category spend"
  ON user_category_spend FOR DELETE
  USING (auth.uid() = user_id);
