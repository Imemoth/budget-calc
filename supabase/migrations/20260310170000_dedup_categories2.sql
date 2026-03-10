-- Duplikált kategóriák teljes eltávolítása (2. javítás)
-- ============================================================
-- Az előző migráció (160000) parent_id-t is vette figyelembe, ezért a gyerek
-- kategóriákat nem takarította el (eltérő parent UUID-k a két seed-nél).
-- Jelen migráció csak (household_id, name, type) alapján dedup-ol,
-- megtartva a legrégebbi (legkorábban létrehozott) sort, törölve a többit.
-- A transactions/recurring FK-k ON DELETE SET NULL-ra állítva, de az újabb
-- (2. seed) kategóriákra nem mutat egyetlen tranzakció/recurring sem, szóval
-- nem vesznek el kategória-hozzárendelések.
-- ============================================================

DELETE FROM "public"."categories"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("household_id", "name", "type")
    "id"
  FROM "public"."categories"
  ORDER BY
    "household_id",
    "name",
    "type",
    "created_at" ASC
);
