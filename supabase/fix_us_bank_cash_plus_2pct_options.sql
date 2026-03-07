-- US Bank Cash+ everyday 2% category options: dining, groceries, gas
-- All 3 should be in card_template_rewards at 2x so the app can present them as choices.
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0
FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+'
  AND sc.name IN ('dining', 'gas')
ON CONFLICT (card_template_id, category_id) DO UPDATE SET multiplier = 2.0;
