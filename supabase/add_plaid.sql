-- Plaid items (connected bank institutions)
CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_name text,
  institution_id text,
  cursor text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plaid items"
  ON public.plaid_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Plaid accounts (individual accounts within an institution)
CREATE TABLE IF NOT EXISTS public.plaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id uuid NOT NULL REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  official_name text,
  type text,
  subtype text,
  mask text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plaid accounts"
  ON public.plaid_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow plaid_transaction_id column on transactions if it doesn't exist
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS plaid_transaction_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_pending boolean DEFAULT false;
