-- Banki integrációk tárolása (GoCardless / Salt Edge)
CREATE TABLE IF NOT EXISTS bank_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL DEFAULT 'gocardless',
  institution_id text NOT NULL,
  institution_name text NOT NULL,
  institution_logo text,
  requisition_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','error')),
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Household members can manage bank connections"
  ON bank_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = bank_connections.household_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_bank_connections_household ON bank_connections(household_id);
