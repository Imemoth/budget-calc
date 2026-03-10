-- Household Sharing & Invites – 2026-03-10
-- ============================================================

-- 1. household_invites tábla
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."household_invites" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"         text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  "household_id"  uuid NOT NULL REFERENCES "public"."households"("id") ON DELETE CASCADE,
  "invited_email" text NOT NULL,
  "invited_by"    uuid NOT NULL REFERENCES "auth"."users"("id"),
  "permissions"   jsonb NOT NULL DEFAULT '{"income":true,"expense":true,"savings":true,"categories":true,"settings":false}',
  "accepted_at"   timestamptz,
  "expires_at"    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  "created_at"    timestamptz DEFAULT now()
);
ALTER TABLE "public"."household_invites" ENABLE ROW LEVEL SECURITY;

-- Csak a meghívó (tulajdonos) kezelheti a saját meghívóit
CREATE POLICY "Owner can manage invites" ON "public"."household_invites"
  USING ("invited_by" = "auth"."uid"())
  WITH CHECK ("invited_by" = "auth"."uid"());

GRANT ALL ON TABLE "public"."household_invites" TO "anon";
GRANT ALL ON TABLE "public"."household_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."household_invites" TO "service_role";

-- 2. household_members bővítés: permissions oszlop + unique constraint
-- ============================================================
ALTER TABLE "public"."household_members"
  ADD COLUMN IF NOT EXISTS "permissions" jsonb NOT NULL
  DEFAULT '{"income":true,"expense":true,"savings":true,"categories":true,"settings":false}';

-- Unique constraint (szükséges az accept_invite ON CONFLICT DO NOTHING-hoz és az upsert-hez)
ALTER TABLE "public"."household_members"
  DROP CONSTRAINT IF EXISTS "household_members_household_user_unique";
ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_household_user_unique"
  UNIQUE ("household_id", "user_id");

-- 3. household_members: tagok is látják a háztartás többi tagját
-- ============================================================
-- (az eddigi "Owner can see members" és "Owner can manage members" megmarad az owner műveleteihez)
DROP POLICY IF EXISTS "Members can read household members" ON "public"."household_members";
CREATE POLICY "Members can read household members" ON "public"."household_members"
  FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm2
    WHERE hm2."household_id" = "household_members"."household_id"
      AND hm2."user_id" = "auth"."uid"()
  ));

-- 4. households: tagok is olvashatják a háztartás sorát (settings, currency, stb.)
-- ============================================================
DROP POLICY IF EXISTS "Members can read household" ON "public"."households";
CREATE POLICY "Members can read household" ON "public"."households"
  FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "households"."id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- 5. Adattáblák RLS: owner-only → member-based (owner is member, visszafelé kompatibilis)
-- ============================================================

-- ---- categories ----
DROP POLICY IF EXISTS "Access categories of own households" ON "public"."categories";
DROP POLICY IF EXISTS "Users can insert categories in own households" ON "public"."categories";
DROP POLICY IF EXISTS "Users can select categories in own households" ON "public"."categories";
DROP POLICY IF EXISTS "Users can update categories in own households" ON "public"."categories";

CREATE POLICY "Members can access categories" ON "public"."categories"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "categories"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "categories"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- ---- people ----
DROP POLICY IF EXISTS "Delete people of own households" ON "public"."people";
DROP POLICY IF EXISTS "Insert people of own households" ON "public"."people";
DROP POLICY IF EXISTS "Select people of own households" ON "public"."people";
DROP POLICY IF EXISTS "Update people of own households" ON "public"."people";

CREATE POLICY "Members can access people" ON "public"."people"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "people"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "people"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- ---- recurring_items ----
DROP POLICY IF EXISTS "Access recurring items of own households" ON "public"."recurring_items";

CREATE POLICY "Members can access recurring items" ON "public"."recurring_items"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "recurring_items"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "recurring_items"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- ---- savings_buckets ----
DROP POLICY IF EXISTS "Access savings buckets of own households" ON "public"."savings_buckets";

CREATE POLICY "Members can access savings buckets" ON "public"."savings_buckets"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "savings_buckets"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "savings_buckets"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- ---- transactions ----
DROP POLICY IF EXISTS "Access transactions of own households" ON "public"."transactions";
DROP POLICY IF EXISTS "Users can insert transactions in own households" ON "public"."transactions";
DROP POLICY IF EXISTS "Users can select transactions in own households" ON "public"."transactions";
DROP POLICY IF EXISTS "Users can update transactions in own households" ON "public"."transactions";

CREATE POLICY "Members can access transactions" ON "public"."transactions"
  USING (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "transactions"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."household_members" hm
    WHERE hm."household_id" = "transactions"."household_id"
      AND hm."user_id" = "auth"."uid"()
  ));

-- 6. accept_invite – SECURITY DEFINER függvény
--    (a meghívott még nem tagja a háztartásnak, ezért kell a bypass)
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."accept_invite"(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hid   uuid;
  v_perms jsonb;
BEGIN
  SELECT "household_id", "permissions"
    INTO v_hid, v_perms
    FROM "public"."household_invites"
    WHERE "token" = p_token
      AND "accepted_at" IS NULL
      AND "expires_at" > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Érvénytelen vagy lejárt meghívó kód.';
  END IF;

  INSERT INTO "public"."household_members" ("household_id", "user_id", "role", "permissions")
    VALUES (v_hid, auth.uid(), 'MEMBER', v_perms)
    ON CONFLICT ("household_id", "user_id") DO NOTHING;

  UPDATE "public"."household_invites"
    SET "accepted_at" = now()
    WHERE "token" = p_token;

  RETURN v_hid;
END;
$$;

ALTER FUNCTION "public"."accept_invite"(text) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."accept_invite"(text) TO "authenticated";
