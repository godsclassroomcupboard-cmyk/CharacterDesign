-- ============================================================
--  FIX: Rename generic "Avatar N" rows to match the proper
--  named/emoji list used by the student picker.
--
--  Run this in Supabase SQL Editor. It's safe to run even if
--  some rows are already correctly named — it only touches rows
--  matching the generic "Avatar N" pattern.
-- ============================================================

-- Step 1 — see what you currently have, in order:
select id, name, sort_order, stage_1_url
from public.avatar_templates
order by sort_order;

-- Step 2 — rename any generic "Avatar N" rows to the proper names,
-- matched by their sort_order position (0-indexed) in the same
-- 10-name list used everywhere else in the app.
update public.avatar_templates
set name = case sort_order
  when 0 then 'Ember the Fox'
  when 1 then 'Splash the Otter'
  when 2 then 'Nova the Owl'
  when 3 then 'Rumble the Bear'
  when 4 then 'Blaze the Tiger'
  when 5 then 'Misty the Wolf'
  when 6 then 'Coral the Axolotl'
  when 7 then 'Drift the Penguin'
  when 8 then 'Zara the Dragon'
  when 9 then 'Pip the Hedgehog'
  else name
end
where name like 'Avatar %';

-- Step 3 — verify the fix
select id, name, sort_order, stage_1_url
from public.avatar_templates
order by sort_order;
