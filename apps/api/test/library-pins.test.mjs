import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";
import { maxLibraryPins } from "../src/common.mjs";

async function harness() {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  const signIn = async () => {
    const account = (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        headers: { "x-saz-platform": "native" },
        payload: {},
      })
    ).json();
    return { authorization: `Bearer ${account.accessToken}` };
  };
  const call = (method, url, headers) =>
    app.inject({ method, url, headers, payload: {} });
  const snapshot = async (headers) =>
    (await app.inject({ method: "GET", url: "/v1/snapshot", headers })).json();
  const pin = (headers, kind, id) =>
    call("PUT", `/v1/library/pins/${kind}/${id}`, headers);
  const unpin = (headers, kind, id) =>
    call("DELETE", `/v1/library/pins/${kind}/${id}`, headers);
  const ownedPlaylist = (owner, title) =>
    db.admin(
      async (client) =>
        (
          await client.query(
            "insert into music.playlists(user_id,title) values($1,$2) returning id",
            [owner, title],
          )
        ).rows[0].id,
    );
  const pinned = async (headers) =>
    (await snapshot(headers)).libraryEntries
      .filter((entry) => entry.pinnedAt)
      .map((entry) => `${entry.kind}:${entry.id}`)
      .sort();
  return {
    db,
    app,
    signIn,
    call,
    snapshot,
    pin,
    unpin,
    ownedPlaylist,
    pinned,
    close: async () => {
      await app.close();
      await db.close();
    },
  };
}

test("pins apply only to Library collections, are idempotent and leave unpinned entries untouched", async () => {
  const h = await harness();
  try {
    const headers = await h.signIn();
    const initial = await h.snapshot(headers);
    const [album] = initial.catalog.albums;
    const [artist] = initial.catalog.artists;
    for (const [kind, id] of [
      ["albums", album.id],
      ["artists", artist.id],
    ]) {
      assert.equal((await h.pin(headers, kind, id)).statusCode, 404);
      await h.call("PUT", `/v1/library/${kind}/${id}`, headers);
    }
    const first = await h.pin(headers, "albums", album.id);
    assert.equal(first.statusCode, 200);
    const { pinnedAt } = first.json();
    assert.equal(first.json().pinned, true);
    assert.ok(Number.isFinite(Date.parse(pinnedAt)));
    // A second request keeps the original time instead of reordering the pin.
    const repeat = await h.pin(headers, "albums", album.id);
    assert.equal(repeat.json().pinnedAt, pinnedAt);

    const entries = (await h.snapshot(headers)).libraryEntries;
    const pinnedAlbum = entries.find((entry) => entry.id === album.id);
    const plainArtist = entries.find((entry) => entry.id === artist.id);
    assert.equal(pinnedAlbum.pinnedAt, pinnedAt);
    assert.ok(!("pinnedAt" in plainArtist));

    assert.equal((await h.unpin(headers, "albums", album.id)).statusCode, 200);
    assert.deepEqual(await h.pinned(headers), []);
    assert.equal((await h.unpin(headers, "albums", album.id)).statusCode, 200);

    // Tracks cannot be pinned and malformed identities are rejected.
    for (const url of [
      `/v1/library/pins/tracks/${album.id}`,
      `/v1/library/pins/albums/not-a-uuid`,
      `/v1/library/pins/unknown/${album.id}`,
    ]) {
      const response = await h.call("PUT", url, headers);
      assert.ok([404, 422].includes(response.statusCode), url);
    }
    assert.equal(
      (
        await h.app.inject({
          method: "PUT",
          url: `/v1/library/pins/albums/${album.id}`,
        })
      ).statusCode,
      401,
    );
  } finally {
    await h.close();
  }
});

