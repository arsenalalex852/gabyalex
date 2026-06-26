-- Date jar: add a status to each jar item.
-- 'available' = in the jar, 'drawn' = currently pulled out awaiting decision,
-- 'used' = retired (kept as history, can be put back).
-- Safe to run once. Existing items default to 'available'.

alter table jar_items
  add column if not exists status text not null default 'available';

-- make sure every existing row is available
update jar_items set status = 'available' where status is null;
