import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";
test("cold library hydrates all saved collections and owned playlists beyond discovery page 100", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  const auth = (
    await app.inject({
      method: "POST",
      url: "/auth/demo",
      payload: {},
      headers: { "x-saz-platform": "native" },
    })
  ).json();
  const headers = { authorization: `Bearer ${auth.accessToken}` };
  try {
    const first = (
      await app.inject({ method: "GET", url: "/v1/snapshot", headers })
    ).json();
    const owner = first.profile.id;
    await db.admin(async (client) => {
      const artists = (
        await client.query(
          "insert into music.artists(name,search_text,status,created_at) select 'Saved artist '||i,'Saved artist '||i,'published',now()+interval '1 day' from generate_series(1,150) i returning id",
        )
      ).rows.map((row) => row.id);
      const albums = (
        await client.query(
          "insert into music.albums(title,search_text,status,created_at) select 'Saved album '||i,'Saved album '||i,'published',now()+interval '1 day' from generate_series(1,150) i returning id",
        )
      ).rows.map((row) => row.id);
      await client.query(
        "insert into music.saved_artists(user_id,artist_id) select $1,unnest($2::uuid[])",
        [owner, artists],
      );
      await client.query(
        "insert into music.saved_albums(user_id,album_id) select $1,unnest($2::uuid[])",
        [owner, albums],
      );
      await client.query(
        "insert into music.playlists(user_id,title) select $1,'Owned playlist '||i from generate_series(1,150) i",
        [owner],
      );
    });
    const cold = (
      await app.inject({ method: "GET", url: "/v1/snapshot", headers })
    ).json();
    assert.equal(cold.library.artists.length, 150);
    assert.equal(cold.library.albums.length, 150);
    assert.ok(
      cold.library.artists.every((id) =>
        cold.catalog.artists.some((item) => item.id === id),
      ),
    );
    assert.ok(
      cold.library.albums.every((id) =>
        cold.catalog.albums.some((item) => item.id === id),
      ),
    );
    assert.equal(cold.playlists.length, 150);
    const otherAuth = (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json();
    const other = (
      await app.inject({
        method: "GET",
        url: "/v1/snapshot",
        headers: { authorization: `Bearer ${otherAuth.accessToken}` },
      })
    ).json();
    assert.equal(other.playlists.length, 0);
    assert.equal(other.library.albums.length, 0);
    assert.equal(other.library.artists.length, 0);
  } finally {
    await app.close();
    await db.close();
  }
});
