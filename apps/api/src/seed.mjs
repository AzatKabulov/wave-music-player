import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
export const audioRoot = new URL("../../../public/audio/", import.meta.url);
export async function seedLocal(db) {
  const c = JSON.parse(
    await readFile(
      new URL("../../../src/data/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const owner = "10000000-0000-4000-8000-000000000999",
    source = "10000000-0000-4000-8000-000000000998";
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into music.profiles(user_id,display_name) values($1,'Owaryn Studio')",
    [owner],
  );
  await db.query(
    "insert into music.catalog_sources(id,name,kind) values($1,'Original fixture recordings','test')",
    [source],
  );
  for (const artist of c.artists)
    await db.query(
      "insert into music.artists(id,name,search_text,bio,status) values($1,$2,$2,$3,'published')",
      [artist.id, artist.name, artist.bio],
    );
  for (const album of c.albums)
    await db.query(
      "insert into music.albums(id,title,search_text,release_date,status) values($1,$2,$3,'2026-01-01','published')",
      [album.id, album.title, `${album.title} ${album.artist}`],
    );
  for (const track of c.tracks) {
    const bytes = await readFile(new URL(`${track.id}.wav`, audioRoot));
    const asset = (
      await db.query(
        "insert into music.media_assets(source_id,kind,storage_key,mime_type,byte_size,sha256,status) values($1,'audio',$2,'audio/wav',$3,$4,'ready') returning id",
        [
          source,
          `${track.id}.wav`,
          bytes.length,
          createHash("sha256").update(bytes).digest("hex"),
        ],
      )
    ).rows[0].id;
    await db.query(
      "insert into music.tracks(id,title,search_text,duration_ms,explicit,language_code,genres,audio_asset_id,status) values($1,$2,$3,$4,$5,$6,$7,$8,'published')",
      [
        track.id,
        track.title,
        `${track.title} ${track.artist} ${track.album}`,
        track.durationMs,
        track.explicit,
        track.language,
        [track.genre],
        asset,
      ],
    );
    await db.query(
      "insert into music.track_artists(track_id,artist_id) values($1,$2)",
      [track.id, track.artistId],
    );
    await db.query(
      "insert into music.album_tracks(album_id,track_id,track_number) values($1,$2,$3)",
      [
        track.albumId,
        track.id,
        c.albums
          .find((a) => a.id === track.albumId)
          .trackIds.indexOf(track.id) + 1,
      ],
    );
    const map = (
      await db.query(
        "insert into music.track_sources(track_id,source_id,external_id) values($1,$2,$3) returning id",
        [track.id, source, track.id],
      )
    ).rows[0].id;
    await db.query(
      "insert into music.content_permissions(track_source_id,territory,valid_from,evidence_ref,status) values($1,'*',now(),'scripts/generate-fixtures.py original composition','active')",
      [map],
    );
  }
  for (const playlist of c.playlists) {
    await db.query(
      "insert into music.playlists(id,user_id,title,description,kind,is_published) values($1,$2,$3,$4,'editorial',true)",
      [playlist.id, owner, playlist.title, playlist.description],
    );
    for (const [position, item] of playlist.items.entries())
      await db.query(
        "insert into music.playlist_items(id,playlist_id,user_id,track_id,position) values($1,$2,$3,$4,$5)",
        [item.id, playlist.id, owner, item.trackId, position],
      );
  }
}
