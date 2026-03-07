-- Rename card templates to use "Amex" prefix uniformly
UPDATE public.card_templates SET name = 'Amex Gold Card'     WHERE name = 'American Express Gold Card';
UPDATE public.card_templates SET name = 'Amex Platinum Card' WHERE name = 'American Express Platinum Card';
