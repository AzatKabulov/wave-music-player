import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fail, hash } from "./common.mjs";
import { palette } from "./catalog.mjs";
import {
  artistMetadata,
  recordingMetadata,
  releaseMetadata,
  withArtworkMetadata,
} from "./catalog-shapes.mjs";

export async function catalogGraph(
  client,
  userId,
  baseUrl,
  selected,
  expand = false,
) {
  const ids = { track: [], album: [], artist: [], playlist: [], ...selected };
  const rows = (
    await client.query(
      `select distinct on (t.id) t.id,t.title,t.duration_ms,t.explicit,t.language_code,t.genres,t.content_kind,t.explicit_state,t.version_label,
    a.id artist_id,a.name artist,al.id album_id,al.title album,al.cover_asset_id,at.disc_number,at.track_number
    from music.tracks t join music.track_artists ta on ta.track_id=t.id and ta.credit_role='primary' and ta.position=0
    join music.artists a on a.id=ta.artist_id left join music.album_tracks at on at.track_id=t.id
    left join music.albums al on al.id=at.album_id where t.status='published' and
    (t.id=any($1::uuid[]) or ($2 and (at.album_id=any($3::uuid[]) or a.id=any($4::uuid[]) or
      exists(select 1 from music.playlist_items pi where pi.track_id=t.id and pi.playlist_id=any($5::uuid[])))))
    order by t.id,al.release_date desc nulls last limit 5000`,
      [ids.track, expand, ids.album, ids.artist, ids.playlist],
    )
  ).rows;
  const artwork = (id) => (id ? `${baseUrl}/v1/artwork/${id}` : undefined);
  const tracks = rows.map((row) => ({
    ...recordingMetadata(row),
    id: row.id,
    title: row.title,
    durationMs: row.duration_ms,
    explicit: row.explicit,
    language: row.language_code || "und",
    genre: row.genres[0] || "Music",
    artistId: row.artist_id,
    artist: row.artist,
    albumId: row.album_id,
    album: row.album,
    palette: palette(row.artist_id),
    available: true,
    artworkUrl: artwork(row.cover_asset_id),
  }));
  const artistIds = [
    ...new Set([...ids.artist, ...rows.map((row) => row.artist_id)]),
  ];
  const albumIds = [
    ...new Set([
      ...ids.album,
      ...rows.map((row) => row.album_id).filter(Boolean),
    ]),
  ];
  const artists = (
    await client.query(
      "select id,name,bio,aliases,bio_source,image_asset_id from music.artists where id=any($1::uuid[]) and status='published'",
      [artistIds],
    )
  ).rows.map((row) => ({
    ...row,
    ...artistMetadata(row, baseUrl),
    bio: row.bio || "",
    palette: palette(row.id),
  }));
  const albums = (
    await client.query(
      `select al.id,al.title,al.cover_asset_id,al.release_type,al.release_date,al.edition,al.expected_track_count,al.completeness,extract(year from al.release_date)::int as year,
    credit.artist_id,credit.artist from music.albums al left join lateral (
      select a.id artist_id,a.name artist from music.album_tracks at join music.track_artists ta on ta.track_id=at.track_id and ta.credit_role='primary' and ta.position=0
      join music.artists a on a.id=ta.artist_id where at.album_id=al.id order by at.disc_number,at.track_number limit 1
    ) credit on true where al.id=any($1::uuid[]) and al.status='published'`,
      [albumIds],
    )
  ).rows.map((row) => ({
    ...releaseMetadata(row),
    id: row.id,
    title: row.title,
    year: row.year,
    artistId: row.artist_id,
    artist: row.artist || "Various artists",
    palette: palette(row.artist_id || row.id),
    artworkUrl: artwork(row.cover_asset_id),
    trackIds: rows
      .filter((track) => track.album_id === row.id)
      .sort(
        (a, b) =>
          a.disc_number - b.disc_number || a.track_number - b.track_number,
      )
      .map((track) => track.id),
  }));
  const playlists = (
    await client.query(
      `select p.id,p.title,p.description,p.user_id,p.revision,coalesce(p.cover_asset_id,
    (select al.cover_asset_id from music.playlist_items pi join music.album_tracks at on at.track_id=pi.track_id
     join music.albums al on al.id=at.album_id where pi.playlist_id=p.id order by pi.position limit 1)) cover_asset_id
    from music.playlists p where p.id=any($1::uuid[])`,
      [ids.playlist],
    )
  ).rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    owner: row.user_id === userId,
    revision: String(row.revision),
    palette: palette(row.id),
    artworkUrl: artwork(row.cover_asset_id),
    items: [],
  }));
  if (expand && playlists.length) {
    const items = (
      await client.query(
        `select p.id playlist_id,i.id,i.track_id as "trackId" from music.playlists p cross join lateral (
      select id,track_id,position from music.playlist_items where playlist_id=p.id order by position limit 5000
      ) i where p.id=any($1::uuid[]) order by p.id,i.position`,
        [ids.playlist],
      )
    ).rows;
    const byId = new Map(playlists.map((playlist) => [playlist.id, playlist]));
    for (const { playlist_id, ...item } of items)
      byId.get(playlist_id).items.push(item);
  }
  return withArtworkMetadata(client, { tracks, artists, albums, playlists });
}

