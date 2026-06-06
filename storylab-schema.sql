-- ============================================================
--  AURABOT — Story Lab & Word Bank Schema
--  Run this in Supabase SQL Editor
-- ============================================================


-- ── 1. STORIES TABLE ─────────────────────────────────────────
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Untitled Story',
  paragraphs  jsonb not null default '{}'::jsonb,
  -- paragraphs keys: hook, intro, rising, climax, falling, resolution
  refs        jsonb not null default '{"chars":[],"settings":[]}'::jsonb,
  -- refs.chars: array of character objects, refs.settings: array of setting objects
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at
  before update on public.stories
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.stories enable row level security;

create policy "stories_select_own"
  on public.stories for select
  using (auth.uid() = user_id or is_public = true);

create policy "stories_insert_own"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "stories_update_own"
  on public.stories for update
  using (auth.uid() = user_id);

create policy "stories_delete_own"
  on public.stories for delete
  using (auth.uid() = user_id);


-- ── 2. WORD BANK TABLE ───────────────────────────────────────
create table if not exists public.word_bank (
  id           uuid primary key default gen_random_uuid(),
  word         text not null,
  replaces     text,          -- the basic word this replaces (e.g. 'said', 'good')
  category     text not null default 'General',
  rating       integer not null default 1 check (rating between 1 and 3),
  -- 1 = beginner, 2 = intermediate, 3 = advanced
  approved     boolean not null default false,
  suggested_by uuid references public.profiles(id) on delete set null,
  added_by     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.word_bank enable row level security;

-- Anyone can read approved words
create policy "word_bank_select_approved"
  on public.word_bank for select
  using (approved = true or auth.uid() = suggested_by);

-- Any authenticated user can suggest (approved=false)
create policy "word_bank_insert_suggest"
  on public.word_bank for insert
  with check (auth.uid() is not null);

-- Teachers (is_teacher=true in profiles) can approve/update/delete
create policy "word_bank_update_teacher"
  on public.word_bank for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_teacher = true or role = 'teacher')
    )
  );

create policy "word_bank_delete_teacher"
  on public.word_bank for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_teacher = true or role = 'teacher')
    )
  );


-- ── 3. SEED DEFAULT WORDS ────────────────────────────────────
-- Run this to pre-populate the word bank so it works immediately.
-- The app has a JS fallback, but these will be stored in Supabase
-- so teachers and students see a consistent shared bank.

insert into public.word_bank (word, replaces, category, rating, approved) values
-- Said alternatives
('whispered',   'said', 'Said alternatives', 1, true),
('muttered',    'said', 'Said alternatives', 1, true),
('exclaimed',   'said', 'Said alternatives', 1, true),
('announced',   'said', 'Said alternatives', 1, true),
('hissed',      'said', 'Said alternatives', 2, true),
('stammered',   'said', 'Said alternatives', 2, true),
('bellowed',    'said', 'Said alternatives', 2, true),
('murmured',    'said', 'Said alternatives', 1, true),
('scoffed',     'said', 'Said alternatives', 2, true),
('pleaded',     'said', 'Said alternatives', 1, true),
('snarled',     'said', 'Said alternatives', 2, true),
('rasped',      'said', 'Said alternatives', 3, true),
-- Good / Bad
('magnificent', 'good', 'Good / Bad', 2, true),
('exceptional', 'good', 'Good / Bad', 2, true),
('extraordinary','good','Good / Bad', 3, true),
('flawless',    'good', 'Good / Bad', 2, true),
('superb',      'good', 'Good / Bad', 1, true),
('dreadful',    'bad',  'Good / Bad', 1, true),
('appalling',   'bad',  'Good / Bad', 2, true),
('catastrophic','bad',  'Good / Bad', 3, true),
('wretched',    'bad',  'Good / Bad', 2, true),
('abysmal',     'bad',  'Good / Bad', 3, true),
-- Movement
('crept',       'walked', 'Movement', 1, true),
('strode',      'walked', 'Movement', 1, true),
('trudged',     'walked', 'Movement', 1, true),
('stumbled',    'walked', 'Movement', 1, true),
('prowled',     'walked', 'Movement', 2, true),
('lurched',     'walked', 'Movement', 2, true),
('sprinted',    'ran',    'Movement', 1, true),
('bolted',      'ran',    'Movement', 1, true),
('hurtled',     'ran',    'Movement', 2, true),
('careened',    'ran',    'Movement', 3, true),
-- Emotions
('trembling',              'scared', 'Emotions', 1, true),
('paralysed with fear',    'scared', 'Emotions', 2, true),
('elated',                 'happy',  'Emotions', 2, true),
('overjoyed',              'happy',  'Emotions', 1, true),
('beaming',                'happy',  'Emotions', 1, true),
('euphoric',               'happy',  'Emotions', 3, true),
('devastated',             'sad',    'Emotions', 2, true),
('heartbroken',            'sad',    'Emotions', 1, true),
('desolate',               'sad',    'Emotions', 3, true),
('seething',               'angry',  'Emotions', 2, true),
('fuming',                 'angry',  'Emotions', 1, true),
('incensed',               'angry',  'Emotions', 3, true),
-- Appearance
('towering',      'tall',    'Appearance', 1, true),
('imposing',      'tall',    'Appearance', 2, true),
('weather-beaten','old',     'Appearance', 2, true),
('ancient',       'old',     'Appearance', 1, true),
('luminous',      'bright',  'Appearance', 2, true),
('gleaming',      'shiny',   'Appearance', 1, true),
('shadowy',       'dark',    'Appearance', 1, true),
('murky',         'dark',    'Appearance', 1, true),
('haggard',       'tired',   'Appearance', 2, true),
-- Sound
('thunderous',    'loud',    'Sound', 2, true),
('deafening',     'loud',    'Sound', 2, true),
('hushed',        'quiet',   'Sound', 1, true),
('barely audible','quiet',   'Sound', 2, true),
('rustling',      'soft sound','Sound',1,true),
('resonating',    'echoing', 'Sound', 3, true),
('cacophony',     'noise',   'Sound', 3, true),
-- Texture
('coarse',        'rough',   'Texture', 1, true),
('jagged',        'rough',   'Texture', 1, true),
('velvety',       'soft',    'Texture', 2, true),
('silken',        'smooth',  'Texture', 2, true),
('gritty',        'rough',   'Texture', 1, true),
-- Time
('in an instant',          'quickly',  'Time', 1, true),
('without warning',        'suddenly', 'Time', 1, true),
('in the blink of an eye', 'fast',     'Time', 2, true),
('agonisingly slowly',     'slowly',   'Time', 3, true),
-- Weather
('swirling',    'windy',      'Weather', 1, true),
('pelting',     'raining',    'Weather', 1, true),
('relentless',  'constant',   'Weather', 2, true),
('oppressive',  'hot',        'Weather', 2, true),
('bitter',      'cold',       'Weather', 1, true),
('blistering',  'very hot',   'Weather', 2, true)
on conflict do nothing;


-- ── 4. ADD is_teacher TO PROFILES (if not already there) ─────
-- This lets the word bank check if a user is a teacher
alter table public.profiles
  add column if not exists is_teacher boolean not null default false;

alter table public.profiles
  add column if not exists role text not null default 'student';

-- To make a user a teacher, run:
-- update public.profiles set is_teacher = true, role = 'teacher' where id = '<user-uuid>';
