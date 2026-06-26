-- ============================================================
--  gabyalex — reading list table (run once in Supabase SQL editor)
-- ============================================================

create table if not exists reading_list (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  title       text not null,
  read        boolean default false,
  added_by    uuid references profiles(id),
  created_at  timestamptz default now()
);

alter table reading_list enable row level security;

create policy "couple read reading"   on reading_list for select using (couple_id = auth_couple_id());
create policy "couple insert reading" on reading_list for insert with check (couple_id = auth_couple_id());
create policy "couple update reading" on reading_list for update using (couple_id = auth_couple_id());
create policy "couple delete reading" on reading_list for delete using (couple_id = auth_couple_id());
