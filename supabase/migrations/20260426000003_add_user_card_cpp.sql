ALTER TABLE public.user_cards
  ADD COLUMN custom_cpp NUMERIC(5,3),
  ADD COLUMN cpp_redemption_mode TEXT;

COMMENT ON COLUMN public.user_cards.custom_cpp IS 'Per-card CPP override in cents. Premium-only.';
COMMENT ON COLUMN public.user_cards.cpp_redemption_mode IS 'Free text label (e.g., "Hyatt transfer", "Travel Portal").';
