-- ============================================================
--  AURABOT — Story Book Feature
--  Run in Supabase SQL Editor (after storylab-workflow-schema.sql)
-- ============================================================

alter table public.stories
  add column if not exists book_pages jsonb not null default '{"cover":{"drawingDataUrl":null},"pages":[]}'::jsonb;

-- book_pages shape:
-- {
--   "cover": { "drawingDataUrl": "data:image/png;base64,..." or null },
--   "pages": [
--     { "text": "paragraph text...", "drawingDataUrl": "data:image/png;base64,..." or null },
--     ...
--   ]
-- }
