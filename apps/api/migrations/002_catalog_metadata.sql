-- Additive metadata only. Unknown is deliberate; do not infer complete albums,
-- clean recordings or available renditions from an old boolean/container label.
alter table music.artists
  add column aliases text[] not null default '{}',
  add column bio_source text,
  add column hero_asset_id uuid references music.media_assets(id) on delete set null;
alter table music.albums
  add column release_type text not null default 'unknown' check(release_type in ('album','ep','single','compilation','unknown')),
  add column edition text,
  add column external_refs jsonb not null default '{}' check(jsonb_typeof(external_refs)='object'),
  add column expected_track_count integer check(expected_track_count between 1 and 5000),
  add column completeness text not null default 'unknown' check(completeness in ('unknown','partial','complete'));
alter table music.tracks
  add column aliases text[] not null default '{}',
  add column version_label text,
  add column explicit_state text not null default 'unknown' check(explicit_state in ('unknown','clean','explicit')),
  add column content_kind text not null default 'recording' check(content_kind in ('recording','fixture'));
update music.tracks set explicit_state='explicit' where explicit;
update music.tracks t set content_kind='fixture' from music.media_assets a
  where t.audio_asset_id=a.id and a.source_id='10000000-0000-4000-8000-000000000998';
alter table music.media_assets
  add column metadata_source text,
  add column container text,
  add column codec text,
  add column sample_rate integer check(sample_rate between 8000 and 384000),
  add column channels integer check(channels between 1 and 32),
  add column measured_duration_ms integer check(measured_duration_ms > 0),
  add column validation_state text not null default 'unverified' check(validation_state in ('unverified','validated','failed')),
  add column width integer check(width between 1 and 32768),
  add column height integer check(height between 1 and 32768),
  add column dominant_color text check(dominant_color ~ '^#[a-fA-F0-9]{6}$'),
  add column palette_version integer not null default 0 check(palette_version >= 0);
create index artists_hero_idx on music.artists(hero_asset_id);
create index artists_aliases_idx on music.artists using gin(aliases);
create index tracks_aliases_idx on music.tracks using gin(aliases);
