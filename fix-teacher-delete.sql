-- ============================================================
--  FIX: Teacher cannot delete student characters/settings
--  Run in Supabase SQL Editor, in order, top to bottom.
--
--  Root cause: the original RLS delete policies only allow a
--  user to delete THEIR OWN rows (auth.uid() = user_id). When
--  the teacher clicks delete on the teacher page, they are a
--  different authenticated user than the student who owns the
--  character/setting, so Supabase silently matches zero rows
--  and deletes nothing — no error is thrown, which is why it
--  looked like it "worked" but nothing actually disappeared.
--
--  Fix: add an is_teacher flag to profiles, then let delete
--  policies check "is the owner OR is a teacher".
-- ============================================================

-- ── 1. Add is_teacher flag to profiles ───────────────────────
alter table public.profiles
  add column if not exists is_teacher boolean not null default false;


-- ── 2. CHARACTERS — fix delete policy ────────────────────────
drop policy if exists "chars_delete_own" on public.characters;

create policy "chars_delete_own_or_teacher"
  on public.characters for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_teacher = true
    )
  );


-- ── 3. SETTINGS — fix delete policy ──────────────────────────
drop policy if exists "settings_delete_own" on public.settings;

create policy "settings_delete_own_or_teacher"
  on public.settings for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_teacher = true
    )
  );


-- ============================================================
--  LAST STEP — mark your teacher account(s)
--  Run this separately, once, for each teacher login.
--  Replace the email with your actual teacher account email.
-- ============================================================

-- update public.profiles
-- set is_teacher = true
-- where id = (select id from auth.users where email = 'your-teacher-email@example.com');

-- To check it worked:
-- select id, username, display_name, is_teacher from public.profiles where is_teacher = true;
