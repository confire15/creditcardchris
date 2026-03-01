-- Fix flexible card category options
-- Citi Custom Cash: 5% on your top eligible category (auto-assigned)
-- Add missing: travel, transit, entertainment
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi Custom Cash' AND sc.name IN ('travel', 'transit', 'entertainment')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- US Bank Cash+: 5% on 2 categories you choose each quarter
-- Add missing: dining (fast food), transit (ground transportation), entertainment (movies/gyms), online_shopping (electronics/sporting goods), groceries (grocery delivery)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+' AND sc.name IN ('dining', 'transit', 'entertainment', 'online_shopping', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Bank of America Customized Cash Rewards: 3% on 1 chosen category
-- Add missing: travel, drugstores, home_improvement
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bank of America Customized Cash Rewards' AND sc.name IN ('travel', 'drugstores', 'home_improvement')
ON CONFLICT (card_template_id, category_id) DO NOTHING;
