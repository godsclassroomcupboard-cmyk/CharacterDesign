-- ============================================================
--  AURABOT — Peer Feedback on Stories
--  Run in Supabase SQL Editor (after storylab-schema.sql)
-- ============================================================

-- ── 1. STORY FEEDBACK TABLE ──────────────────────────────────
create table if not exists public.story_feedback (
  id            uuid primary key default gen_random_uuid(),
  story_id      uuid not null references public.stories(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade, -- the story writer (denormalized for easy author lookups)
  commenter_id  uuid not null references public.profiles(id) on delete cascade, -- the student leaving feedback
  worked_well   text not null default '',
  would_add     text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists story_feedback_story_idx  on public.story_feedback(story_id);
create index if not exists story_feedback_author_idx on public.story_feedback(author_id);

alter table public.story_feedback enable row level security;

-- Anyone can read feedback on public stories, plus the author can always
-- read feedback on their own story (even if they later un-publish it),
-- and a commenter can see their own past comments.
create policy "story_feedback_select"
  on public.story_feedback for select
  using (
    auth.uid() = author_id
    or auth.uid() = commenter_id
    or exists (
      select 1 from public.stories
      where id = story_id and is_public = true
    )
  );

-- Any signed-in student can leave feedback on a public story
-- (multiple times allowed, per your preference)
create policy "story_feedback_insert"
  on public.story_feedback for insert
  with check (
    auth.uid() = commenter_id
    and exists (
      select 1 from public.stories
      where id = story_id and is_public = true
    )
  );

-- Commenters can delete their own feedback; authors/teachers can
-- moderate feedback left on their own story.
create policy "story_feedback_delete"
  on public.story_feedback for delete
  using (
    auth.uid() = commenter_id
    or auth.uid() = author_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_teacher = true
    )
  );


-- ── 2. CONVENIENCE VIEW — community stories with author info ─
create or replace view public.community_stories_view as
select
  s.id,
  s.user_id,
  p.username,
  p.display_name,
  s.title,
  s.paragraphs,
  s.scaffold,
  s.created_at,
  s.updated_at,
  (select count(*) from public.story_feedback f where f.story_id = s.id) as feedback_count
from public.stories s
join public.profiles p on p.id = s.user_id
where s.is_public = true;