export function createCatalogSearch(
  db,
  baseUrl,
  { hideFixtures = false } = {},
) {
  const trackFilter = hideFixtures ? " and t.content_kind='recording'" : "";
  const albumFilter = hideFixtures
    ? " and exists(select 1 from music.album_tracks member join music.tracks recording on recording.id=member.track_id where member.album_id=music.albums.id and recording.status='published' and recording.content_kind='recording')"
    : "";
  const artistFilter = hideFixtures
    ? " and exists(select 1 from music.track_artists credit join music.tracks recording on recording.id=credit.track_id where credit.artist_id=music.artists.id and recording.status='published' and recording.content_kind='recording')"
    : "";
  const playlistFilter = hideFixtures
    ? " where kind='personal' or exists(select 1 from music.playlist_items member join music.tracks recording on recording.id=member.track_id where member.playlist_id=music.playlists.id and recording.status='published' and recording.content_kind='recording')"
    : "";
  const secret = randomBytes(32);
  const sign = (text) =>
    createHmac("sha256", secret).update(text).digest("base64url");
  const encode = (value) => {
    const body = Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${body}.${sign(body)}`;
  };
  const decode = (cursor, scope) => {
    try {
      const [body, signature, extra] = cursor.split(".");
      if (extra || !body || !signature) throw Error();
      const expected = Buffer.from(sign(body));
      const actual = Buffer.from(signature);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw Error();
      const value = JSON.parse(Buffer.from(body, "base64url").toString());
      if (
        value.scope !== scope ||
        value.expires < Date.now() ||
        !Array.isArray(value.after) ||
        value.after.length !== 4
      )
        throw Error();
      return value.after;
    } catch {
      fail(
        422,
        "invalid_cursor",
        "This search page expired or does not match the current search. Start again.",
      );
    }
  };
  return async (owner, query) => {
    const needle = query.q.trim().normalize("NFKC").toLocaleLowerCase();
    const type = query.type || "all";
    const scope = hash(
      JSON.stringify([owner, needle, type, query.locale || "", hideFixtures]),
    );
    const after = query.cursor ? decode(query.cursor, scope) : null;
    return db.user(owner, async (client) => {
      const hits = (
        await client.query(
          `with candidates as (
        select 'track'::text kind,t.id,t.title,t.search_text || ' ' || a.name haystack from music.tracks t
          join music.track_artists ta on ta.track_id=t.id and ta.credit_role='primary' and ta.position=0
          join music.artists a on a.id=ta.artist_id where t.status='published'${trackFilter}
        union all select 'album',id,title,search_text from music.albums where status='published'${albumFilter}
        union all select 'artist',id,name,search_text from music.artists where status='published'${artistFilter}
        union all select 'playlist',id,title,title || ' ' || description from music.playlists${playlistFilter}
      ), matched as (
        select kind,id,lower(normalize(title,NFKC)) title_key,
          case when lower(normalize(title,NFKC))=$1 then 0 when position($1 in lower(normalize(title,NFKC)))=1 then 1 else 2 end rank
        from candidates where ($2='all' or kind=$2) and position($1 in lower(normalize(haystack,NFKC)))>0
      ) select * from matched where ($3::int is null or (rank,kind,title_key,id::text)>($3::int,$4,$5,$6))
        order by rank,kind,title_key,id limit $7`,
          [
            needle,
            type,
            ...(after || [null, null, null, null]),
            query.limit + 1,
          ],
        )
      ).rows;
      const more = hits.length > query.limit;
      const page = hits.slice(0, query.limit);
      const selection = { track: [], album: [], artist: [], playlist: [] };
      for (const hit of page) selection[hit.kind].push(hit.id);
      const graph = await catalogGraph(client, owner, baseUrl, selection);
      const lookup = {
        track: new Map(graph.tracks.map((item) => [item.id, item])),
        album: new Map(graph.albums.map((item) => [item.id, item])),
        artist: new Map(graph.artists.map((item) => [item.id, item])),
        playlist: new Map(graph.playlists.map((item) => [item.id, item])),
      };
      const last = page.at(-1);
      return {
        data: page
          .map((hit) => ({
            kind: hit.kind,
            item: lookup[hit.kind].get(hit.id),
          }))
          .filter((hit) => hit.item),
        catalog: graph,
        nextCursor: more
          ? encode({
              scope,
              expires: Date.now() + 15 * 60 * 1000,
              after: [last.rank, last.kind, last.title_key, last.id],
            })
          : null,
        truncated: more,
      };
    });
  };
}
