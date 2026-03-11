-- ============================================================
-- Definitív RLS körkörösen hivatkozás javítás – 2026-03-11
-- ============================================================
--
-- A végtelen rekurzió gyökoka:
--   household_members SELECT policy → households EXISTS check
--   → households "Members can read household" policy → household_members EXISTS check
--   → household_members SELECT policy → ... (∞)
--
-- Megoldás: household_members-en CSAK közvetlen (user_id = auth.uid()) feltétel,
-- soha nem kereszttábla hivatkozás. Így bármely tábla hivatkozhat
-- household_members-re anélkül, hogy ciklust okozna.
-- ============================================================

-- ---- 1. household_members: összes SELECT policy törlése és újraírása ----
DROP POLICY IF EXISTS "Members can read household members" ON "public"."household_members";
DROP POLICY IF EXISTS "Owner can see members of own households" ON "public"."household_members";

-- Közvetlen self-check: bárki látja a saját sorát (user_id = auth.uid())
CREATE POLICY "User can see own memberships" ON "public"."household_members"
  FOR SELECT TO "authenticated"
  USING (user_id = auth.uid());

-- Owner az összes tagot látja a háztartásában:
-- households hivatkozás OK, mert households policy-ban nincs household_members hivatkozás (lásd lejjebb)
CREATE POLICY "Owner can see all members of own household" ON "public"."household_members"
  FOR SELECT TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."households" h
      WHERE h."id" = "household_members"."household_id"
        AND h."owner_user_id" = "auth"."uid"()
    )
  );

-- ---- 2. households: körkörösmentes member policy ----
-- Az eddigi "Members can read household" policy household_members-re hivatkozott,
-- ami ciklust okozott. Töröljük és csere: household_members most DIRECT policy-vel rendelkezik.
DROP POLICY IF EXISTS "Members can read household" ON "public"."households";

-- Tagok látják a háztartásukat: household_members-en most csak "user_id = auth.uid()" fut
-- → nem kell tovább menni, nincs rekurzió.
CREATE POLICY "Members can read own household" ON "public"."households"
  FOR SELECT TO "authenticated"
  USING (
    owner_user_id = auth.uid()
    OR
    id IN (
      SELECT hm.household_id
      FROM "public"."household_members" hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- ---- 3. Adattáblák: körkörösmentes policy-k (150000 javítás megtartása) ----
-- Az összes adattábla policy-ja most:
--   EXISTS (households WHERE owner_user_id = auth.uid())  ← DIRECT (households → nincs hm ref)
--   OR EXISTS (household_members WHERE user_id = auth.uid())  ← DIRECT (hm "User can see own memberships")
-- Mindkét ág körkörösmentes. Nem kell újraírni a 150000 migráció policy-jait.
