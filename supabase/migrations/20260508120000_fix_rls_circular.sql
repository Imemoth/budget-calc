-- Fix: households ↔ household_members körkörös RLS referencia
-- A korábban hozzáadott "Members can read their household" policy
-- végteleni rekurziót okozott → 500 hiba minden household_members lekérdezésnél.

-- 1) Körkörös policy törlése
DROP POLICY IF EXISTS "Members can read their household" ON households;

-- 2) SECURITY DEFINER függvény tagoknak (RLS megkerüli a kört)
CREATE OR REPLACE FUNCTION public.get_household_for_member(p_household_id uuid)
RETURNS TABLE(
  id uuid, name text, currency text,
  horizon_months int, start_month text,
  theme text, monthly_budget int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = p_household_id AND hm.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = p_household_id AND h.owner_user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT h.id, h.name, h.currency, h.horizon_months,
           h.start_month, h.theme, h.monthly_budget
    FROM households h WHERE h.id = p_household_id;
END;
$$;
