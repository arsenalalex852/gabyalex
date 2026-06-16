-- ============================================================
--  gabyalex — database schema
--  Run this in the Supabase SQL editor (one paste, top to bottom).
--
--  Design principle: EVERYTHING hangs off a `couple` (the tenant).
--  This is what lets the app work for you two now AND for other
--  couples later, with each couple's data fully isolated by RLS.
-- ============================================================

-- ---------- 1. CORE TENANCY ----------

create table if not exists couples (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  theme       jsonb default '{}'::jsonb,   -- colors, season, etc.
  created_at  timestamptz default now()
);

-- profiles extends Supabase's built-in auth.users
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  couple_id     uuid references couples(id) on delete set null,
  display_name  text,
  timezone      text default 'UTC',
  city_label    text,                       -- "Pamplona" / "Boston" for the clocks
  sprite_config jsonb default '{}'::jsonb,   -- outfit, color, accessories
  created_at    timestamptz default now()
);

-- Helper: the couple_id of the currently logged-in user.
-- Every RLS policy below leans on this.
create or replace function auth_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from profiles where id = auth.uid()
$$;

-- ---------- 2. FEATURE TABLES (all scoped by couple_id) ----------

-- World map + all bucket lists (travel / dates / general share one table)
create table if not exists bucket_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  category    text not null default 'general',  -- 'travel' | 'date' | 'general'
  title       text not null,
  notes       text,
  status      text default 'dreaming',          -- 'dreaming' | 'booked' | 'done'
  photo_url   text,
  lat         double precision,                 -- map pin
  lng         double precision,
  author_id   uuid references profiles(id),
  created_at  timestamptz default now(),
  done_at     timestamptz
);

-- One table powers ALL the jars: date ideas, memories, compliments.
create table if not exists jars (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  type        text not null,                    -- 'date' | 'memory' | 'compliment'
  title       text
);

create table if not exists jar_items (
  id            uuid primary key default gen_random_uuid(),
  jar_id        uuid not null references jars(id) on delete cascade,
  couple_id     uuid not null references couples(id) on delete cascade,
  content       text not null,
  author_id     uuid references profiles(id),
  created_at    timestamptz default now(),
  last_drawn_at timestamptz
);

-- Mailbox / leave-a-note
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  author_id   uuid references profiles(id),
  body        text not null,
  created_at  timestamptz default now(),
  read_at     timestamptz
);

-- Goals: mine / hers / ours
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  owner       text default 'ours',              -- 'mine' | 'hers' | 'ours'
  title       text not null,
  progress    int default 0,                    -- 0..100
  created_at  timestamptz default now()
);

-- Savings jars (manual progress bars, NOT real banking)
create table if not exists savings (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade,
  goal_name       text not null,
  target_amount   numeric default 0,
  current_amount  numeric default 0,
  created_at      timestamptz default now()
);

-- Habits + their logs (streaks)
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  title       text not null,
  owner       text default 'ours',
  created_at  timestamptz default now()
);

create table if not exists habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references habits(id) on delete cascade,
  couple_id   uuid not null references couples(id) on delete cascade,
  logged_on   date not null default current_date,
  unique (habit_id, logged_on)
);

-- Watch-together queue
create table if not exists watch_queue (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  title       text not null,
  watched     boolean default false,
  added_by    uuid references profiles(id),
  created_at  timestamptz default now()
);

-- Brainstorm scratch sheet (one shared doc per couple, autosaved)
create table if not exists scratch (
  couple_id   uuid primary key references couples(id) on delete cascade,
  body        text default '',
  updated_at  timestamptz default now()
);

-- Room furniture (for the sprite space — built later, schema ready now)
create table if not exists room_objects (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  kind        text not null,
  x           double precision,
  y           double precision,
  created_at  timestamptz default now()
);

-- ---------- 3. ROW LEVEL SECURITY ----------
-- Turn RLS on for every table, then allow access only to rows
-- belonging to the logged-in user's couple. This is the wall
-- between one couple's data and another's.

alter table couples       enable row level security;
alter table profiles      enable row level security;
alter table bucket_items  enable row level security;
alter table jars          enable row level security;
alter table jar_items     enable row level security;
alter table notes         enable row level security;
alter table goals         enable row level security;
alter table savings       enable row level security;
alter table habits        enable row level security;
alter table habit_logs    enable row level security;
alter table watch_queue   enable row level security;
alter table scratch       enable row level security;
alter table room_objects  enable row level security;

-- profiles: you can read profiles in your couple, edit only your own
create policy "read own couple profiles" on profiles
  for select using (couple_id = auth_couple_id() or id = auth.uid());
create policy "update own profile" on profiles
  for update using (id = auth.uid());
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

-- couples: read your own couple
create policy "read own couple" on couples
  for select using (id = auth_couple_id());
create policy "update own couple" on couples
  for update using (id = auth_couple_id());

-- Generic policy for every couple-scoped feature table.
-- (Repeated per table because Postgres policies aren't inheritable.)
do $$
declare t text;
begin
  foreach t in array array[
    'bucket_items','jars','jar_items','notes','goals','savings',
    'habits','habit_logs','watch_queue','scratch','room_objects'
  ]
  loop
    execute format($f$
      create policy "couple read"   on %1$I for select using (couple_id = auth_couple_id());
      create policy "couple insert" on %1$I for insert with check (couple_id = auth_couple_id());
      create policy "couple update" on %1$I for update using (couple_id = auth_couple_id());
      create policy "couple delete" on %1$I for delete using (couple_id = auth_couple_id());
    $f$, t);
  end loop;
end $$;

-- ============================================================
--  DONE. Next: create your two accounts and link them to a couple.
--  See seed.sql for that step.
-- ============================================================
