-- ============================================================
-- Valóban körkörösmentes RLS – 2026-03-11
-- ============================================================
-- Alapelv: household_members SELECT policyján SEMMI cross-table hivatkozás.
-- households SELECT policyján SEMMI household_members hivatkozás.
-- → Bármely irányú hivatkozás legfeljebb 1 szint mélységű, rekurzió lehetetlen.
-- ============================================================

-- ---- 1. household_members: ALL SELECT policy törlés, csak direct self-check ----
DROP POLICY IF EXISTS "Members can read household members"        ON "public"."household_members";
DROP POLICY IF EXISTS "Owner can see members of own households"   ON "public"."household_members";
DROP POLICY IF EXISTS "Owner can see all members of own household" ON "public"."household_members";
DROP POLICY IF EXISTS "User can see own memberships"              ON "public"."household_members";

-- Egyetlen SELECT policy: user látja a saját sorát. KÖZVETLEN feltétel, nincs join.
CREATE POLICY "User can see own memberships" ON "public"."household_members"
  FOR SELECT TO "authenticated"
  USING (user_id = auth.uid());

-- ---- 2. households: household_members hivatkozás törlése ----
DROP POLICY IF EXISTS "Members can read household"     ON "public"."households";
DROP POLICY IF EXISTS "Members can read own household" ON "public"."households";
-- "Household owner can select own households" (owner_user_id = auth.uid()) marad – direct ✓
-- Tagok a háztartás adatait az adattábla policy-kon keresztül érik el (household_members direct ágon).

-- ---- 3. SECURITY DEFINER függvény: household tagjainak lekérdezése RLS bypass-szal ----
-- Az owner/tagok listázásához (getHouseholdMembers) szükséges, mert a SELECT policy
-- most csak saját sort mutat. A függvény ellenőrzi, hogy a hívó tag-e a háztartásban.
CREATE OR REPLACE FUNCTION "public"."get_household_members"(p_household_id uuid)
RETURNS TABLE (
  id          uuid,
  household_id uuid,
  user_id     uuid,
  role        text,
  permissions jsonb,
  email       text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Csak akkor ad vissza adatot, ha a hívó tag vagy tulajdonos
  IF NOT EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT hm.id, hm.household_id, hm.user_id, hm.role,
           hm.permissions, hm.email, hm.created_at
    FROM "public"."household_members" hm
    WHERE hm.household_id = p_household_id
    ORDER BY hm.created_at ASC;
END;
$$;

ALTER FUNCTION "public"."get_household_members"(uuid) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_household_members"(uuid) TO "authenticated";
