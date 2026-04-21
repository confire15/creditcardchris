-- Update consumer Amex Platinum annual fee to the current $895 price.
UPDATE public.card_templates
SET annual_fee = 895.00
WHERE issuer = 'American Express'
  AND name IN ('Amex Platinum Card', 'American Express Platinum Card');
