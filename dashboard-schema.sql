-- ============================================================
--  AURABOT — Dashboard Schema
--  Run in Supabase SQL Editor
-- ============================================================

-- ── 1. STORY PROMPTS TABLE ───────────────────────────────────
-- Teachers create daily prompts (Pobble 365 style)

create table if not exists public.story_prompts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  caption      text,
  questions    text,          -- newline-separated list of prompt questions
  image_url    text,          -- public URL from Supabase storage
  prompt_date  date not null default current_date,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Only one prompt per date (teachers can overwrite by date)
create unique index if not exists story_prompts_date_idx on public.story_prompts(prompt_date);

-- RLS: anyone can read, only teachers can write
alter table public.story_prompts enable row level security;

create policy "prompts_select_all"
  on public.story_prompts for select using (true);

create policy "prompts_insert_teacher"
  on public.story_prompts for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_teacher = true or role = 'teacher'))
  );

create policy "prompts_update_teacher"
  on public.story_prompts for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_teacher = true or role = 'teacher'))
  );

create policy "prompts_delete_teacher"
  on public.story_prompts for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_teacher = true or role = 'teacher'))
  );


-- ── 2. PROMPT IMAGES STORAGE BUCKET ─────────────────────────
insert into storage.buckets (id, name, public)
  values ('prompt-images', 'prompt-images', true)
  on conflict (id) do nothing;

create policy "prompt_img_insert_teacher"
  on storage.objects for insert
  with check (
    bucket_id = 'prompt-images'
    and exists (select 1 from public.profiles where id = auth.uid() and (is_teacher = true or role = 'teacher'))
  );

create policy "prompt_img_select_all"
  on storage.objects for select
  using (bucket_id = 'prompt-images');

create policy "prompt_img_delete_teacher"
  on storage.objects for delete
  using (
    bucket_id = 'prompt-images'
    and exists (select 1 from public.profiles where id = auth.uid() and (is_teacher = true or role = 'teacher'))
  );


-- ── 3. MAKE A USER A TEACHER ─────────────────────────────────
-- Run this to give a specific user teacher access:
--
--   update public.profiles
--   set is_teacher = true, role = 'teacher'
--   where id = '<paste-user-uuid-here>';
--
-- Find the UUID in: Supabase → Authentication → Users

-- ── 4. SEED A TEST PROMPT ────────────────────────────────────
-- Optional: add a sample prompt so the dashboard isn't empty.
-- Replace with your own title/questions before running.

insert into public.story_prompts (title, caption, questions, prompt_date)
values (
  'The Door at the End of the Hall',
  'Nobody had opened that door in years. The paint was peeling, the handle was ice cold, and behind it... silence.',
  'Who discovered this door, and what were they doing when they found it?
What do you think is on the other side? Describe it using all five senses.
Has anyone gone through it before? What happened to them?
Write the opening three paragraphs of a story that begins with this door.',
  current_date
) on conflict (prompt_date) do nothing;
