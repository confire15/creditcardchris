DROP POLICY IF EXISTS "Read own memberships" ON public.household_members;

CREATE POLICY "Members read household memberships"
  ON public.household_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.accepted_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.households h
      WHERE h.id = household_members.household_id
        AND h.owner_user_id = auth.uid()
    )
  );
