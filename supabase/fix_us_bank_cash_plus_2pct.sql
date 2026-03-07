-- Fix US Bank Cash+ having 2 categories at 2x (dining + groceries)
-- US Bank Cash+ has exactly ONE 2% everyday category (your choice: grocery, gas, or restaurants)
-- Groceries is the most common pick; dining is already covered by fast_food at 5%.
-- Remove dining from the template rewards so it falls back to the 1% base rate.

DELETE FROM public.card_template_rewards
WHERE card_template_id = (SELECT id FROM public.card_templates WHERE name = 'US Bank Cash+')
  AND category_id = (SELECT id FROM public.spending_categories WHERE name = 'dining');
