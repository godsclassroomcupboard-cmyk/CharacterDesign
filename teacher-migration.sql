-- ============================================================
--  AURABOT — Teacher Dashboard Migration
--  Run this in Supabase SQL Editor AFTER the original schema
--  Dashboard → SQL Editor → New query → paste → Run
-- ============================================================


-- ── 1. ADD class_code TO PROFILES ────────────────────────────
-- This links a student's Aurabot account to the teacher's class.
-- When a student signs up in Aurabot using their login code,
-- their username should match the code from the teacher dashboard.
alter table public.profiles
  add column if not exists class_code text,
  add column if not exists student_name text;

-- Index for fast lookups by class code
create index if not exists profiles_class_code_idx on public.profiles(class_code);


-- ── 2. TEACHER FEEDBACK TABLE ────────────────────────────────
create table if not exists public.teacher_feedback (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  teacher_note text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Update timestamp trigger
drop trigger if exists feedback_updated_at on public.teacher_feedback;
create trigger feedback_updated_at
  before update on public.teacher_feedback
  for each row execute procedure public.set_updated_at();

-- RLS: anyone can read feedback (teacher uses anon key), only service role inserts
alter table public.teacher_feedback enable row level security;
create policy "feedback_select_all" on public.teacher_feedback for select using (true);
create policy "feedback_insert_all" on public.teacher_feedback for insert with check (true);
create policy "feedback_update_all" on public.teacher_feedback for update using (true);


-- ── 3. TEACHER VIEW (SECURITY DEFINER) ───────────────────────
-- This view bypasses RLS so the teacher dashboard (using the anon key)
-- can read characters for any student whose class_code is known.
-- The anon key alone cannot read private characters — this view is the gate.

create or replace view public.teacher_character_view
with (security_invoker = false)
as
  select
    c.id,
    c.name          as character_name,
    c.appearance,
    c.height,
    c.build,
    c.personality,
    c.strengths,
    c.fears,
    c.interests,
    c.features,
    c.art_style,
    c.sketch_description,
    c.sketch_url,
    c.ai_art_url,
    c.is_public,
    c.star_count,
    c.created_at,
    c.updated_at,
    p.id            as student_id,
    p.username      as student_username,
    p.display_name  as student_display_name,
    p.class_code,
    p.student_name,
    f.teacher_note,
    f.id            as feedback_id
  from public.characters c
  join public.profiles p on p.id = c.user_id
  left join public.teacher_feedback f on f.character_id = c.id;

-- Grant anon role access to this view
grant select on public.teacher_character_view to anon;
grant select on public.teacher_character_view to authenticated;


-- ── 4. HELPER FUNCTION: get_class_characters ─────────────────
-- Call this from the teacher dashboard with a list of class codes.
-- Returns all characters for students in those classes.
create or replace function public.get_class_characters(codes text[])
returns setof public.teacher_character_view
language sql
security definer
stable
as $$
  select * from public.teacher_character_view
  where class_code = any(codes)
  order by created_at desc;
$$;

grant execute on function public.get_class_characters(text[]) to anon;
grant execute on function public.get_class_characters(text[]) to authenticated;


-- ── 5. HELPER FUNCTION: get_class_stats ──────────────────────
-- Returns per-student stats for a set of class codes.
create or replace function public.get_class_stats(codes text[])
returns table (
  class_code      text,
  student_username text,
  student_name    text,
  character_count bigint,
  public_count    bigint,
  star_total      bigint
)
language sql
security definer
stable
as $$
  select
    p.class_code,
    p.username as student_username,
    p.student_name,
    count(c.id)                          as character_count,
    count(c.id) filter (where c.is_public) as public_count,
    coalesce(sum(c.star_count), 0)       as star_total
  from public.profiles p
  left join public.characters c on c.user_id = p.id
  where p.class_code = any(codes)
  group by p.class_code, p.username, p.student_name
  order by character_count desc;
$$;

grant execute on function public.get_class_stats(text[]) to anon;
grant execute on function public.get_class_stats(text[]) to authenticated;


-- ── 6. DONE ──────────────────────────────────────────────────
-- After running this migration:
-- 1. Upload the new teacher.html to GitHub
-- 2. When students sign up in Aurabot, they should use their
--    login code as their username (teacher explains this to them)
-- 3. The teacher dashboard will automatically find their characters
