import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("queue acknowledgement can include an owned media grant without bypassing membership or access", async () => {
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
    const snapshot = (await call("GET", "/v1/snapshot", undefined, a)).json();
    const entries = snapshot.catalog.tracks
      .slice(0, 2)
      .map((t) => ({ id: randomUUID(), trackId: t.id, origin: "context" }));
    const path = `/v1/playback-sessions/${randomUUID()}`;
    const body = {
      expectedRevision: null,
      entries,
      currentEntryId: entries[0].id,
      positionMs: 0,
      repeatMode: "none",
      shuffle: false,
      includeGrant: true,
    };
    const created = await call("PUT", path, body, a);
    assert.equal(created.statusCode, 200, created.body);
    const initial = created.json();
    assert.match(initial.playbackGrant.token, /^[a-zA-Z0-9_-]{43}$/);
    assert.ok(Date.parse(initial.playbackGrant.expiresAt) > Date.now());
    const media = (entryId) =>
      `/v1/media/${initial.playbackGrant.token}/${entryId}`;
    assert.equal((await call("HEAD", media(entries[0].id))).statusCode, 200);
    assert.equal((await call("HEAD", media(randomUUID()))).statusCode, 410);
    assert.equal(
      (await call("GET", path, undefined, a)).json().playbackGrant,
      undefined,
    );
    const grantCount = async () =>
      (
        await db.admin((c) =>
          c.query("select count(*)::int n from music.playback_grants"),
        )
      ).rows[0].n;
    assert.equal(await grantCount(), 1);
    const stale = await call(
      "PUT",
      path,
      { ...body, expectedRevision: "0" },
      a,
    );
    assert.equal(stale.statusCode, 409);
    assert.equal(await grantCount(), 1);
    const foreign = await call(
      "PATCH",
      path,
      { expectedRevision: initial.revision, includeGrant: true },
      b,
    );
    assert.equal(foreign.statusCode, 404, foreign.body);
    assert.equal(await grantCount(), 1);
    const invalid = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: initial.revision,
        entries: [{ ...entries[0], trackId: randomUUID() }],
      },
      a,
    );
    assert.ok([404, 422].includes(invalid.statusCode), invalid.body);
    assert.equal(await grantCount(), 1);
    const ordinary = await call(
      "PATCH",
      path,
      { expectedRevision: initial.revision, shuffle: true },
      a,
    );
    assert.equal(ordinary.statusCode, 200, ordinary.body);
    assert.equal(ordinary.json().playbackGrant, undefined);
    assert.equal(await grantCount(), 1);
    const removed = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: ordinary.json().revision,
        entries: [entries[0]],
        includeGrant: false,
      },
      a,
    );
    assert.equal(removed.statusCode, 200, removed.body);
    assert.equal((await call("HEAD", media(entries[1].id))).statusCode, 410);
    assert.equal((await call("HEAD", media(entries[0].id))).statusCode, 200);
    const renewed = await call(
      "PATCH",
      path,
      { expectedRevision: removed.json().revision, includeGrant: true },
      a,
    );
    assert.equal(renewed.statusCode, 200, renewed.body);
    assert.notEqual(
      renewed.json().playbackGrant.token,
      initial.playbackGrant.token,
    );
    assert.equal(await grantCount(), 2);
    await call("DELETE", `${path}/grants`, {}, a);
    assert.equal((await call("HEAD", media(entries[0].id))).statusCode, 410);
    assert.equal((await call("PUT", path, body)).statusCode, 401);
  } finally {
    await app.close();
    await db.close();
  }
});
