-- ============================================================
--  AURABOT — Story Book Audio Narration
--  Run in Supabase SQL Editor (after storylab-book-schema.sql)
-- ============================================================

-- Audio files are stored in Supabase Storage (not as base64 in the
-- database — audio is much heavier than the drawing canvases, and
-- storing it as a URL keeps the stories table light and fast).
-- book_pages.cover.audioUrl and book_pages.pages[i].audioUrl will
-- hold the public URLs once recorded — no schema change needed
-- since book_pages is already a flexible jsonb column.

insert into storage.buckets (id, name, public)
values ('book-audio', 'book-audio', true)
on conflict (id) do nothing;

create policy "book_audio_insert_all"
  on storage.objects for insert
  with check (bucket_id = 'book-audio');

create policy "book_audio_select_all"
  on storage.objects for select
  using (bucket_id = 'book-audio');

create policy "book_audio_delete_all"
  on storage.objects for delete
  using (bucket_id = 'book-audio');

create policy "book_audio_update_all"
  on storage.objects for update
  using (bucket_id = 'book-audio');
