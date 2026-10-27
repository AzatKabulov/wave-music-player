import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("online personal testing requires an explicit account and blocks public registration", async () => {
  const db = await createDatabase({ memory: true });
  const local = await createApp({ db });
  let online;
  try {
    await assert.rejects(
      createApp({ db, env: { MUSIFY_ONLINE_TEST: "1" } }),
      /PRIVATE_TEST_USER_IDS/,
    );
    await assert.rejects(
      createApp({
        db,
        env: { MUSIFY_ONLINE_TEST: "1", PRIVATE_TEST_USER_IDS: "not-a-uuid" },
      }),
      /PRIVATE_TEST_USER_IDS/,
    );
    const owner = (
      await local.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json().accessToken;
    const stranger = (
      await local.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json().accessToken;
    const ownerProfile = (
      await local.inject({
        method: "GET",
        url: "/v1/me",
        headers: { authorization: `Bearer ${owner}` },
      })
    ).json();
    online = await createApp({
      db,
      env: { MUSIFY_ONLINE_TEST: "1", PRIVATE_TEST_USER_IDS: ownerProfile.id },
    });
    const call = (url, token) =>
      online.inject({
        method: "GET",
        url,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    assert.equal((await call("/health/ready")).statusCode, 200);
    assert.equal((await call("/v1/me", owner)).statusCode, 200);
    assert.equal((await call("/v1/me", stranger)).statusCode, 403);
    assert.equal((await call("/v1/me")).statusCode, 401);
    const snapshot = (await call("/v1/snapshot", owner)).json();
    assert.equal(snapshot.demoEnabled, false);
    assert.equal(snapshot.hideFixtures, true);
    assert.deepEqual(snapshot.catalog.tracks, []);
    for (const url of ["/auth/demo", "/auth/register"]) {
      assert.equal(
        (
          await online.inject({
            method: "POST",
            url,
            payload: { email: "visitor@example.org", password: randomUUID() },
          })
        ).statusCode,
        404,
      );
    }
  } finally {
    await online?.close();
    await local.close();
    await db.close();
  }
});
