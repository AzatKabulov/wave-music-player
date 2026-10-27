-- Optional queue context; legacy clients keep their existing session contract.
alter table music.playback_sessions add column source jsonb;
alter table music.playback_sessions add constraint playback_source_object
  check(source is null or (jsonb_typeof(source)='object' and char_length(source::text)<=1024));
