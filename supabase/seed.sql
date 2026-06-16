-- ============================================================
--  gabyalex — seed (run AFTER you and Gaby have signed up once)
-- ============================================================
--
--  STEP 1: In the app's login screen, create both accounts
--          (or in Supabase > Authentication > Users > Add user).
--          Note each person's user UID.
--
--  STEP 2: Create your couple and link both profiles to it.
--          Replace the two UIDs below.
-- ============================================================

-- Create the couple
insert into couples (name, theme)
values ('Gaby & Alex', '{"season":"auto"}')
returning id;
--  ^ copy the returned id, paste it below as :couple_id

-- Link both people to it (replace the UUIDs)
-- update profiles
--   set couple_id = '<PASTE_COUPLE_ID>',
--       display_name = 'Alex',
--       city_label = 'Pamplona',
--       timezone = 'Europe/Madrid'
--   where id = '<YOUR_AUTH_UID>';

-- update profiles
--   set couple_id = '<PASTE_COUPLE_ID>',
--       display_name = 'Gaby',
--       city_label = 'Boston',
--       timezone = 'America/New_York'
--   where id = '<HER_AUTH_UID>';

-- Optional: seed the three jars so they exist on first load
-- insert into jars (couple_id, type, title) values
--   ('<PASTE_COUPLE_ID>','date','Date ideas'),
--   ('<PASTE_COUPLE_ID>','memory','Memory jar'),
--   ('<PASTE_COUPLE_ID>','compliment','Things I love about you');

-- NOTE: a trigger auto-creates a blank profile row when someone signs up,
-- so by the time you run the updates above, the profile rows already exist.
