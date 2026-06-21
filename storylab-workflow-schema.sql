-- ============================================================
--  AURABOT — Story Workflow: Planning → Editing → Final
--  Run in Supabase SQL Editor (after storylab-schema.sql)
-- ============================================================

alter table public.stories
  add column if not exists stage text not null default 'planning'
    check (stage in ('planning', 'editing', 'final'));

alter table public.stories
  add column if not exists editing_text text not null default '';
  -- The combined prose the student edits. Created once from the
  -- Planning layers when they first click "To Editing".

alter table public.stories
  add column if not exists editing_snapshot text not null default '';
  -- A frozen copy of editing_text taken at the moment editing began.
  -- Used as the "before" side of the diff shown to the teacher/student.

alter table public.stories
  add column if not exists final_text text not null default '';
  -- The locked final draft, created when the student clicks
  -- "Finish Editing". This is what gets submitted to the teacher.

alter table public.stories
  add column if not exists submitted_at timestamptz;
  -- Set when the student finishes editing and submits to the teacher.
