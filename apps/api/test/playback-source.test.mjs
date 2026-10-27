import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("deleting the playback source does not block a legacy queue edit or replace its entries", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  let token;
  const call = (method, url, payload, receipt = false) =>
    app.inject({
      method,
      url,
      payload,
      headers: {
        "x-saz-platform": "native",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(receipt ? { "idempotency-key": randomUUID() } : {}),
      },
    });
  try {
    token = (await call("POST", "/auth/demo", {})).json().accessToken;
    const sn = (await call("GET", "/v1/snapshot")).json();
    const playlist = (
      await call("POST", "/v1/playlists", { title: "Temporary source" }, true)
    ).json();
    const entries = sn.catalog.tracks.slice(0, 2).map((track) => ({
      id: randomUUID(),
      trackId: track.id,
      origin: "context",
    }));
    const path = `/v1/playback-sessions/${randomUUID()}`;
    const body = {
      expectedRevision: null,
      entries,
      currentEntryId: entries[0].id,
      positionMs: 0,
      repeatMode: "none",
      shuffle: false,
    };
    const created = await call("PUT", path, {
      ...body,
      source: { kind: "playlist", id: playlist.id },
    });
    assert.equal(created.statusCode, 200, created.body);
    const removed = await call(
      "DELETE",
      `/v1/playlists/${playlist.id}`,
      { expectedRevision: playlist.revision },
      true,
    );
    assert.equal(removed.statusCode, 200, removed.body);
    const edited = await call("PATCH", path, {
      expectedRevision: created.json().revision,
      repeatMode: "all",
    });
    assert.equal(edited.statusCode, 200, edited.body);
    assert.equal(edited.json().source, null);
    assert.deepEqual(edited.json().entries, entries);
    const replaced = await call("PUT", path, {
      ...body,
      expectedRevision: edited.json().revision,
    });
    assert.equal(replaced.statusCode, 200, replaced.body);
    assert.equal(replaced.json().source, null);
    assert.deepEqual(replaced.json().entries, entries);
  } finally {
    await app.close();
    await db.close();
  }
});

test("playback source restores, survives queue edits, clears on legacy replacement and stays account isolated", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  const call = (method, url, payload, token) =>
    app.inject({
      method,
      url,
      payload,
      headers: {
        "x-saz-platform": "native",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  try {
    const a = (await call("POST", "/auth/demo", {})).json().accessToken;
    const b = (await call("POST", "/auth/demo", {})).json().accessToken;
    const sn = (await call("GET", "/v1/snapshot", undefined, a)).json();
    const entries = sn.catalog.tracks.slice(0, 2).map((track) => ({
      id: randomUUID(),
      trackId: track.id,
      origin: "context",
    }));
    const path = `/v1/playback-sessions/${randomUUID()}`;
    const source = { kind: "album", id: sn.catalog.albums[0].id };
    const body = {
      expectedRevision: null,
      entries,
      currentEntryId: entries[0].id,
      positionMs: 0,
      repeatMode: "none",
      shuffle: false,
      source,
    };
    const created = await call("PUT", path, body, a);
    assert.equal(created.statusCode, 200, created.body);
    assert.deepEqual(created.json().source, source);
    assert.deepEqual(
      (await call("GET", path, undefined, a)).json().source,
      source,
    );
    assert.equal((await call("GET", path, undefined, b)).json(), null);
    const patch = await call(
      "PATCH",
      path,
      { expectedRevision: created.json().revision, repeatMode: "all" },
      a,
    );
    assert.deepEqual(patch.json().source, source);
    const { source: _source, ...legacy } = body;
    const retained = await call(
      "PUT",
      path,
      { ...legacy, expectedRevision: patch.json().revision },
      a,
    );
    assert.deepEqual(retained.json().source, source);
    assert.deepEqual(retained.json().entries, entries);
    const changed = entries.map((entry) => ({ ...entry, id: randomUUID() }));
    const replaced = await call(
      "PUT",
      path,
      {
        ...legacy,
        entries: changed,
        currentEntryId: changed[0].id,
        expectedRevision: retained.json().revision,
      },
      a,
    );
    assert.equal(replaced.json().source, null);
    const searched = await call(
      "PATCH",
      path,
      {
        expectedRevision: replaced.json().revision,
        source: { kind: "search", query: "Blue 🌙" },
      },
      a,
    );
    assert.equal(searched.statusCode, 200, searched.body);
    assert.deepEqual(searched.json().source, {
      kind: "search",
      query: "Blue 🌙",
    });
    for (const invalid of [
      { kind: "url", url: "https://example.com" },
      { kind: "search", query: "x".repeat(161) },
      { kind: "album", id: "bad" },
    ]) {
      assert.equal(
        (
          await call(
            "PATCH",
            path,
            { expectedRevision: searched.json().revision, source: invalid },
            a,
          )
        ).statusCode,
        422,
      );
    }
    const privatePlaylist = (
      await app.inject({
        method: "POST",
        url: "/v1/playlists",
        payload: { title: "Private source" },
        headers: {
          "x-saz-platform": "native",
          authorization: `Bearer ${b}`,
          "idempotency-key": randomUUID(),
        },
      })
    ).json();
    assert.equal(
      (
        await call(
          "PATCH",
          path,
          {
            expectedRevision: searched.json().revision,
            source: { kind: "playlist", id: privatePlaylist.id },
          },
          a,
        )
      ).statusCode,
      404,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
