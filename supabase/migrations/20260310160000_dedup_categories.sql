-- Duplikált kategóriák eltávolítása (a seed kétszer futott az RLS hiba miatt)
-- ============================================================
-- Megőrizzük az egyedi (name, type, household_id) kombinációk első előfordulását,
-- a többit töröljük. A tranzakciók/recurring FK-k ON DELETE SET NULL / CASCADE,
-- tehát a category_id FK-k NULL-ra kerülnek a törölt kategóriáknál.
-- ============================================================

DELETE FROM "public"."categories"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("household_id", "name", "type", COALESCE("parent_id"::text, ''))
    "id"
  FROM "public"."categories"
  ORDER BY
    "household_id",
    "name",
    "type",
    COALESCE("parent_id"::text, ''),
    "created_at" ASC
);
