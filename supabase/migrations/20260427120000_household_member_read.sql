-- Fix: tagok is olvashatják a háztartásukat (households SELECT)
-- Korábban csak az owner_user_id = auth.uid() policy létezett,
-- ami miatt a meghívott tagok nem tudták betölteni a household adatait
-- (settings, currency stb.), és üres állapot töltődött be.

CREATE POLICY IF NOT EXISTS "Members can read their household"
  ON households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = households.id
        AND hm.user_id = auth.uid()
    )
  );
