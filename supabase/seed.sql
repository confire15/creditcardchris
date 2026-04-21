-- ============================================
-- SPENDING CATEGORIES
-- ============================================
INSERT INTO public.spending_categories (name, display_name, icon) VALUES
  ('dining', 'Dining', 'utensils'),
  ('fast_food', 'Fast Food', 'hamburger'),
  ('travel', 'Travel', 'plane'),
  ('groceries', 'Groceries', 'shopping-cart'),
  ('gas', 'Gas Stations', 'fuel'),
  ('streaming', 'Streaming', 'tv'),
  ('online_shopping', 'Online Shopping', 'globe'),
  ('transit', 'Transit & Rideshare', 'bus'),
  ('drugstores', 'Drugstores', 'pill'),
  ('home_improvement', 'Home Improvement', 'hammer'),
  ('entertainment', 'Entertainment', 'ticket'),
  ('hotels', 'Hotels', 'bed-double'),
  ('flights', 'Flights', 'plane-takeoff'),
  ('car_rental', 'Car Rental', 'car'),
  ('other', 'Everything Else', 'circle-dot');

-- ============================================
-- CARD TEMPLATES
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color) VALUES
  ('Chase Sapphire Preferred', 'Chase', 'Visa', 95.00, 'points', 'Ultimate Rewards', 1.0, '#1a3c6e'),
  ('Chase Sapphire Reserve', 'Chase', 'Visa', 550.00, 'points', 'Ultimate Rewards', 1.0, '#1a1a2e'),
  ('Chase Freedom Unlimited', 'Chase', 'Visa', 0.00, 'cashback', 'Ultimate Rewards', 1.5, '#004b87'),
  ('Chase Freedom Flex', 'Chase', 'Mastercard', 0.00, 'cashback', 'Ultimate Rewards', 1.0, '#004b87'),
  ('Amex Gold Card', 'American Express', 'Amex', 325.00, 'points', 'Membership Rewards', 1.0, '#b8860b'),
  ('Amex Platinum Card', 'American Express', 'Amex', 895.00, 'points', 'Membership Rewards', 1.0, '#8a8a8a'),
  ('Capital One Venture X', 'Capital One', 'Visa', 395.00, 'miles', 'Capital One Miles', 2.0, '#003d6b'),
  ('Capital One Venture Rewards', 'Capital One', 'Visa', 95.00, 'miles', 'Capital One Miles', 2.0, '#003d6b'),
  ('Capital One SavorOne', 'Capital One', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#2b2d42'),
  ('Citi Double Cash', 'Citi', 'Mastercard', 0.00, 'cashback', 'Cash Back', 2.0, '#003b70'),
  ('Discover it Cash Back', 'Discover', 'Discover', 0.00, 'cashback', 'Cash Back', 1.0, '#ff6000'),
  ('Wells Fargo Active Cash', 'Wells Fargo', 'Visa', 0.00, 'cashback', 'Cash Back', 2.0, '#d71e28');

-- ============================================
-- CARD TEMPLATE REWARDS (category multipliers)
-- ============================================

-- Chase Sapphire Preferred: 3x dining, 3x streaming, 2x travel, 1x other
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Preferred' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Preferred' AND sc.name = 'streaming';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Preferred' AND sc.name = 'travel';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Preferred' AND sc.name = 'online_shopping';

-- Chase Sapphire Reserve: 3x dining, 3x travel, 10x hotels/flights via Chase Travel
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Reserve' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Reserve' AND sc.name = 'travel';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 10.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Reserve' AND sc.name = 'hotels';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Sapphire Reserve' AND sc.name = 'flights';

-- Chase Freedom Unlimited: 3x dining, 3x drugstores, 1.5x everything else
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Freedom Unlimited' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Freedom Unlimited' AND sc.name = 'drugstores';

-- Chase Freedom Flex: 3x dining, 3x drugstores, 5x travel via Chase
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Freedom Flex' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Freedom Flex' AND sc.name = 'drugstores';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Freedom Flex' AND sc.name = 'travel';

-- Amex Gold: 4x dining, 4x groceries, 3x flights, 1x other
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Gold Card' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Gold Card' AND sc.name = 'groceries';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Gold Card' AND sc.name = 'flights';

-- Amex Platinum: 5x flights, 5x hotels (via Amex Travel), 1x other
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Platinum Card' AND sc.name = 'flights';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Platinum Card' AND sc.name = 'hotels';

-- Capital One Venture X: 5x flights, 10x hotels via Cap1 Travel, 2x everything else
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Venture X' AND sc.name = 'flights';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 10.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Venture X' AND sc.name = 'hotels';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 10.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Venture X' AND sc.name = 'car_rental';

-- Capital One SavorOne: 3x dining, 3x entertainment, 3x streaming, 3x groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One SavorOne' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One SavorOne' AND sc.name = 'entertainment';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One SavorOne' AND sc.name = 'streaming';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One SavorOne' AND sc.name = 'groceries';

-- Discover it: 5x rotating (simplified to key categories)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Discover it Cash Back' AND sc.name = 'dining';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Discover it Cash Back' AND sc.name = 'gas';

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Discover it Cash Back' AND sc.name = 'groceries';
