const palettes = ["clay", "sea", "night", "sand", "berry", "forest"];
export const palette = (id) =>
  palettes[parseInt(id.slice(-4), 16) % palettes.length];
export async function catalog(client, userId, baseUrl = "") {
  const artists = (
    await client.query(
      "select id,name,bio from music.artists where status='published' order by created_at,id limit 100",
    )
  ).rows.map((x) => ({ ...x, palette: palette(x.id) }));
  const rows = (
    await client.query(`select t.id,t.title,t.duration_ms,t.explicit,t.language_code,t.genres,a.id artist_id,a.name artist,
  al.id album_id,al.title album,al.cover_asset_id,at.disc_number,at.track_number from music.tracks t join music.track_artists ta on ta.track_id=t.id and ta.credit_role='primary' and ta.position=0
  join music.artists a on a.id=ta.artist_id left join music.album_tracks at on at.track_id=t.id left join music.albums al on al.id=at.album_id
  where t.status='published' order by t.created_at,t.id limit 100`)
  ).rows;
  const tracks = rows.map((x) => ({
    id: x.id,
    title: x.title,
    durationMs: x.duration_ms,
    explicit: x.explicit,
    language: x.language_code || "und",
    genre: x.genres[0] || "Music",
    artistId: x.artist_id,
    artist: x.artist,
    albumId: x.album_id,
    album: x.album,
    palette: palette(x.artist_id),
    available: true,
    artworkUrl: x.cover_asset_id
      ? `${baseUrl}/v1/artwork/${x.cover_asset_id}`
      : undefined,
  }));
  const albums = (
    await client.query(
      "select id,title,cover_asset_id,extract(year from release_date)::int as year from music.albums where status='published' order by created_at,id limit 100",
    )
  ).rows.map((a) => {
    const ts = tracks.filter((t) => t.albumId === a.id);
    return {
      ...a,
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
  const lists = (
    await client.query(
      "select id,title,description,user_id,revision from music.playlists order by updated_at desc,id limit 100",
    )
  ).rows;
  const playlists = [];
  for (const p of lists) {
    const items = (
      await client.query(
        'select id,track_id as "trackId" from music.playlist_items where playlist_id=$1 order by position limit 5000',
        [p.id],
      )
    ).rows;
    playlists.push({
      id: p.id,
      title: p.title,
      description: p.description,
      owner: p.user_id === userId,
      revision: String(p.revision),
      palette:
        tracks.find((t) => t.id === items[0]?.trackId)?.palette ||
        palette(p.id),
      items,
      artworkUrl: tracks.find((t) => t.id === items[0]?.trackId)?.artworkUrl,
    });
  }
  return { artists, albums, tracks, playlists };
}
export async function snapshot(db, identity, baseUrl = "") {
  if (!identity)
    return {
      profile: null,
      catalog: { tracks: [], artists: [], albums: [], playlists: [] },
      library: { tracks: [], albums: [], artists: [], playlists: [] },
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
    const cat = await catalog(c, identity.id, baseUrl),
      prefs = (
        await c.query(
          'select explicit_allowed as "explicitAllowed",locale,library_sort as "librarySort" from music.user_preferences where user_id=$1',
          [identity.id],
        )
      ).rows[0];
    const library = {};
    for (const [kind, column] of [
      ["tracks", "track_id"],
      ["albums", "album_id"],
      ["artists", "artist_id"],
      ["playlists", "playlist_id"],
    ])
      library[kind] = (
        await c.query(
          `select ${column} as id from music.saved_${kind} where user_id=$1 order by created_at desc`,
          [identity.id],
        )
      ).rows.map((x) => x.id);
    const recents = (
      await c.query(
        "select track_id as id,max(occurred_at) as last from music.listening_events where user_id=$1 group by track_id order by last desc limit 100",
        [identity.id],
      )
    ).rows.map((x) => x.id);
    return {
      profile: {
        id: p.id,
        displayName: p.displayName,
        ...(identity.email ? { email: identity.email } : {}),
      },
      catalog: { ...cat, playlists: cat.playlists.filter((p) => !p.owner) },
      playlists: cat.playlists.filter((p) => p.owner),
      library,
      preferences: prefs || {
        explicitAllowed: true,
        locale: "en",
        librarySort: "recent",
      },
      recents,
    };
  });
}
