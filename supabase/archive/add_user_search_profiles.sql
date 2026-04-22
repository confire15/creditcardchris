-- Saved search personas for Best Card Finder (premium)
CREATE TABLE IF NOT EXISTS public.user_search_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  search_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_search_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own search profiles"
  ON public.user_search_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_search_profiles_user_id
  ON public.user_search_profiles(user_id);

CREATE OR REPLACE FUNCTION update_user_search_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_search_profiles_updated_at ON public.user_search_profiles;
CREATE TRIGGER user_search_profiles_updated_at
  BEFORE UPDATE ON public.user_search_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_search_profiles_updated_at();
