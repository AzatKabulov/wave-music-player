import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("progress checkpoints never contend for queue revisions or overwrite a newer queue", async () => {
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
    };
    const created = await call("PUT", path, body, a);
    assert.equal(created.statusCode, 200, created.body);
    const revision = created.json().revision;
    const cursor = {
      expectedRevision: revision,
      currentEntryId: entries[0].id,
      positionMs: 9000,
    };
    const checkpoint = await call("PATCH", `${path}/position`, cursor, a);
    assert.equal(checkpoint.statusCode, 200, checkpoint.body);
    assert.deepEqual(checkpoint.json(), { saved: true });
    const state = (await call("GET", path, undefined, a)).json();
    assert.equal(state.revision, revision);
    assert.equal(state.positionMs, 9000);
    assert.deepEqual(
      (await call("PATCH", `${path}/position`, cursor, b)).json(),
      { saved: false },
    );
    assert.deepEqual(
      (
        await call(
          "PATCH",
          `${path}/position`,
          { ...cursor, currentEntryId: randomUUID() },
          a,
        )
      ).json(),
      { saved: false },
    );
    assert.equal(
      (await call("PATCH", `${path}/position`, { ...cursor, entries: [] }, a))
        .statusCode,
      422,
    );
    const edited = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: revision,
        currentEntryId: entries[1].id,
        positionMs: 0,
      },
      a,
    );
    assert.equal(edited.statusCode, 200, edited.body);
    assert.deepEqual(
      (await call("PATCH", `${path}/position`, cursor, a)).json(),
      { saved: false },
    );
    const final = (await call("GET", path, undefined, a)).json();
    assert.equal(final.currentEntryId, entries[1].id);
    assert.equal(final.positionMs, 0);
    assert.deepEqual(final.entries, entries);
    assert.equal(
      (await call("PATCH", `${path}/position`, cursor)).statusCode,
      401,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
