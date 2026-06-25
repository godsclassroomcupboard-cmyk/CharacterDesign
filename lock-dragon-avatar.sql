-- ============================================================
--  FIX: Lock the Dragon avatar until a student has completed
--  at least one other avatar first.
--
--  This replaces the insert policy on student_avatars with one
--  that blocks picking the avatar template named 'Zara the Dragon'
--  unless the student already has at least one completed avatar.
--  This is a server-side backstop — the UI already prevents this,
--  but this stops it from being bypassed via devtools too.
--
--  Run in Supabase SQL Editor.
-- ============================================================

drop policy if exists "student_avatars_insert_own" on public.student_avatars;

create policy "student_avatars_insert_own_with_dragon_lock"
  on public.student_avatars for insert
  with check (
    auth.uid() = user_id
    and (
      -- Allow any avatar that isn't the locked one
      template_id not in (
        select id from public.avatar_templates where name = 'Zara the Dragon'
      )
      -- OR allow the Dragon specifically if this student has already
      -- completed at least one other avatar
      or exists (
        select 1 from public.student_avatars
        where user_id = auth.uid() and is_completed = true
      )
    )
  );
