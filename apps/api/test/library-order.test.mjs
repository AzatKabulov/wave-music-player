import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("library exposes real mixed saved dates and owned creation dates without account leakage", async () => {
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
  const snapshot = async (headers) =>
    (await app.inject({ method: "GET", url: "/v1/snapshot", headers })).json();
  try {
    const account = await auth(),
      headers = { authorization: `Bearer ${account.accessToken}` };
    const initial = await snapshot(headers),
      owner = initial.profile.id;
    const album = initial.catalog.albums[0],
      artist = initial.catalog.artists[0],
      playlist = initial.catalog.playlists[0];
    for (const [kind, id] of [
      ["albums", album.id],
      ["artists", artist.id],
      ["playlists", playlist.id],
    ]) {
      const response = await app.inject({
        method: "PUT",
        url: `/v1/library/${kind}/${id}`,
        headers,
        payload: {},
      });
      assert.equal(response.statusCode, 200);
    }
    let owned;
    await db.admin(async (client) => {
      await client.query(
        "update music.saved_albums set created_at='2026-01-01T00:00:00Z' where user_id=$1",
        [owner],
      );
      await client.query(
        "update music.saved_artists set created_at='2026-01-03T00:00:00Z' where user_id=$1",
        [owner],
      );
      await client.query(
        "update music.saved_playlists set created_at='2026-01-02T00:00:00Z' where user_id=$1",
        [owner],
      );
      owned = (
        await client.query(
          "insert into music.playlists(user_id,title,created_at) values($1,'Owner mix','2026-01-04T00:00:00Z') returning id",
          [owner],
        )
      ).rows[0].id;
    });
    const first = await snapshot(headers);
    assert.ok(Array.isArray(first.libraryEntries));
    const recent = [...first.libraryEntries].sort(
      (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
    );
    assert.deepEqual(
      recent.map((entry) => `${entry.kind}:${entry.id}`),
      [
        `playlists:${owned}`,
        `artists:${artist.id}`,
        `playlists:${playlist.id}`,
        `albums:${album.id}`,
      ],
    );
    assert.equal(recent.at(-1).addedAt, "2026-01-01T00:00:00.000Z");
    await app.inject({
      method: "PUT",
      url: `/v1/library/albums/${album.id}`,
      headers,
      payload: {},
    });
    assert.deepEqual(
      (await snapshot(headers)).libraryEntries,
      first.libraryEntries,
    );
    const stranger = await auth();
    assert.deepEqual(
      (await snapshot({ authorization: `Bearer ${stranger.accessToken}` }))
        .libraryEntries,
      [],
    );
    const removed = await app.inject({
      method: "DELETE",
      url: `/v1/library/artists/${artist.id}`,
      headers,
      payload: {},
    });
    assert.equal(removed.statusCode, 200);
    assert.ok(
      !(await snapshot(headers)).libraryEntries.some(
        (entry) => entry.kind === "artists" && entry.id === artist.id,
      ),
    );
  } finally {
    await app.close();
    await db.close();
  }
});
