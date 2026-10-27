-- Pinned Library collections: an additive per-account ordering hint. The target is
-- not a foreign key because albums, artists and playlists live in different tables;
-- the snapshot only reports a pin whose collection is still in the account's Library.
create table music.library_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  kind text not null check(kind in ('albums','artists','playlists')),
  entity_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,kind,entity_id)
);
create index library_pins_recent_idx on music.library_pins(user_id,created_at desc,id);

alter table music.library_pins enable row level security;
alter table music.library_pins force row level security;
create policy admin_all on music.library_pins to music_admin using (true) with check (true);
create trigger touch_updated_at before update on music.library_pins
  for each row execute function music.touch_updated_at();
revoke all on music.library_pins from public,anon,authenticated;
grant select,insert,update,delete on music.library_pins to music_admin;
create policy own_rows on music.library_pins to music_user
  using(user_id=music.current_user_id()) with check(user_id=music.current_user_id());
grant select,insert,update,delete on music.library_pins to music_user;
