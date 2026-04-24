-- Add per-credit activation guidance shown to premium users
ALTER TABLE public.card_template_credits
ADD COLUMN IF NOT EXISTS credit_activation_hint TEXT;
