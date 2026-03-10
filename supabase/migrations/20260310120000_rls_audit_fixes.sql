-- RLS Policy Audit – 2026-03-10
-- ============================================================
-- Findings:
--
-- 1. transactions.category_id FK had no ON DELETE action (defaults to NO ACTION/RESTRICT).
--    deleteCategory() would fail with FK violation if any transaction referenced that category.
--    Fix: re-create FK as ON DELETE SET NULL (same as person_id already was).
--
-- 2. Duplicate SELECT policy on `households`:
--    "Household owner can select own households" and "Select own households" are identical.
--    Drop the redundant one.
--
-- 3. household_members: owner-only policies are correct for single-user mode.
--    When multi-user invite is added, a member self-SELECT policy will be needed.
--
-- 4. guest_sessions / saving_goals / subscriptions: RLS enabled, no app usage – OK.
-- ============================================================

-- Fix 1: transactions.category_id → ON DELETE SET NULL
ALTER TABLE "public"."transactions"
  DROP CONSTRAINT IF EXISTS "transactions_category_id_fkey";

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id")
    ON DELETE SET NULL;

-- Fix 2: drop duplicate households SELECT policy
DROP POLICY IF EXISTS "Select own households" ON "public"."households";