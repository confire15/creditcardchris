-- Costco Anywhere Visa now earns 5% on Costco gas.
-- The app currently models gas as a single category, so use the Costco gas rate.
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier, cap_amount)
SELECT ct.id, sc.id, 5.0, 7000.00
FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Costco Anywhere Visa'
  AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id)
DO UPDATE SET
  multiplier = EXCLUDED.multiplier,
  cap_amount = EXCLUDED.cap_amount;

UPDATE public.user_card_rewards ucr
SET
  multiplier = 5.0,
  cap_amount = 7000.00
FROM public.user_cards uc, public.card_templates ct, public.spending_categories sc
WHERE ucr.user_card_id = uc.id
  AND uc.card_template_id = ct.id
  AND ucr.category_id = sc.id
  AND ct.name = 'Costco Anywhere Visa'
  AND sc.name = 'gas'
  AND ucr.multiplier = 4.0;
