-- ============================================================
--  gabyalex — planner table
--  Run this once in the Supabase SQL editor.
--  One row per (couple, section, person). Autosaved free text.
-- ============================================================

create table if not exists planner (
  couple_id   uuid not null references couples(id) on delete cascade,
  section     text not null,            -- 'today' | 'todo' | 'events'
  author_id   uuid not null references profiles(id) on delete cascade,
  body        text default '',
  updated_at  timestamptz default now(),
  primary key (couple_id, section, author_id)
);

alter table planner enable row level security;

create policy "couple read planner"   on planner for select using (couple_id = auth_couple_id());
create policy "couple insert planner" on planner for insert with check (couple_id = auth_couple_id());
create policy "couple update planner" on planner for update using (couple_id = auth_couple_id());
create policy "couple delete planner" on planner for delete using (couple_id = auth_couple_id());
