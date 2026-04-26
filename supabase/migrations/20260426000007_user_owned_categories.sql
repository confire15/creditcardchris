ALTER TABLE public.spending_categories
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_spending_categories_user ON public.spending_categories(user_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can view spending categories" ON public.spending_categories;
DROP POLICY IF EXISTS "Anyone can read categories" ON public.spending_categories;

CREATE POLICY "Read system + own categories"
  ON public.spending_categories FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Insert own categories"
  ON public.spending_categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own categories"
  ON public.spending_categories FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own categories"
  ON public.spending_categories FOR DELETE
  USING (user_id = auth.uid());
