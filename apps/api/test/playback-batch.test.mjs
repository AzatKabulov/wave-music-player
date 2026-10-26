import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("large queue commits bound database round trips while retaining duplicate identities and access checks", async (t) => {
  const base = await createDatabase({ memory: true });
  let queries = 0;
  const db = {
    ...base,
    user: (id, work) =>
      base.user(id, (client) =>
        work({
          query: (...args) => {
            queries++;
            return client.query(...args);
          },
        }),
      ),
  };
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
    const token = (await call("POST", "/auth/demo", {})).json().accessToken;
    const catalog = (await call("GET", "/v1/snapshot", undefined, token)).json()
      .catalog;
    const entries = Array.from({ length: 1000 }, (_, i) => ({
      id: randomUUID(),
      trackId: catalog.tracks[i % 3].id,
      origin: i % 4 === 0 ? "explicit" : "context",
    }));
    const path = `/v1/playback-sessions/${randomUUID()}`;
    const body = {
      expectedRevision: null,
      entries,
      currentEntryId: entries[500].id,
      positionMs: 3000,
      repeatMode: "all",
      shuffle: false,
    };
    queries = 0;
    const start = performance.now();
    const response = await call("PUT", path, body, token);
    const count = queries;
    t.diagnostic(
      JSON.stringify({
        entries: entries.length,
        userQueries: count,
        serverMs: performance.now() - start,
        scope:
          "single in-memory synthetic sample, excludes network/render/audio",
      }),
    );
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json().entries, entries);
    assert.equal(response.json().currentEntryId, entries[500].id);
    const forbidden = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: response.json().revision,
        entries: [
          ...entries,
          { id: randomUUID(), trackId: randomUUID(), origin: "context" },
        ],
      },
      token,
    );
    assert.equal(forbidden.statusCode, 404, forbidden.body);
    assert.deepEqual(
      (await call("GET", path, undefined, token)).json(),
      response.json(),
    );
    const changed = entries.map((entry, i) =>
      i === 0 ? { ...entry, trackId: entries[1].trackId } : entry,
    );
    assert.equal(
      (
        await call(
          "PUT",
          path,
          {
            ...body,
            expectedRevision: response.json().revision,
            entries: changed,
          },
          token,
        )
      ).statusCode,
      422,
    );
    const changedCase = changed.map((entry, index) =>
      index === 0 ? { ...entry, id: entry.id.toUpperCase() } : entry,
    );
    const retargeted = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: response.json().revision,
        entries: changedCase,
      },
      token,
    );
    assert.equal(
      retargeted.statusCode,
      422,
      "UUID casing cannot change an existing entry's recording",
    );
    assert.ok(count <= 12, `A 1000-entry write used ${count} user queries`);
    const cleared = await call(
      "PUT",
      path,
      {
        ...body,
        expectedRevision: response.json().revision,
        entries: [],
        currentEntryId: null,
        positionMs: 0,
      },
      token,
    );
    assert.equal(cleared.statusCode, 200, cleared.body);
    assert.deepEqual(cleared.json().entries, []);
    assert.equal(cleared.json().currentEntryId, null);
  } finally {
    await app.close();
    await base.close();
  }
});
