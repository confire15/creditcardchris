-- Update Amex Business Platinum annual fee to the current $895 price.
UPDATE public.card_templates
SET annual_fee = 895.00
WHERE issuer = 'American Express'
  AND name IN ('Amex Business Platinum', 'American Express Business Platinum');
