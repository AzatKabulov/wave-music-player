-- Architecture migration 001. Target: fresh Supabase PostgreSQL 17+ project.
-- Run with a migration identity allowed to create schemas/roles and reference auth.users.
-- No accounts, buckets, passwords, supplier feeds, or external services are created.
-- music is PRIVATE: do not add it to Supabase's exposed Data API schemas.
begin;
create schema music;
revoke all on schema music from public, anon, authenticated;

do $$ declare role_name text; begin
  foreach role_name in array array['music_user','music_admin'] loop
    if not exists(select 1 from pg_roles where rolname=role_name) then
      execute format('create role %I nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls',role_name);
    end if;
    if exists(select 1 from pg_roles where rolname=role_name and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole)) then
      raise exception 'Unexpected elevated existing role: %',role_name;
    end if;
  end loop;
end $$;
grant usage on schema music to music_user, music_admin;

-- The trusted API sets verified claims with set_config(..., true) INSIDE a transaction.
-- This setting alone is not authentication; native clients receive no DB credentials.
create function music.current_user_id() returns uuid language sql stable
set search_path=pg_catalog as $$
  select (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid
$$;
create function music.touch_updated_at() returns trigger language plpgsql
set search_path=pg_catalog as $$ begin new.updated_at=now(); return new; end $$;

create table music.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check(length(btrim(display_name)) between 1 and 80),
  country_code text not null default 'TM' check(country_code ~ '^[A-Z]{2}$'),
  state text not null default 'active' check(state in ('active','deleting')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table music.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references music.profiles(user_id) on delete cascade,
  explicit_allowed boolean not null default true,
  locale text not null default 'tk' check(length(locale) between 2 and 35),
  audio_quality text not null default 'standard' check(audio_quality in ('data_saver','standard')),
  library_sort text not null default 'recent' check(library_sort in ('recent','title','creator')),
  library_layout text not null default 'list' check(library_layout in ('list','grid')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table music.catalog_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 160),
  kind text not null check(kind in ('direct','supplier','test')),
  status text not null default 'active' check(status in ('active','paused','closed')),
  agreement_ref text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table music.media_assets (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references music.catalog_sources(id) on delete restrict,
  kind text not null check(kind in ('audio','image','evidence')),
  storage_key text not null unique check(length(storage_key) between 1 and 512),
  mime_type text not null check(length(mime_type) between 1 and 100),
  byte_size bigint not null check(byte_size > 0),
  sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in ('pending','ready','quarantined','withdrawn')),
  bitrate_kbps integer check(bitrate_kbps between 16 and 512),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index assets_source_idx on music.media_assets(source_id);
create index assets_processing_idx on music.media_assets(status,created_at);
create table music.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 240),
  search_text text not null check(length(search_text) between 1 and 4000),
  search_document tsvector generated always as (to_tsvector('simple'::regconfig,search_text)) stored,
  image_asset_id uuid references music.media_assets(id) on delete set null,
  bio text check(length(bio)<=4000),
  status text not null default 'draft' check(status in ('draft','published','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index artists_image_idx on music.artists(image_asset_id);
create index artists_search_idx on music.artists using gin(search_document);
create index artists_prefix_idx on music.artists(lower(search_text) text_pattern_ops);
create index artists_published_idx on music.artists(status,created_at desc,id);
create table music.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 300),
  search_text text not null check(length(search_text) between 1 and 4000),
  search_document tsvector generated always as (to_tsvector('simple'::regconfig,search_text)) stored,
  release_date date,
  cover_asset_id uuid references music.media_assets(id) on delete set null,
  status text not null default 'draft' check(status in ('draft','published','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index albums_cover_idx on music.albums(cover_asset_id);
create index albums_search_idx on music.albums using gin(search_document);
create index albums_prefix_idx on music.albums(lower(search_text) text_pattern_ops);
create index albums_published_idx on music.albums(status,created_at desc,id);
create table music.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 300),
  search_text text not null check(length(search_text) between 1 and 4000),
  search_document tsvector generated always as (to_tsvector('simple'::regconfig,search_text)) stored,
  duration_ms integer not null check(duration_ms between 1 and 7200000),
  explicit boolean not null default false,
  language_code text check(length(language_code) between 2 and 35),
  genres text[] not null default '{}',
  isrc text check(isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  audio_asset_id uuid not null references music.media_assets(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','published','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tracks_audio_idx on music.tracks(audio_asset_id);
create index tracks_search_idx on music.tracks using gin(search_document);
create index tracks_prefix_idx on music.tracks(lower(search_text) text_pattern_ops);
create index tracks_genres_idx on music.tracks using gin(genres);
create index tracks_language_idx on music.tracks(language_code,status);
create index tracks_published_idx on music.tracks(status,created_at desc,id);
create index tracks_isrc_idx on music.tracks(isrc) where isrc is not null;
create table music.track_artists (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references music.tracks(id) on delete restrict,
  artist_id uuid not null references music.artists(id) on delete restrict,
  credit_role text not null default 'primary' check(credit_role in ('primary','featured','composer')),
  position integer not null default 0 check(position>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(track_id,artist_id,credit_role), unique(track_id,position)
);
create index track_artists_artist_idx on music.track_artists(artist_id,position);
create table music.album_tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references music.albums(id) on delete restrict,
  track_id uuid not null references music.tracks(id) on delete restrict,
  disc_number integer not null default 1 check(disc_number>0),
  track_number integer not null check(track_number>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(album_id,disc_number,track_number)
);
create index album_tracks_track_idx on music.album_tracks(track_id);
create table music.track_sources (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references music.tracks(id) on delete restrict,
  source_id uuid not null references music.catalog_sources(id) on delete restrict,
  external_id text not null check(length(external_id) between 1 and 256),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_id,external_id)
);
create index track_sources_track_idx on music.track_sources(track_id);
create table music.content_permissions (
  id uuid primary key default gen_random_uuid(),
  track_source_id uuid not null references music.track_sources(id) on delete cascade,
  territory text not null check(territory='*' or territory ~ '^[A-Z]{2}$'),
  allow_stream boolean not null default true,
  allow_download boolean not null default false,
  valid_from timestamptz not null,
  valid_until timestamptz,
  evidence_ref text not null check(length(btrim(evidence_ref)) between 1 and 1000),
  status text not null default 'pending' check(status in ('pending','active','revoked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(valid_until is null or valid_until>valid_from)
);
create index permissions_lookup_idx on music.content_permissions(track_source_id,territory,status,valid_from,valid_until);
create table music.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160),
  description text not null default '' check(length(description)<=2000),
  search_document tsvector generated always as (to_tsvector('simple'::regconfig,title || ' ' || description)) stored,
  cover_asset_id uuid references music.media_assets(id) on delete set null,
  kind text not null default 'personal' check(kind in ('personal','editorial')),
  is_published boolean not null default false,
  revision bigint not null default 0 check(revision>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id), check(not is_published or kind='editorial')
);
create index playlists_owner_idx on music.playlists(user_id,updated_at desc,id);
create index playlists_cover_idx on music.playlists(cover_asset_id);
create index playlists_search_idx on music.playlists using gin(search_document);
create index playlists_prefix_idx on music.playlists(lower(title) text_pattern_ops);
create index playlists_editorial_idx on music.playlists(is_published,updated_at desc,id) where kind='editorial';
create table music.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null,
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  track_id uuid not null references music.tracks(id) on delete restrict,
  position integer not null check(position>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(playlist_id,user_id) references music.playlists(id,user_id) on delete cascade,
  unique(playlist_id,position) deferrable initially immediate
);
create index playlist_items_owner_idx on music.playlist_items(user_id);
create index playlist_items_parent_owner_idx on music.playlist_items(playlist_id,user_id);
create index playlist_items_track_idx on music.playlist_items(track_id);
create table music.saved_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  track_id uuid not null references music.tracks(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,track_id)
);
create index saved_tracks_target_idx on music.saved_tracks(track_id);
create index saved_tracks_recent_idx on music.saved_tracks(user_id,created_at desc,id);
create table music.saved_albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  album_id uuid not null references music.albums(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,album_id)
);
create index saved_albums_target_idx on music.saved_albums(album_id);
create index saved_albums_recent_idx on music.saved_albums(user_id,created_at desc,id);
create table music.saved_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  playlist_id uuid not null references music.playlists(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,playlist_id)
);
create index saved_playlists_target_idx on music.saved_playlists(playlist_id);
create index saved_playlists_recent_idx on music.saved_playlists(user_id,created_at desc,id);
create table music.saved_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  artist_id uuid not null references music.artists(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,artist_id)
);
create index saved_artists_target_idx on music.saved_artists(artist_id);
create index saved_artists_recent_idx on music.saved_artists(user_id,created_at desc,id);
create table music.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  installation_id uuid not null,
  playlist_id uuid references music.playlists(id) on delete set null,
  album_id uuid references music.albums(id) on delete set null,
  current_queue_entry_id uuid,
  position_ms integer not null default 0 check(position_ms>=0),
  shuffle boolean not null default false,
  repeat_mode text not null default 'none' check(repeat_mode in ('none','all','single')),
  revision bigint not null default 0 check(revision>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,installation_id), unique(id,user_id), check(num_nonnulls(playlist_id,album_id)<=1)
);
create index sessions_playlist_idx on music.playback_sessions(playlist_id);
create index sessions_album_idx on music.playback_sessions(album_id);
create index sessions_current_idx on music.playback_sessions(current_queue_entry_id,id,user_id);
create table music.queue_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  track_id uuid not null references music.tracks(id) on delete restrict,
  position integer not null check(position>=0),
  origin text not null check(origin in ('explicit','context')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(session_id,user_id) references music.playback_sessions(id,user_id) on delete cascade,
  unique(id,session_id,user_id), unique(session_id,position) deferrable initially immediate
);
create index queue_owner_idx on music.queue_entries(user_id);
create index queue_parent_owner_idx on music.queue_entries(session_id,user_id);
create index queue_track_idx on music.queue_entries(track_id);
alter table music.playback_sessions add constraint session_current_entry_fk
  foreign key(current_queue_entry_id,id,user_id)
  references music.queue_entries(id,session_id,user_id)
  on delete no action deferrable initially deferred;
