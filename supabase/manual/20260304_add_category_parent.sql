-- Migration: Kategória hierarchia (szülő-gyerek kapcsolat)
-- Futtatni kell a Supabase dashboard SQL editorában.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Index a gyors szülő szerinti lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
