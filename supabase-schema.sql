-- ============================================================
--  AURABOT — Supabase Schema
--  Run this entire file in your Supabase SQL Editor
--  (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================


-- ── 1. PROFILES ─────────────────────────────────────────────
-- One row per user, created automatically on sign-up via trigger.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  star_points integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. CHARACTERS ────────────────────────────────────────────
-- Each saved character creation.
create table if not exists public.characters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,

  -- Core fields (mirrors the app form)
  name          text,
  appearance    text,
  height        text,
  build         text,
  personality   text,
  strengths     text,
  fears         text,
  interests     text,
  features      text,

  -- AI generation
  art_style     text,                    -- e.g. 'anime', 'comic'
  sketch_description text,              -- what the student typed

  -- Images (Supabase Storage URLs)
  sketch_url    text,                   -- original hand-drawn sketch
  ai_art_url    text,                   -- AI-styled result

  -- Community
  is_public     boolean not null default false,
  star_count    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_updated_at on public.characters;
create trigger characters_updated_at
  before update on public.characters
  for each row execute procedure public.set_updated_at();


-- ── 3. STARS ─────────────────────────────────────────────────
-- Tracks which user starred which character (one star per user per character).
create table if not exists public.stars (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(user_id, character_id)
);

-- Keep characters.star_count in sync automatically
create or replace function public.update_star_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.characters set star_count = star_count + 1 where id = new.character_id;
    update public.profiles   set star_points = star_points + 1
      where id = (select user_id from public.characters where id = new.character_id);
  elsif TG_OP = 'DELETE' then
    update public.characters set star_count = greatest(star_count - 1, 0) where id = old.character_id;
    update public.profiles   set star_points = greatest(star_points - 1, 0)
      where id = (select user_id from public.characters where id = old.character_id);
  end if;
  return null;
end;
$$;

drop trigger if exists stars_count_trigger on public.stars;
create trigger stars_count_trigger
  after insert or delete on public.stars
  for each row execute procedure public.update_star_count();


-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- characters
alter table public.characters enable row level security;
-- Anyone can read public characters
create policy "chars_select_public"  on public.characters for select using (is_public = true or auth.uid() = user_id);
-- Only owner can insert/update/delete
create policy "chars_insert_own"     on public.characters for insert with check (auth.uid() = user_id);
create policy "chars_update_own"     on public.characters for update using (auth.uid() = user_id);
create policy "chars_delete_own"     on public.characters for delete using (auth.uid() = user_id);

-- stars
alter table public.stars enable row level security;
create policy "stars_select_all"     on public.stars for select using (true);
create policy "stars_insert_own"     on public.stars for insert with check (auth.uid() = user_id);
create policy "stars_delete_own"     on public.stars for delete using (auth.uid() = user_id);


-- ── 5. STORAGE BUCKETS ───────────────────────────────────────
-- Run these separately in the Supabase Storage UI OR via SQL:
insert into storage.buckets (id, name, public)
  values ('character-images', 'character-images', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'character-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_select_all"
  on storage.objects for select
  using (bucket_id = 'character-images');

create policy "storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'character-images' and auth.uid()::text = (storage.foldername(name))[1]);


-- ── 6. HELPFUL VIEWS ─────────────────────────────────────────

-- Community feed: public characters with author info, sorted by stars
create or replace view public.community_feed as
  select
    c.id,
    c.name,
    c.art_style,
    c.sketch_url,
    c.ai_art_url,
    c.star_count,
    c.created_at,
    p.username,
    p.display_name,
    p.avatar_url
  from public.characters c
  join public.profiles p on p.id = c.user_id
  where c.is_public = true
  order by c.star_count desc, c.created_at desc;