create table music.listening_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  track_id uuid not null references music.tracks(id) on delete restrict,
  client_event_id uuid not null,
  occurred_at timestamptz not null,
  played_ms integer not null check(played_ms between 0 and 7200000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,client_event_id)
);
create index events_track_idx on music.listening_events(track_id);
create index events_recent_idx on music.listening_events(user_id,occurred_at desc,id);
create index events_retention_idx on music.listening_events(created_at);
create table music.home_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 160),
  locale text not null check(length(locale) between 2 and 35),
  position integer not null check(position>=0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(locale,position)
);
create table music.home_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references music.home_collections(id) on delete cascade,
  track_id uuid references music.tracks(id) on delete restrict,
  album_id uuid references music.albums(id) on delete restrict,
  artist_id uuid references music.artists(id) on delete restrict,
  playlist_id uuid references music.playlists(id) on delete cascade,
  position integer not null check(position>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(num_nonnulls(track_id,album_id,artist_id,playlist_id)=1), unique(collection_id,position)
);
create index home_items_track_idx on music.home_collection_items(track_id);
create index home_items_album_idx on music.home_collection_items(album_id);
create index home_items_artist_idx on music.home_collection_items(artist_id);
create index home_items_playlist_idx on music.home_collection_items(playlist_id);
create table music.operation_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  scope text not null check(length(scope) between 1 and 256),
  request_key uuid not null,
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  state text not null default 'processing' check(state in ('processing','succeeded')),
  response_status integer check(response_status between 200 and 299),
  response_body jsonb,
  expires_at timestamptz not null default now()+interval '7 days',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,scope,request_key), check(expires_at>created_at),
  check((state='processing' and response_status is null and response_body is null) or (state='succeeded' and response_status is not null and response_body is not null))
);
create index receipts_expiry_idx on music.operation_receipts(expires_at);
create table music.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references music.profiles(user_id) on delete set null,
  source_id uuid references music.catalog_sources(id) on delete set null,
  kind text not null check(kind in ('catalog_import','account_delete','catalog_withdrawal')),
  dedupe_key text not null unique check(length(dedupe_key) between 1 and 256),
  status text not null default 'ready' check(status in ('ready','running','succeeded','failed')),
  payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
  attempts integer not null default 0 check(attempts>=0),
  run_after timestamptz not null default now(), locked_until timestamptz,
  last_error_code text check(length(last_error_code)<=100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index jobs_owner_idx on music.jobs(user_id);
create index jobs_source_idx on music.jobs(source_id);
create index jobs_due_idx on music.jobs(status,run_after);
create table music.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references music.profiles(user_id) on delete set null,
  action text not null check(length(action) between 1 and 100),
  subject_ref text not null check(length(subject_ref) between 1 and 256),
  detail jsonb not null default '{}' check(jsonb_typeof(detail)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index audit_owner_idx on music.audit_events(user_id,created_at desc);
create index audit_retention_idx on music.audit_events(created_at);
create table music.rate_limit_buckets (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null check(length(bucket_key) between 1 and 200),
  window_start timestamptz not null,
  requests integer not null default 1 check(requests>0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(bucket_key,window_start), check(expires_at>window_start)
);
create index rate_expiry_idx on music.rate_limit_buckets(expires_at);
create table music.playback_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references music.profiles(user_id) on delete cascade,
  session_id uuid not null,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  territory text not null check(territory ~ '^[A-Z]{2}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(session_id,user_id) references music.playback_sessions(id,user_id) on delete cascade,
  check(expires_at>created_at and expires_at<=created_at+interval '24 hours')
);
create index grants_owner_idx on music.playback_grants(user_id);
create index grants_session_idx on music.playback_grants(session_id,user_id);
create index grants_expiry_idx on music.playback_grants(expires_at);

-- Apply timestamps and fail-closed RLS to all 27 application tables.
do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname='music' loop
    execute format('alter table music.%I enable row level security',table_name);
    execute format('alter table music.%I force row level security',table_name);
    execute format('create policy admin_all on music.%I to music_admin using (true) with check (true)',table_name);
    execute format('create trigger touch_updated_at before update on music.%I for each row execute function music.touch_updated_at()',table_name);
  end loop;
end $$;
revoke all on all tables in schema music from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema music to music_admin;

create policy profile_read on music.profiles for select to music_user using(user_id=music.current_user_id());
create policy profile_insert on music.profiles for insert to music_user with check(user_id=music.current_user_id() and state='active');
create policy profile_update on music.profiles for update to music_user using(user_id=music.current_user_id()) with check(user_id=music.current_user_id());
grant select on music.profiles to music_user;
grant insert(user_id,display_name,country_code),update(display_name,country_code) on music.profiles to music_user;

do $$ declare table_name text; begin
  foreach table_name in array array['user_preferences','saved_tracks','saved_albums','saved_playlists','saved_artists','playback_sessions','queue_entries','listening_events','operation_receipts'] loop
    execute format('create policy own_rows on music.%I to music_user using(user_id=music.current_user_id()) with check(user_id=music.current_user_id())',table_name);
    execute format('grant select,insert,update,delete on music.%I to music_user',table_name);
  end loop;
  foreach table_name in array array['artists','albums','tracks'] loop
    execute format('create policy published_read on music.%I for select to music_user using(status=''published'')',table_name);
    execute format('grant select on music.%I to music_user',table_name);
  end loop;
end $$;
create policy playlists_read on music.playlists for select to music_user
  using(user_id=music.current_user_id() or (kind='editorial' and is_published));
create policy playlists_insert on music.playlists for insert to music_user
  with check(user_id=music.current_user_id() and kind='personal' and not is_published);
create policy playlists_update on music.playlists for update to music_user
  using(user_id=music.current_user_id() and kind='personal')
  with check(user_id=music.current_user_id() and kind='personal' and not is_published);
create policy playlists_delete on music.playlists for delete to music_user
  using(user_id=music.current_user_id() and kind='personal');
grant select,insert,update,delete on music.playlists to music_user;
create policy items_read on music.playlist_items for select to music_user
  using(user_id=music.current_user_id() or exists(select 1 from music.playlists p where p.id=playlist_id and p.kind='editorial' and p.is_published));
create policy items_write on music.playlist_items to music_user
  using(user_id=music.current_user_id() and exists(select 1 from music.playlists p where p.id=playlist_id and p.user_id=music.current_user_id() and p.kind='personal'))
  with check(user_id=music.current_user_id() and exists(select 1 from music.playlists p where p.id=playlist_id and p.user_id=music.current_user_id() and p.kind='personal'));
grant select,insert,update,delete on music.playlist_items to music_user;
create policy credits_read on music.track_artists for select to music_user
  using(exists(select 1 from music.tracks t where t.id=track_id) and exists(select 1 from music.artists a where a.id=artist_id));
create policy album_tracks_read on music.album_tracks for select to music_user
  using(exists(select 1 from music.albums a where a.id=album_id) and exists(select 1 from music.tracks t where t.id=track_id));
create policy home_read on music.home_collections for select to music_user using(is_published);
create policy home_items_read on music.home_collection_items for select to music_user
  using(exists(select 1 from music.home_collections c where c.id=collection_id and c.is_published));
grant select on music.track_artists,music.album_tracks,music.home_collections,music.home_collection_items to music_user;

-- Catalog predicate only: API ALSO verifies user/grant/session/explicit preferences.
-- There is deliberately no default allow for missing permission records.
create function music.can_stream(p_track_id uuid,p_territory text) returns boolean
language sql stable security invoker set search_path=pg_catalog as $$
  select exists(
    select 1 from music.tracks t
    join music.media_assets a on a.id=t.audio_asset_id and a.kind='audio' and a.status='ready'
    join music.catalog_sources asset_source on asset_source.id=a.source_id and asset_source.status='active'
    join music.track_sources ts on ts.track_id=t.id and ts.source_id=a.source_id
    join music.catalog_sources s on s.id=ts.source_id and s.status='active'
    join music.content_permissions p on p.track_source_id=ts.id
    where t.id=p_track_id and t.status='published' and p.status='active' and p.allow_stream
      and p.territory in (p_territory,'*') and p.valid_from<=now()
      and (p.valid_until is null or p.valid_until>now())
  )
$$;

-- One atomic ownership-checked edit, with stable item IDs and optimistic concurrency.
-- API claims an operation_receipt in the same transaction before calling this.
create function music.replace_playlist_items(p_playlist_id uuid,p_expected_revision bigint,p_items jsonb)
returns bigint language plpgsql security invoker set search_path=pg_catalog as $$
declare next_revision bigint; existing_items jsonb;
begin
  if p_items is null or jsonb_typeof(p_items)<>'array' then
    raise exception 'items must be an array' using errcode='22023';
  end if;
  if jsonb_array_length(p_items)>5000 then
    raise exception 'playlist item limit exceeded' using errcode='22023';
  end if;
  if not exists(select 1 from music.playlists where id=p_playlist_id and user_id=music.current_user_id() and kind='personal') then
    raise exception 'playlist not found' using errcode='P0002';
  end if;
  update music.playlists set revision=revision+1
    where id=p_playlist_id and user_id=music.current_user_id() and kind='personal' and revision=p_expected_revision
    returning revision into next_revision;
  if next_revision is null then
    raise exception 'stale playlist revision' using errcode='40001';
  end if;
  if exists(select 1 from music.playlist_items old_item
    join jsonb_array_elements(p_items) entry on old_item.id=(entry->>'id')::uuid
    where old_item.playlist_id=p_playlist_id and old_item.track_id is distinct from (entry->>'trackId')::uuid) then
    raise exception 'existing item track identity cannot change' using errcode='22023';
  end if;
  select coalesce(jsonb_object_agg(id::text,created_at),'{}'::jsonb) into existing_items
    from music.playlist_items where playlist_id=p_playlist_id;
  delete from music.playlist_items where playlist_id=p_playlist_id;
  insert into music.playlist_items(id,playlist_id,user_id,track_id,position,created_at)
    select (entry.value->>'id')::uuid,p_playlist_id,music.current_user_id(),
      (entry.value->>'trackId')::uuid,(entry.ordinality-1)::integer,
      coalesce((existing_items->>(entry.value->>'id'))::timestamptz,now())
    from jsonb_array_elements(p_items) with ordinality as entry(value,ordinality);
  return next_revision;
end $$;
revoke all on all functions in schema music from public,anon,authenticated;
grant execute on function music.current_user_id() to music_user,music_admin;
grant execute on function music.replace_playlist_items(uuid,bigint,jsonb) to music_user;
grant execute on function music.can_stream(uuid,text) to music_admin;
alter default privileges in schema music revoke all on tables from public,anon,authenticated;
alter default privileges in schema music revoke execute on functions from public;
commit;
