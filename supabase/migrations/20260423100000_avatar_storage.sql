-- ============================================================
-- Avatar Storage — Supabase Storage bucket + RLS policies
-- Migration: 20260423100000_avatar_storage.sql
-- ============================================================

-- 1) Avatars Storage bucket létrehozása (ha még nem létezik)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                          -- publikus: az URL megosztható
  2097152,                       -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS: csak a saját felhasználó tölthet fel
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) RLS: saját avatar frissítése/cseréje
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) RLS: saját avatar törlése
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5) RLS: bárki olvashatja (publikus bucket)
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ============================================================
-- Fájl útvonal konvenció (frontend-ben is ezt kell követni):
--   {user_id}/avatar.{ext}
-- Pl.: "f47ac10b-58cc-4372-a567-0e02b2c3d479/avatar.jpg"
--
-- Publikus URL:
--   {SUPABASE_URL}/storage/v1/object/public/avatars/{user_id}/avatar.jpg
--
-- Cache-busting: URL-hez ?t={timestamp} query param
-- Metadata tárolás: user_metadata.avatar_url (supabase.auth.updateUser)
-- ============================================================
