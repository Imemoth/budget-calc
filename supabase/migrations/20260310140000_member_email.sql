-- household_members.email oszlop + accept_invite email mentéssel
-- ============================================================

-- 1. email oszlop hozzáadása
ALTER TABLE "public"."household_members"
  ADD COLUMN IF NOT EXISTS "email" text;

-- 2. accept_invite frissítése: tárolja az invited_email-t a tag sorában
CREATE OR REPLACE FUNCTION "public"."accept_invite"(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hid   uuid;
  v_perms jsonb;
  v_email text;
BEGIN
  SELECT "household_id", "permissions", "invited_email"
    INTO v_hid, v_perms, v_email
    FROM "public"."household_invites"
    WHERE "token" = p_token
      AND "accepted_at" IS NULL
      AND "expires_at" > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Érvénytelen vagy lejárt meghívó kód.';
  END IF;

  INSERT INTO "public"."household_members" ("household_id", "user_id", "role", "permissions", "email")
    VALUES (v_hid, auth.uid(), 'MEMBER', v_perms, v_email)
    ON CONFLICT ("household_id", "user_id") DO UPDATE
      SET "email" = EXCLUDED."email";

  UPDATE "public"."household_invites"
    SET "accepted_at" = now()
    WHERE "token" = p_token;

  RETURN v_hid;
END;
$$;

ALTER FUNCTION "public"."accept_invite"(text) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."accept_invite"(text) TO "authenticated";
