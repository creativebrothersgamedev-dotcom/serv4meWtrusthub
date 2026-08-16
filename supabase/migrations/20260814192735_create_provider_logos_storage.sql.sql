/*
# Storage bucket for provider logos/photos

## Plain-English summary
Creates a public storage bucket named `provider-logos` so providers can
upload a logo or photo for their public profile. Anyone can view a logo
(needed for public browsing), but a provider can only upload, replace, or
remove files inside their own folder (named after their account id).

## Security
- Public read access on the `provider-logos` bucket.
- Insert/update/delete restricted to the owning provider's own folder path,
  plus admins.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-logos', 'provider-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "provider_logos_select_public" ON storage.objects;
CREATE POLICY "provider_logos_select_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'provider-logos');

DROP POLICY IF EXISTS "provider_logos_insert_own_folder" ON storage.objects;
CREATE POLICY "provider_logos_insert_own_folder" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'provider-logos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );

DROP POLICY IF EXISTS "provider_logos_update_own_folder" ON storage.objects;
CREATE POLICY "provider_logos_update_own_folder" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'provider-logos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );

DROP POLICY IF EXISTS "provider_logos_delete_own_folder" ON storage.objects;
CREATE POLICY "provider_logos_delete_own_folder" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'provider-logos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
