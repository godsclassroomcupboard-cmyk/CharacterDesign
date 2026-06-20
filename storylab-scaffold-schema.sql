-- ============================================================
--  AURABOT — Plot Scaffold column for Story Lab
--  Run in Supabase SQL Editor
-- ============================================================

alter table public.stories
  add column if not exists scaffold jsonb not null default '{"type":"problem","checked":{}}'::jsonb;

-- scaffold.type    — which structure the student picked: 'problem' or 'hero'
-- scaffold.checked — object of {stepId: true/false} for ticked-off steps
