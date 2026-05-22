-- Action recipes for statement credits.
-- Each row is a deep link / web fallback the app can launch to help the user
-- burn an unused credit before its reset window closes. Reference table
-- (public read), so RLS allows SELECT to all; writes are service-role only.

CREATE TABLE IF NOT EXISTS public.card_perk_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_perk_template_id UUID NOT NULL
                        REFERENCES public.card_perk_templates(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  deep_link_url       TEXT,
  fallback_web_url    TEXT NOT NULL,
  prefill_amount_cents INTEGER,
  instructions        TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_perk_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read card_perk_actions"
  ON public.card_perk_actions FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS card_perk_actions_template_idx
  ON public.card_perk_actions (card_perk_template_id, sort_order);

-- Track which perks were closed via an in-app action. Powers the
-- "$ closed by Chris this year" outcome metric and proves the action thesis.
ALTER TABLE public.card_perks
  ADD COLUMN IF NOT EXISTS closed_via_app_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_via_action_id UUID
    REFERENCES public.card_perk_actions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS card_perks_closed_via_app_idx
  ON public.card_perks (user_id, closed_via_app_at DESC)
  WHERE closed_via_app_at IS NOT NULL;

-- Seed: Amex Gold Card "Uber Cash ($10/mo)" perk.
-- Universal link opens Uber app if installed, otherwise web.
INSERT INTO public.card_perk_actions
  (card_perk_template_id, label, action_type, deep_link_url, fallback_web_url,
   prefill_amount_cents, instructions, sort_order)
SELECT
  pt.id,
  'Order Uber Eats',
  'open_merchant',
  'https://www.ubereats.com/',
  'https://www.ubereats.com/',
  1000,
  'Pay with your Amex Gold to apply the $10 Uber Cash credit. Credit must be used by month end.',
  0
FROM public.card_perk_templates pt
JOIN public.card_templates ct ON ct.id = pt.card_template_id
WHERE ct.name = 'Amex Gold Card'
  AND pt.name ILIKE '%Uber Cash%'
ON CONFLICT DO NOTHING;

INSERT INTO public.card_perk_actions
  (card_perk_template_id, label, action_type, deep_link_url, fallback_web_url,
   prefill_amount_cents, instructions, sort_order)
SELECT
  pt.id,
  'Book an Uber ride',
  'open_merchant',
  'https://m.uber.com/go/home',
  'https://m.uber.com/go/home',
  1000,
  'Pay with your Amex Gold to apply the $10 Uber Cash credit. Credit must be used by month end.',
  1
FROM public.card_perk_templates pt
JOIN public.card_templates ct ON ct.id = pt.card_template_id
WHERE ct.name = 'Amex Gold Card'
  AND pt.name ILIKE '%Uber Cash%'
ON CONFLICT DO NOTHING;
