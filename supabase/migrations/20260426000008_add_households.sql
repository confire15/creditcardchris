CREATE TABLE public.households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.household_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(household_id, user_id)
);

CREATE TABLE public.household_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read household"
  ON public.households FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.household_members
                 WHERE household_id = households.id AND user_id = auth.uid() AND accepted_at IS NOT NULL));

CREATE POLICY "Owner manages household"
  ON public.households FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Read own memberships"
  ON public.household_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.households WHERE id = household_id AND owner_user_id = auth.uid()
  ));

CREATE POLICY "Owner adds members"
  ON public.household_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_user_id = auth.uid()));

CREATE POLICY "Owner removes members"
  ON public.household_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_user_id = auth.uid()));

CREATE POLICY "User accepts own invite"
  ON public.household_members FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner manages invites"
  ON public.household_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_user_id = auth.uid()));
