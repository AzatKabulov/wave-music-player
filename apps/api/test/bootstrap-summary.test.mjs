import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("opt-in bootstrap summaries preserve counts, detail access and legacy clients below the scenario byte budget", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  const auth = async () =>
    (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        headers: { "x-saz-platform": "native" },
        payload: {},
      })
    ).json();
  try {
    const account = await auth(),
      headers = { authorization: `Bearer ${account.accessToken}` };
    const initial = (
      await app.inject({ method: "GET", url: "/v1/snapshot", headers })
    ).json();
    const owner = initial.profile.id;
    let lists;
    await db.admin(async (c) => {
      const artists = (
        await c.query(
          "insert into music.artists(name,search_text,status) select 'Scale artist '||i,'Scale artist '||i,'published' from generate_series(1,500)i returning id",
        )
      ).rows.map((x) => x.id);
      await c.query(
        "insert into music.saved_artists(user_id,artist_id) select $1,unnest($2::uuid[])",
        [owner, artists],
      );
      lists = (
        await c.query(
          "insert into music.playlists(user_id,title) select $1,'Scale collection '||i from generate_series(1,150)i returning id",
          [owner],
        )
      ).rows.map((x) => x.id);
      await c.query(
        "insert into music.playlist_items(playlist_id,user_id,track_id,position) select list,$1,$2,i from unnest($3::uuid[])list cross join generate_series(0,999)i",
        [owner, initial.catalog.tracks[0].id, lists.slice(0, 5)],
      );
    });
    const full = await app.inject({
      method: "GET",
      url: "/v1/snapshot",
      headers,
    });
    const summary = await app.inject({
      method: "GET",
      url: "/v1/snapshot?playlistShape=summary",
      headers,
    });
    assert.equal(summary.statusCode, 200);
    const value = summary.json(),
      legacy = full.json();
    assert.equal(
      value.playlists.reduce((sum, p) => sum + p.items.length, 0),
      0,
    );
    assert.equal(
      value.playlists.reduce((sum, p) => sum + p.trackCount, 0),
      5000,
    );
    assert.ok(value.playlists.every((p) => p.itemsComplete === false));
    assert.equal(
      legacy.playlists.reduce((sum, p) => sum + p.items.length, 0),
      5000,
    );
    assert.deepEqual(value.library, legacy.library);
    assert.deepEqual(value.libraryEntries, legacy.libraryEntries);
    assert.ok(
      Buffer.byteLength(summary.body) < 250 * 1024,
      `${Buffer.byteLength(summary.body)} bytes`,
    );
    const detail = (
      await app.inject({
        method: "GET",
        url: `/v1/resolve/playlist/${lists[0]}`,
        headers,
      })
    ).json();
    const playlist = detail.playlists.find((p) => p.id === lists[0]);
    assert.equal(playlist.itemsComplete, true);
    assert.equal(playlist.items.length, 1000);
    const other = await auth();
    const stranger = (
      await app.inject({
        method: "GET",
        url: "/v1/snapshot?playlistShape=summary",
        headers: { authorization: `Bearer ${other.accessToken}` },
      })
    ).json();
    assert.equal(stranger.playlists.length, 0);
    assert.equal(stranger.library.artists.length, 0);
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/snapshot?playlistShape=unknown",
          headers,
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
