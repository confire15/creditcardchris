-- Add fast_food spending category and update US Bank Cash+ rewards

-- 1. Insert new category (after dining)
INSERT INTO public.spending_categories (name, display_name, icon)
VALUES ('fast_food', 'Fast Food', 'hamburger')
ON CONFLICT (name) DO NOTHING;

-- 2. US Bank Cash+: add fast_food at 5% (the correct 5% eligible category)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0
FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+' AND sc.name = 'fast_food'
ON CONFLICT (card_template_id, category_id) DO UPDATE SET multiplier = 5.0;

-- 3. US Bank Cash+: change dining from 5% → 2% (sit-down restaurants = 2% everyday category)
UPDATE public.card_template_rewards
SET multiplier = 2.0
WHERE card_template_id = (SELECT id FROM public.card_templates WHERE name = 'US Bank Cash+')
  AND category_id = (SELECT id FROM public.spending_categories WHERE name = 'dining');
