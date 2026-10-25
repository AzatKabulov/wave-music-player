import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("thirty playlists load within a fixed query budget and remain private", async (context) => {
  const db = await createDatabase({ memory: true });
  let measuring = false,
    queries = 0;
  const originalUser = db.user;
  db.user = (id, fn) =>
    originalUser(id, (client) =>
      fn({
        ...client,
        query: (...args) => {
          if (measuring) queries++;
          return client.query(...args);
        },
      }),
    );
  const app = await createApp({
    db,
    mode: "local",
    origin: "http://localhost:8081",
    baseUrl: "http://localhost:4100",
  });
  const call = (method, url, payload, token) =>
    app.inject({
      method,
      url,
      payload,
      headers: {
        "x-saz-platform": "native",
        origin: "http://localhost:8081",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "idempotency-key": randomUUID(),
      },
    });
  try {
    const owner = (await call("POST", "/auth/demo", {})).json().accessToken;
    const other = (await call("POST", "/auth/demo", {})).json().accessToken;
    for (let index = 0; index < 30; index++) {
      const created = await call(
        "POST",
        "/v1/playlists",
        { title: `Measured playlist ${index}` },
        owner,
      );
      assert.equal(created.statusCode, 201, created.body);
      const playlist = created.json();
      const edited = await call(
        "PUT",
        `/v1/playlists/${playlist.id}/items`,
        {
          expectedRevision: playlist.revision,
          items: [
            {
              id: randomUUID(),
              trackId: "10000000-0000-4000-8000-000000000301",
            },
          ],
        },
        owner,
      );
      assert.equal(edited.statusCode, 200, edited.body);
    }
    measuring = true;
    const response = await call("GET", "/v1/snapshot", undefined, owner);
    measuring = false;
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().playlists.length, 30);
    assert.ok(
      response
        .json()
        .playlists.every((playlist) => playlist.items.length === 1),
    );
    context.diagnostic(`User queries for 30 playlists: ${queries}`);
    assert.ok(
      queries <= 14,
      `Snapshot issued ${queries} user queries for 30 playlists`,
    );
    const foreign = await call("GET", "/v1/snapshot", undefined, other);
    assert.equal(foreign.json().playlists.length, 0);
  } finally {
    await app.close();
    await db.close();
  }
});
