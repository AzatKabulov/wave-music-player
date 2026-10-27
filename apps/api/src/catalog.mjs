import {
  artistMetadata,
  recordingMetadata,
  releaseMetadata,
  withArtworkMetadata,
} from "./catalog-shapes.mjs";
const palettes = ["clay", "sea", "night", "sand", "berry", "forest"];
export const palette = (id) =>
  palettes[parseInt(id.slice(-4), 16) % palettes.length];
export async function catalog(
  client,
  userId,
  baseUrl = "",
  references = {},
  { hideFixtures = false, playlistSummaries = false } = {},
) {
  const recordingFilter = hideFixtures ? " and content_kind='recording'" : "";
  const artistFilter = hideFixtures
    ? " and exists(select 1 from music.track_artists credit join music.tracks recording on recording.id=credit.track_id where credit.artist_id=music.artists.id and recording.status='published' and recording.content_kind='recording')"
    : "";
  const albumFilter = hideFixtures
    ? " and exists(select 1 from music.album_tracks member join music.tracks recording on recording.id=member.track_id where member.album_id=music.albums.id and recording.status='published' and recording.content_kind='recording')"
    : "";
  const playlistFilter = hideFixtures
    ? "p.kind='personal' or exists(select 1 from music.playlist_items member join music.tracks recording on recording.id=member.track_id where member.playlist_id=p.id and recording.status='published' and recording.content_kind='recording')"
    : "true";
  const collectionTracks = playlistSummaries
    ? ""
    : `or exists(select 1 from music.playlist_items pi join music.playlists p on p.id=pi.playlist_id
      where pi.track_id=t.id and (p.user_id=$1 or exists(select 1 from music.saved_playlists sp where sp.playlist_id=p.id and sp.user_id=$1)))`;
  const rows = (
    await client.query(
      `with initial as (
    select id from music.tracks where status='published'${recordingFilter} order by created_at,id limit 100
  ) select distinct on (t.id) t.id,t.title,t.duration_ms,t.explicit,t.language_code,t.genres,t.content_kind,t.explicit_state,t.version_label,a.id artist_id,a.name artist,
  al.id album_id,al.title album,al.cover_asset_id,at.disc_number,at.track_number from music.tracks t join music.track_artists ta on ta.track_id=t.id and ta.credit_role='primary' and ta.position=0
  join music.artists a on a.id=ta.artist_id left join music.album_tracks at on at.track_id=t.id left join music.albums al on al.id=at.album_id
  where t.status='published' and (
    t.id in (select id from initial) or t.id=any($2::uuid[])
    or exists(select 1 from music.queue_entries qe where qe.track_id=t.id and qe.user_id=$1)
    ${collectionTracks}
  ) order by t.id,al.release_date desc nulls last`,
      [userId, references.tracks || []],
    )
  ).rows;
  const tracks = rows.map((x) => ({
    ...recordingMetadata(x),
    id: x.id,
    title: x.title,
    durationMs: x.duration_ms,
    explicit: x.explicit,
    language: x.language_code || "und",
    genre: x.genres[0] || "Music",
    artistId: x.artist_id,
    artist: x.artist,
    albumId: x.album_id || "",
    album: x.album || "",
    palette: palette(x.artist_id),
    available: true,
    artworkUrl: x.cover_asset_id
      ? `${baseUrl}/v1/artwork/${x.cover_asset_id}`
      : undefined,
  }));
  const artists = (
    await client.query(
      `select id,name,bio,aliases,bio_source,image_asset_id from music.artists where status='published' and (
    id in (select id from music.artists where status='published'${artistFilter} order by created_at,id limit 100)
    or id=any($1::uuid[])) order by created_at,id`,
      [
        [
          ...new Set([
            ...(references.artists || []),
            ...rows.map((row) => row.artist_id),
          ]),
        ],
      ],
    )
  ).rows.map((row) => ({
    ...row,
    ...artistMetadata(row, baseUrl),
    bio: row.bio || "",
    palette: palette(row.id),
  }));
  const albums = (
    await client.query(
      `select id,title,cover_asset_id,release_type,release_date,edition,expected_track_count,completeness,extract(year from release_date)::int as year from music.albums where status='published' and (
        id in (select id from music.albums where status='published'${albumFilter} order by created_at,id limit 100)
        or id=any($1::uuid[])) order by created_at,id`,
      [
        [
          ...new Set([
            ...(references.albums || []),
            ...rows.map((row) => row.album_id).filter(Boolean),
          ]),
        ],
      ],
    )
  ).rows.map((a) => {
    const ts = tracks.filter((t) => t.albumId === a.id);
    return {
      ...a,
      ...releaseMetadata(a),
      artist: ts[0]?.artist || "Various artists",
      artistId: ts[0]?.artistId,
      palette: ts[0]?.palette || palette(a.id),
      trackIds: rows
        .filter((t) => t.album_id === a.id)
        .sort(
          (a, b) =>
            a.disc_number - b.disc_number || a.track_number - b.track_number,
        )
        .map((t) => t.id),
      artworkUrl: a.cover_asset_id
        ? `${baseUrl}/v1/artwork/${a.cover_asset_id}`
        : undefined,
    };
  });
  const summaryFields = playlistSummaries
    ? `,
    (select count(*) from music.playlist_items member where member.playlist_id=p.id) track_count,
    exists(select 1 from music.playlist_items member join music.tracks recording on recording.id=member.track_id
      where member.playlist_id=p.id and recording.status='published' and recording.content_kind='recording') has_recordings,
    coalesce(p.cover_asset_id,(select album.cover_asset_id from music.playlist_items member
      join music.album_tracks entry on entry.track_id=member.track_id join music.albums album on album.id=entry.album_id
      where member.playlist_id=p.id and album.status='published' order by member.position,album.release_date desc nulls last limit 1)) cover_asset_id`
    : "";
  const lists = (
    await client.query(
      `select p.id,p.title,p.description,p.user_id,p.revision ${summaryFields} from music.playlists p where
        p.id in (select p.id from music.playlists p where ${playlistFilter} order by p.updated_at desc,p.id limit 100)
        or p.user_id=$1 or p.id=any($2::uuid[]) order by p.updated_at desc,p.id`,
      [userId, references.playlists || []],
    )
  ).rows;
  const groupedItems = new Map(lists.map((list) => [list.id, []]));
  if (lists.length && !playlistSummaries) {
    // Preserve the per-playlist bound and row-level access rules, while making
    // one database round trip for all visible playlist items.
    const { rows: items } = await client.query(
      `select p.id as playlist_id, i.id, i.track_id as "trackId"
       from music.playlists p cross join lateral (
         select id, track_id, position from music.playlist_items
         where playlist_id = p.id order by position limit 5000
       ) i where p.id = any($1::uuid[]) order by p.id, i.position`,
      [lists.map((list) => list.id)],
    );
    for (const { playlist_id, ...item } of items)
      groupedItems.get(playlist_id).push(item);
  }
  const playlists = lists.map((p) => {
    const items = groupedItems.get(p.id);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      owner: p.user_id === userId,
      revision: String(p.revision),
      palette:
        tracks.find((t) => t.id === items[0]?.trackId)?.palette ||
        palette(p.id),
      items,
      itemsComplete: !playlistSummaries,
      trackCount: playlistSummaries ? Number(p.track_count) : items.length,
      ...(playlistSummaries ? { hasRecordings: p.has_recordings } : {}),
      artworkUrl: playlistSummaries
        ? p.cover_asset_id
          ? `${baseUrl}/v1/artwork/${p.cover_asset_id}`
          : undefined
        : tracks.find((t) => t.id === items[0]?.trackId)?.artworkUrl,
    };
  });
  return withArtworkMetadata(client, { artists, albums, tracks, playlists });
}
export async function snapshot(db, identity, baseUrl = "", options = {}) {
  if (!identity)
    return {
      profile: null,
      catalog: { tracks: [], artists: [], albums: [], playlists: [] },
      library: { tracks: [], albums: [], artists: [], playlists: [] },
      libraryEntries: [],
      preferences: {
        explicitAllowed: true,
        locale: "en",
        librarySort: "recent",
      },
      recents: [],
      playlists: [],
    };
  return db.user(identity.id, async (c) => {
    const p = (
      await c.query(
        'select user_id as id,display_name as "displayName",state from music.profiles where user_id=$1',
        [identity.id],
      )
    ).rows[0];
    if (!p || p.state !== "active") return { profile: null };
    const prefs = (
      await c.query(
        'select explicit_allowed as "explicitAllowed",locale,library_sort as "librarySort" from music.user_preferences where user_id=$1',
        [identity.id],
      )
    ).rows[0];
    const library = {};
    const libraryEntries = [];
    for (const [kind, column] of [
      ["tracks", "track_id"],
      ["albums", "album_id"],
      ["artists", "artist_id"],
      ["playlists", "playlist_id"],
    ]) {
      const saved = (
        await c.query(
          `select ${column} as id,created_at from music.saved_${kind} where user_id=$1 order by created_at desc,${column}`,
          [identity.id],
        )
      ).rows;
      library[kind] = saved.map((x) => x.id);
      libraryEntries.push(
        ...saved.map((x) => ({
          kind,
          id: x.id,
          addedAt: new Date(x.created_at).toISOString(),
        })),
      );
    }
    const owned = (
      await c.query(
        `select p.id,p.created_at from music.playlists p where p.user_id=$1
       and not exists(select 1 from music.saved_playlists saved where saved.user_id=$1 and saved.playlist_id=p.id)
       order by p.created_at desc,p.id`,
        [identity.id],
      )
    ).rows;
    libraryEntries.push(
      ...owned.map((x) => ({
        kind: "playlists",
        id: x.id,
        addedAt: new Date(x.created_at).toISOString(),
      })),
    );
    const recents = (
      await c.query(
        "select track_id as id,max(occurred_at) as last from music.listening_events where user_id=$1 group by track_id order by last desc limit 100",
        [identity.id],
      )
    ).rows.map((x) => x.id);
    const cat = await catalog(
      c,
      identity.id,
      baseUrl,
      {
        ...library,
        tracks: [...new Set([...library.tracks, ...recents])],
      },
      options,
    );
    return {
      profile: {
        id: p.id,
        displayName: p.displayName,
        ...(identity.email ? { email: identity.email } : {}),
      },
      catalog: { ...cat, playlists: cat.playlists.filter((p) => !p.owner) },
      playlists: cat.playlists.filter((p) => p.owner),
      library,
      libraryEntries,
      preferences: prefs || {
        explicitAllowed: true,
        locale: "en",
        librarySort: "recent",
      },
      recents,
    };
  });
}
