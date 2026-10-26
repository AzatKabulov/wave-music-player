import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("snapshot and resolved releases expose truthful metadata and safe artwork colors", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db, baseUrl: "http://localhost:4100" });
  try {
    const auth = (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json();
    const headers = { authorization: `Bearer ${auth.accessToken}` };
    const read = async (url) => {
      const response = await app.inject({ method: "GET", url, headers });
      assert.equal(response.statusCode, 200, response.body);
      return response.json();
    };
    const first = await read("/v1/snapshot");
    const album = first.catalog.albums[0],
      artist = first.catalog.artists.find((a) => a.id === album.artistId);
    const image = randomUUID(),
      unrelated = randomUUID();
    await db.admin(async (c) => {
      for (const id of [image, unrelated])
        await c.query(
          "insert into music.media_assets(id,source_id,kind,storage_key,mime_type,byte_size,status,sha256,dominant_color,width,height,palette_version) values($1,'10000000-0000-4000-8000-000000000998','image',$2,'image/png',100,'ready',repeat('a',64),'#356578',600,600,1)",
          [id, `private/${id}.png`],
        );
      await c.query(
        "update music.albums set cover_asset_id=$1,release_type='album',expected_track_count=10,completeness='partial',edition='Standard' where id=$2",
        [image, album.id],
      );
      await c.query(
        "update music.artists set image_asset_id=$1,aliases=array['Alias example'],bio_source='Artist-supplied' where id=$2",
        [image, artist.id],
      );
    });
    for (const graph of [
      (await read("/v1/snapshot")).catalog,
      await read(`/v1/resolve/album/${album.id}`),
    ]) {
      const release = graph.albums.find((a) => a.id === album.id);
      assert.equal(release.releaseType, "album");
      assert.match(release.releaseDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(release.expectedTrackCount, 10);
      assert.equal(release.completeness, "partial");
      assert.equal(release.edition, "Standard");
      assert.equal(release.artworkColor, "#356578");
      assert.match(release.artworkUrl, /\?v=a{64}$/);
      const person = graph.artists.find((a) => a.id === artist.id);
      assert.match(person.artworkUrl, new RegExp(image));
      assert.deepEqual(person.aliases, ["Alias example"]);
      assert.equal(person.bioSource, "Artist-supplied");
      const track = graph.tracks.find((t) => t.albumId === album.id);
      assert.equal(track.contentKind, "fixture");
      assert.equal(track.artworkColor, "#356578");
      assert.ok(track.discNumber > 0 && track.trackNumber > 0);
      assert.ok(!JSON.stringify(graph).includes("private/"));
    }
    const visible = await db.user(first.profile.id, (c) =>
      c.query("select id,dominant_color from music.media_assets"),
    );
    assert.deepEqual(
      visible.rows.map((r) => r.id),
      [image],
    );
    await assert.rejects(
      () =>
        db.user(first.profile.id, (c) =>
          c.query("select storage_key from music.media_assets"),
        ),
      /permission denied/,
    );
    await db.admin((c) =>
      c.query("update music.media_assets set status='withdrawn' where id=$1", [
        image,
      ]),
    );
    assert.equal(
      (
        await db.user(first.profile.id, (c) =>
          c.query("select id from music.media_assets"),
        )
      ).rows.length,
      0,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
