-- Readable presentation metadata excludes storage paths, audio and unlinked images.
grant select(id,sha256,dominant_color,width,height,palette_version) on music.media_assets to music_user;
create policy published_image_metadata on music.media_assets for select to music_user using (
  kind='image' and status='ready' and (
    exists(select 1 from music.albums al where al.cover_asset_id=media_assets.id and al.status='published')
    or exists(select 1 from music.artists ar where ar.image_asset_id=media_assets.id and ar.status='published')
  )
);