test("leaving the Library clears a pin and saving again does not restore it", async () => {
  const h = await harness();
  try {
    const headers = await h.signIn();
    const initial = await h.snapshot(headers);
    const owner = initial.profile.id;
    const [artist] = initial.catalog.artists;
    const [saved] = initial.catalog.playlists;
    await h.call("PUT", `/v1/library/artists/${artist.id}`, headers);
    await h.call("PUT", `/v1/library/playlists/${saved.id}`, headers);
    await h.pin(headers, "artists", artist.id);
    await h.pin(headers, "playlists", saved.id);
    assert.deepEqual(await h.pinned(headers), [
      `artists:${artist.id}`,
      `playlists:${saved.id}`,
    ]);

    await h.call("DELETE", `/v1/library/artists/${artist.id}`, headers);
    await h.call("PUT", `/v1/library/artists/${artist.id}`, headers);
    assert.deepEqual(await h.pinned(headers), [`playlists:${saved.id}`]);

    // An owned playlist remains in the Library, so removing a saved copy keeps its pin.
    const owned = await h.ownedPlaylist(owner, "Pinned mix");
    await h.pin(headers, "playlists", owned);
    await h.call("PUT", `/v1/library/playlists/${owned}`, headers);
    await h.call("DELETE", `/v1/library/playlists/${owned}`, headers);
    assert.ok((await h.pinned(headers)).includes(`playlists:${owned}`));

    const removed = await h.app.inject({
      method: "DELETE",
      url: `/v1/playlists/${owned}`,
      headers,
      payload: { expectedRevision: "0" },
    });
    assert.equal(removed.statusCode, 200);
    assert.ok(!(await h.pinned(headers)).includes(`playlists:${owned}`));
    assert.equal(
      await h.db.admin(
        async (client) =>
          (
            await client.query(
              "select count(*)::int as n from music.library_pins where entity_id=$1",
              [owned],
            )
          ).rows[0].n,
      ),
      0,
    );

    // A pin whose collection disappeared out of band is never reported.
    await h.db.admin((client) =>
      client.query(
        "delete from music.saved_playlists where user_id=$1 and playlist_id=$2",
        [owner, saved.id],
      ),
    );
    assert.deepEqual(await h.pinned(headers), []);
  } finally {
    await h.close();
  }
});

test("pins are bounded, concurrency-safe and invisible to other accounts", async () => {
  const h = await harness();
  try {
    const headers = await h.signIn();
    const stranger = await h.signIn();
    const owner = (await h.snapshot(headers)).profile.id;
    const playlists = [];
    for (let index = 0; index <= maxLibraryPins + 3; index += 1)
      playlists.push(await h.ownedPlaylist(owner, `Mix ${index}`));

    // A burst of requests cannot exceed the cap.
    const burst = await Promise.all(
      playlists.map((id) => h.pin(headers, "playlists", id)),
    );
    const accepted = burst.filter((response) => response.statusCode === 200);
    const refused = burst.filter((response) => response.statusCode === 409);
    assert.equal(accepted.length, maxLibraryPins);
    assert.equal(accepted.length + refused.length, playlists.length);
    assert.ok(refused.every((r) => r.json().error.code === "pin_limit"));
    assert.equal((await h.pinned(headers)).length, maxLibraryPins);

    // Re-pinning an existing pin still succeeds at the cap; unpinning frees one slot.
    const pinnedNow = (await h.pinned(headers)).map((key) =>
      key.replace("playlists:", ""),
    );
    const [firstPinned] = pinnedNow;
    const unpinnedId = playlists.find((id) => !pinnedNow.includes(id));
    assert.ok(unpinnedId);
    assert.equal(
      (await h.pin(headers, "playlists", firstPinned)).statusCode,
      200,
    );
    assert.equal(
      (await h.pin(headers, "playlists", unpinnedId)).statusCode,
      409,
    );
    await h.unpin(headers, "playlists", firstPinned);
    assert.equal(
      (await h.pin(headers, "playlists", unpinnedId)).statusCode,
      200,
    );

    // Another account sees none of these pins and cannot pin the owner's collections.
    assert.deepEqual(await h.pinned(stranger), []);
    assert.equal(
      (await h.pin(stranger, "playlists", playlists[0])).statusCode,
      404,
    );
    assert.equal(
      (await h.unpin(stranger, "playlists", pinnedNow[1])).statusCode,
      200,
    );
    assert.equal((await h.pinned(headers)).length, maxLibraryPins);
  } finally {
    await h.close();
  }
});
