-- Disposable local database ONLY. Provider users/roles are fixtures in the runner.
-- Transaction rolls all test records back. Run after schema.sql.
begin;
create temp table test_results(test_name text primary key);
create function pg_temp.assert_true(p_ok boolean, p_name text) returns void
language plpgsql as $$ begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_name; end if;
  insert into pg_temp.test_results values (p_name);
end $$;
grant select, insert on pg_temp.test_results to music_user, authenticated;
select pg_temp.assert_true((select count(*)=27 and bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='music' and c.relkind='r'), 'all application tables enforce row policies');
select pg_temp.assert_true(not exists(
  select 1 from pg_constraint fk join pg_class t on t.oid=fk.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='music' and fk.contype='f' and not exists(
    select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid
      and fk.conkey <@ (i.indkey::smallint[])[0:cardinality(fk.conkey)-1]
  )
), 'foreign key lookup columns have covering index prefixes');

insert into auth.users(id) values
('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
insert into music.profiles(user_id, display_name) values
('10000000-0000-0000-0000-000000000001','Listener A'),
('10000000-0000-0000-0000-000000000002','Listener B');
insert into music.catalog_sources(id,name,kind) values
('20000000-0000-0000-0000-000000000001','Supplied test repertoire','direct');
insert into music.media_assets(id,source_id,kind,storage_key,mime_type,byte_size,status) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','audio','test/track.mp3','audio/mpeg',1000,'ready');
insert into music.tracks(id,title,search_text,duration_ms,audio_asset_id,status,language_code) values
('40000000-0000-0000-0000-000000000001','Ýürek — Песня','Ýürek Песня',180000,'30000000-0000-0000-0000-000000000001','published','tk'),
('40000000-0000-0000-0000-000000000002','International test','International test',200000,'30000000-0000-0000-0000-000000000001','published','en');
insert into music.track_sources(id,track_id,source_id,external_id) values
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','supplied-1');
insert into music.content_permissions(track_source_id,territory,valid_from,valid_until,evidence_ref,status) values
('50000000-0000-0000-0000-000000000001','TM',now()-interval '1 day',now()+interval '1 day','test-only permission evidence','active');
insert into music.playlists(id,user_id,title) values
('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','A playlist'),
('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','B private playlist');
insert into music.playback_sessions(id,user_id,installation_id) values
('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002');
insert into music.queue_entries(id,session_id,user_id,track_id,position,origin) values
('80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',0,'context'),
('80000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',0,'context');

select pg_temp.assert_true(music.can_stream('40000000-0000-0000-0000-000000000001','TM'), 'active territory permission allows catalog playback');
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000001','US'), 'permission does not spill into other territories');
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000002','TM'), 'missing permission defaults to no playback');
update music.catalog_sources set status='paused';
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000001','TM'), 'paused supplier blocks fresh playback');
update music.catalog_sources set status='active';
update music.content_permissions set status='revoked';
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000001','TM'), 'revoked permission blocks fresh playback');
update music.content_permissions set status='active', valid_until=now()-interval '1 hour',valid_from=now()-interval '2 days';
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000001','TM'), 'expired permission blocks fresh playback');
update music.content_permissions set valid_until=now()+interval '1 day';
update music.tracks set status='withdrawn' where id='40000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(not music.can_stream('40000000-0000-0000-0000-000000000001','TM'), 'withdrawn track blocks playback despite permission');
update music.tracks set status='published';
select pg_temp.assert_true((select title='Ýürek — Песня' from music.tracks where id='40000000-0000-0000-0000-000000000001'), 'Turkmen and Cyrillic display text preserved');

set local role music_user;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001"}',true);
select pg_temp.assert_true((select count(*)=1 from music.playlists), 'listener sees only own private playlists');
do $$ begin
  begin update music.profiles set state='deleting'; raise exception 'protected profile state writable';
  exception when insufficient_privilege then perform pg_temp.assert_true(true,'listener cannot change protected account state'); end;
end $$;
do $$ declare affected integer; begin
  update music.playlists set title='tampered' where id='60000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  perform pg_temp.assert_true(affected=0, 'listener cannot update another user playlist');
end $$;
do $$ begin
  begin
    insert into music.playlist_items(playlist_id,user_id,track_id,position)
    values('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',0);
    raise exception 'ownership FK unexpectedly allowed insert';
  exception when foreign_key_violation or insufficient_privilege then
    perform pg_temp.assert_true(true,'playlist item ownership cannot cross users');
  end;
end $$;
do $$ begin
  begin perform 1 from music.catalog_sources; raise exception 'private sources exposed';
  exception when insufficient_privilege then perform pg_temp.assert_true(true,'catalog supply records inaccessible to listener role'); end;
  begin perform 1 from music.media_assets; raise exception 'storage keys exposed';
  exception when insufficient_privilege then perform pg_temp.assert_true(true,'raw storage keys inaccessible to listener role'); end;
end $$;

select music.replace_playlist_items('60000000-0000-0000-0000-000000000001',0,
'[{"id":"90000000-0000-0000-0000-000000000001","trackId":"40000000-0000-0000-0000-000000000001"},{"id":"90000000-0000-0000-0000-000000000002","trackId":"40000000-0000-0000-0000-000000000001"}]');
select pg_temp.assert_true((select count(*)=2 from music.playlist_items), 'intentional duplicate tracks have distinct playlist item identities');
select pg_temp.assert_true((select revision=1 from music.playlists where id='60000000-0000-0000-0000-000000000001'), 'playlist replacement advances revision');
update music.playlist_items set created_at=now()-interval '1 day';
select music.replace_playlist_items('60000000-0000-0000-0000-000000000001',1,
'[{"id":"90000000-0000-0000-0000-000000000002","trackId":"40000000-0000-0000-0000-000000000001"},{"id":"90000000-0000-0000-0000-000000000001","trackId":"40000000-0000-0000-0000-000000000001"}]');
select pg_temp.assert_true((select position=0 and created_at=now()-interval '1 day' from music.playlist_items where id='90000000-0000-0000-0000-000000000002'), 'playlist reorder preserves identity and original addition time');
do $$ begin
  begin
    perform music.replace_playlist_items('60000000-0000-0000-0000-000000000001',2,'[{"id":"90000000-0000-0000-0000-000000000002","trackId":"40000000-0000-0000-0000-000000000002"}]');
    raise exception 'entry identity reassigned to different track';
  exception when invalid_parameter_value then perform pg_temp.assert_true(true,'existing playlist entry cannot silently change track identity'); end;
end $$;
do $$ begin
  begin perform music.replace_playlist_items('60000000-0000-0000-0000-000000000001',0,'[]'); raise exception 'stale update accepted';
  exception when serialization_failure then perform pg_temp.assert_true(true,'stale playlist revision rejected'); end;
end $$;
do $$ begin
  begin
    perform music.replace_playlist_items('60000000-0000-0000-0000-000000000001',2,'[{"id":"90000000-0000-0000-0000-000000000003","trackId":"ffffffff-ffff-ffff-ffff-ffffffffffff"}]');
    raise exception 'invalid track accepted';
  exception when foreign_key_violation then
    perform pg_temp.assert_true((select count(*)=2 from music.playlist_items),'failed replacement preserves previous playlist');
    perform pg_temp.assert_true((select revision=2 from music.playlists where id='60000000-0000-0000-0000-000000000001'),'failed replacement does not consume revision');
  end;
end $$;
do $$ begin
  begin
    update music.playback_sessions set current_queue_entry_id='80000000-0000-0000-0000-000000000002' where id='70000000-0000-0000-0000-000000000001';
    set constraints all immediate;
    raise exception 'foreign current entry accepted';
  exception when foreign_key_violation then perform pg_temp.assert_true(true,'current queue entry must belong to same session and owner'); end;
end $$;
insert into music.operation_receipts(user_id,scope,request_key,request_hash) values
('10000000-0000-0000-0000-000000000001','playlist:create','a0000000-0000-0000-0000-000000000001',repeat('a',64));
do $$ begin
  begin
    insert into music.operation_receipts(user_id,scope,request_key,request_hash) values
    ('10000000-0000-0000-0000-000000000001','playlist:create','a0000000-0000-0000-0000-000000000001',repeat('a',64));
    raise exception 'duplicate operation key accepted';
  exception when unique_violation then perform pg_temp.assert_true(true,'idempotency intent has database uniqueness'); end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform 1 from music.tracks; raise exception 'Data API role can reach private schema';
  exception when insufficient_privilege then perform pg_temp.assert_true(true,'native publishable-key role cannot bypass application API'); end;
end $$;
reset role;
delete from auth.users where id='10000000-0000-0000-0000-000000000001';
set constraints all immediate;
select pg_temp.assert_true(not exists(select 1 from music.playlists where user_id='10000000-0000-0000-0000-000000000001') and not exists(select 1 from music.queue_entries where user_id='10000000-0000-0000-0000-000000000001'), 'account removal cascades owned playlists and playback state');
select test_name from pg_temp.test_results order by test_name;
rollback;
