-- Fix US Bank Cash+ reward categories
-- Card: 5% on 2 categories you choose each quarter (from eligible list)
--       2% on 1 everyday category (grocery stores OR restaurants)
--       1% on everything else
--
-- PROBLEMS IN ORIGINAL SEED DATA (add_cards.sql):
--   1. gas at 2% is WRONG — gas is not a Cash+ eligible category
--   2. Missing 5% eligible categories: dining, transit, entertainment, online_shopping
--
-- Eligible 5% categories (mapped to app spending_categories):
--   fast food             → dining
--   TV/internet/streaming → streaming
--   home utilities        → home_improvement (closest match)
--   ground transportation → transit
--   movie theaters / gyms → entertainment
--   electronics stores    → online_shopping
--
-- Eligible 2% everyday categories:
--   grocery stores        → groceries
--   restaurants           → dining (conflict with 5% fast food; 5% takes precedence for recommendations)

-- Step 1: Remove incorrect 2% gas entry
DELETE FROM public.card_template_rewards
WHERE card_template_id = (SELECT id FROM public.card_templates WHERE name = 'US Bank Cash+')
  AND category_id = (SELECT id FROM public.spending_categories WHERE name = 'gas');

-- Step 2: Upsert all correct 5% eligible categories (DO UPDATE to fix any wrong multipliers)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0
FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+'
  AND sc.name IN (
    'streaming',         -- TV, internet & streaming services
    'home_improvement',  -- home utilities (closest app category)
    'dining',            -- fast food (5% eligible)
    'transit',           -- ground transportation
    'entertainment',     -- movie theaters, gyms/fitness centers
    'online_shopping'    -- electronics stores, sporting goods
  )
ON CONFLICT (card_template_id, category_id) DO UPDATE SET multiplier = 5.0;

-- Step 3: Keep groceries at 2% (grocery stores = 2% everyday category)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0
FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+'
  AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO UPDATE SET multiplier = 2.0;
