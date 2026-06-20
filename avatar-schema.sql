-- ============================================================
--  AURABOT — Avatar Progression System
--  Run in Supabase SQL Editor AFTER supabase-schema.sql
-- ============================================================

-- ── 1. AVATAR TEMPLATES ──────────────────────────────────────
-- One row per starter avatar (4 total). Each has 6 stage image URLs.
create table if not exists public.avatar_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- e.g. "Flame Fox"
  description text,                          -- optional flavor text
  stage_1_url text,
  stage_2_url text,
  stage_3_url text,
  stage_4_url text,
  stage_5_url text,
  stage_6_url text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true, -- teacher can retire old avatars
  created_at  timestamptz not null default now()
);

alter table public.avatar_templates enable row level security;
create policy "avatar_templates_select_all" on public.avatar_templates for select using (true);
-- Inserts/updates/deletes happen via the teacher page using the anon key —
-- if you want to lock this down to teachers only, add a role check here later.
create policy "avatar_templates_all_write" on public.avatar_templates for all using (true) with check (true);


-- ── 2. STAT THRESHOLDS (editable by teacher) ────────────────
-- Single row holding the 6 total-point thresholds for morphing.
create table if not exists public.avatar_settings (
  id            integer primary key default 1,
  thresholds    integer[] not null default '{0,20,40,60,80,100}', -- stage 1..6 total points needed
  stat_names    text[]    not null default '{Hook,Introduction,Paragraphing,Spelling,Vocabulary,Editing,Creativity,"Story Structure"}',
  constraint avatar_settings_singleton check (id = 1)
);
insert into public.avatar_settings (id) values (1) on conflict (id) do nothing;

alter table public.avatar_settings enable row level security;
create policy "avatar_settings_select_all" on public.avatar_settings for select using (true);
create policy "avatar_settings_write" on public.avatar_settings for all using (true) with check (true);


-- ── 3. STUDENT'S CURRENT AVATAR PROGRESS ─────────────────────
create table if not exists public.student_avatars (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  template_id     uuid not null references public.avatar_templates(id) on delete cascade,
  stats           jsonb not null default '{"Hook":0,"Introduction":0,"Paragraphing":0,"Spelling":0,"Vocabulary":0,"Editing":0,"Creativity":0,"Story Structure":0}',
  total_points    integer not null default 0,
  current_stage   integer not null default 1,   -- 1 to 6
  is_completed    boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Only one ACTIVE (non-completed) avatar per student at a time
  unique(user_id, template_id, is_completed)
);

create index if not exists student_avatars_user_idx on public.student_avatars(user_id);
create index if not exists student_avatars_active_idx on public.student_avatars(user_id, is_completed);

alter table public.student_avatars enable row level security;
create policy "student_avatars_select_all" on public.student_avatars for select using (true); -- public/leaderboard visible
create policy "student_avatars_insert_own" on public.student_avatars for insert with check (auth.uid() = user_id);
-- Teacher needs to update stats for ANY student, so allow broad update via anon key from teacher page.
-- (If you want strict security, switch this to a service-role function instead.)
create policy "student_avatars_update_all" on public.student_avatars for update using (true);
create policy "student_avatars_delete_own" on public.student_avatars for delete using (auth.uid() = user_id);

create or replace function public.touch_student_avatar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists student_avatars_updated_at on public.student_avatars;
create trigger student_avatars_updated_at
  before update on public.student_avatars
  for each row execute procedure public.touch_student_avatar_updated_at();


-- ── 5. STORAGE BUCKET for avatar template images ─────────────
insert into storage.buckets (id, name, public)
values ('avatar-images', 'avatar-images', true)
on conflict (id) do nothing;

create policy "avatar_images_insert_all"
  on storage.objects for insert
  with check (bucket_id = 'avatar-images');

create policy "avatar_images_select_all"
  on storage.objects for select
  using (bucket_id = 'avatar-images');

create policy "avatar_images_delete_all"
  on storage.objects for delete
  using (bucket_id = 'avatar-images');

create policy "avatar_images_update_all"
  on storage.objects for update
  using (bucket_id = 'avatar-images');


-- ── 6. CONVENIENCE VIEW — for teacher page & leaderboard ─────
create or replace view public.student_avatar_view as
select
  sa.id,
  sa.user_id,
  p.username,
  p.display_name,
  sa.template_id,
  at.name as avatar_name,
  at.stage_1_url, at.stage_2_url, at.stage_3_url,
  at.stage_4_url, at.stage_5_url, at.stage_6_url,
  sa.stats,
  sa.total_points,
  sa.current_stage,
  sa.is_completed,
  sa.completed_at,
  sa.created_at,
  sa.updated_at
from public.student_avatars sa
join public.profiles p on p.id = sa.user_id
join public.avatar_templates at on at.id = sa.template_id;
