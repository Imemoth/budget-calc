-- Fix: körkörösen hivatkozó RLS javítása az adattáblákon
-- ============================================================
-- A "Members can access X" policyk CSAK household_members JOIN-t
-- használnak, ami körkörös hivatkozáshoz vezet:
--   categories → household_members RLS → households → household_members → ...
--
-- Javítás: az USING/WITH CHECK feltételbe felvesszük az owner-alapú OR ágat is,
-- amely közvetlenül a households.owner_user_id-t ellenőrzi (nincs household_members).
-- Így az owner számára az első ág rövid úton teljesül (nincs rekurzió),
-- a tagok számára a household_members ág lép életbe.
-- ============================================================

-- ---- categories ----
DROP POLICY IF EXISTS "Members can access categories" ON "public"."categories";
CREATE POLICY "Members can access categories" ON "public"."categories"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "categories"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "categories"."household_id"
        AND hm."user_id" = "auth"."uid"())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "categories"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "categories"."household_id"
        AND hm."user_id" = "auth"."uid"())
  );

-- ---- people ----
DROP POLICY IF EXISTS "Members can access people" ON "public"."people";
CREATE POLICY "Members can access people" ON "public"."people"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "people"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "people"."household_id"
        AND hm."user_id" = "auth"."uid"())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "people"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "people"."household_id"
        AND hm."user_id" = "auth"."uid"())
  );

-- ---- recurring_items ----
DROP POLICY IF EXISTS "Members can access recurring items" ON "public"."recurring_items";
CREATE POLICY "Members can access recurring items" ON "public"."recurring_items"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "recurring_items"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "recurring_items"."household_id"
        AND hm."user_id" = "auth"."uid"())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "recurring_items"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "recurring_items"."household_id"
        AND hm."user_id" = "auth"."uid"())
  );

-- ---- savings_buckets ----
DROP POLICY IF EXISTS "Members can access savings buckets" ON "public"."savings_buckets";
CREATE POLICY "Members can access savings buckets" ON "public"."savings_buckets"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "savings_buckets"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "savings_buckets"."household_id"
        AND hm."user_id" = "auth"."uid"())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "savings_buckets"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "savings_buckets"."household_id"
        AND hm."user_id" = "auth"."uid"())
  );

-- ---- transactions ----
DROP POLICY IF EXISTS "Members can access transactions" ON "public"."transactions";
CREATE POLICY "Members can access transactions" ON "public"."transactions"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "transactions"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "transactions"."household_id"
        AND hm."user_id" = "auth"."uid"())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "transactions"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "transactions"."household_id"
        AND hm."user_id" = "auth"."uid"())
  );

-- ---- household_members: saját sor láthatósága szintén az owner check-kel ----
-- (az önhivatkozó policy biztonságosabb, ha az owner-alapú ág is ott van)
DROP POLICY IF EXISTS "Members can read household members" ON "public"."household_members";
CREATE POLICY "Members can read household members" ON "public"."household_members"
  FOR SELECT TO "authenticated"
  USING (
    EXISTS (SELECT 1 FROM "public"."households" h
      WHERE h."id" = "household_members"."household_id"
        AND h."owner_user_id" = "auth"."uid"())
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm2
      WHERE hm2."household_id" = "household_members"."household_id"
        AND hm2."user_id" = "auth"."uid"())
  );

-- ---- households: "Members can read household" policy kiegészítése owner OR member ----
DROP POLICY IF EXISTS "Members can read household" ON "public"."households";
CREATE POLICY "Members can read household" ON "public"."households"
  FOR SELECT TO "authenticated"
  USING (
    "owner_user_id" = "auth"."uid"()
    OR
    EXISTS (SELECT 1 FROM "public"."household_members" hm
      WHERE hm."household_id" = "households"."id"
        AND hm."user_id" = "auth"."uid"())
  );
