import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";
import { inspectWav, processImport } from "../src/imports.mjs";
import { createServer } from "node:http";
import { once } from "node:events";
import { hash } from "../src/common.mjs";
import { readFile } from "node:fs/promises";
let db, app, a, b;
const call = (method, url, body, token = a, extra = {}) =>
  app.inject({
    method,
    url,
    payload: body,
    headers: {
      "x-saz-platform": "native",
      ...(token
        ? { authorization: `Bearer ${token}` }
        : { origin: "http://localhost:8081" }),
      ...extra,
    },
  });
before(async () => {
  db = await createDatabase({ mode: "local", memory: true });
  app = await createApp({
    db,
    mode: "local",
    origin: "http://localhost:8081",
    baseUrl: "http://127.0.0.1:4100",
  });
  a = (await call("POST", "/auth/demo", {}, null)).json().accessToken;
  b = (await call("POST", "/auth/demo", {}, null)).json().accessToken;
});
after(async () => {
  await app?.close();
  await db?.close();
});
test("anonymous writes and unknown/oversize input are rejected", async () => {
  assert.equal(
    (await call("POST", "/v1/playlists", { title: "x" }, null)).statusCode,
    401,
  );
  assert.equal(
    (await call("POST", "/v1/playlists", { title: "x", userId: randomUUID() }))
      .statusCode,
    422,
  );
  assert.equal((await call("GET", "/v1/tracks/not-a-uuid")).statusCode, 422);
});
test("private playlists are isolated, creates retry safely, and revisions conflict", async () => {
  const key = randomUUID(),
    body = { title: "Private mix", description: "Original fixtures" };
  const first = await call("POST", "/v1/playlists", body, a, {
    "idempotency-key": key,
  });
  assert.equal(first.statusCode, 201, first.body);
  const p = first.json();
  const retry = await call("POST", "/v1/playlists", body, a, {
    "idempotency-key": key,
  });
  assert.equal(retry.json().id, p.id);
  assert.equal(
    (
      await call("POST", "/v1/playlists", { title: "changed" }, a, {
        "idempotency-key": key,
      })
    ).statusCode,
    422,
  );
  assert.equal(
    (await call("GET", `/v1/playlists/${p.id}`, undefined, b)).statusCode,
    404,
  );
  const other = await call(
    "PATCH",
    `/v1/playlists/${p.id}`,
    { title: "stolen", expectedRevision: "0" },
    b,
  );
  assert.equal(other.statusCode, 404);
  const edit = await call("PATCH", `/v1/playlists/${p.id}`, {
    title: "Updated",
    expectedRevision: "0",
  });
  assert.equal(edit.statusCode, 200, edit.body);
  assert.equal(
    (
      await call("PATCH", `/v1/playlists/${p.id}`, {
        title: "stale",
        expectedRevision: "0",
      })
    ).statusCode,
    409,
  );
});
test("library saves do not leak across listeners", async () => {
  const track = "10000000-0000-4000-8000-000000000300";
  assert.equal(
    (await call("PUT", `/v1/library/tracks/${track}`, {})).statusCode,
    200,
  );
  assert.ok(
    (await call("GET", "/v1/snapshot")).json().library.tracks.includes(track),
  );
  assert.ok(
    !(await call("GET", "/v1/snapshot", undefined, b))
      .json()
      .library.tracks.includes(track),
  );
});
test("queue CAS, single ranges, bad leases, and signout revocation", async () => {
  const device = randomUUID(),
    entry = {
      id: randomUUID(),
      trackId: "10000000-0000-4000-8000-000000000300",
      origin: "context",
    };
  const state = {
    expectedRevision: null,
    entries: [entry],
    currentEntryId: entry.id,
    positionMs: 0,
    repeatMode: "none",
    shuffle: false,
  };
  const put = await call("PUT", `/v1/playback-sessions/${device}`, state);
  assert.equal(put.statusCode, 200, put.body);
  assert.equal(
    (await call("PUT", `/v1/playback-sessions/${device}`, state)).statusCode,
    409,
  );
  assert.equal(
    (await call("GET", `/v1/playback-sessions/${device}`, undefined, b))
      .statusCode,
    404,
  );
  const grant = await call(
    "POST",
    `/v1/playback-sessions/${device}/grants`,
    {},
  );
  assert.equal(grant.statusCode, 201, grant.body);
  const token = grant.json().token;
  const media = await call(
    "GET",
    `/v1/media/${token}/${entry.id}`,
    undefined,
    null,
    { range: "bytes=0-43" },
  );
  assert.equal(media.statusCode, 206, media.body);
  assert.equal(media.rawPayload.length, 44);
  assert.equal(media.headers["content-range"], "bytes 0-43/768044");
  assert.equal(
    (await call("HEAD", `/v1/media/${token}/${entry.id}`, undefined, null))
      .statusCode,
    200,
  );
  assert.equal(
    (
      await call("GET", `/v1/media/${token}/${entry.id}`, undefined, null, {
        range: "bytes=999999999-",
      })
    ).statusCode,
    416,
  );
  assert.equal(
    (
      await call(
        "GET",
        `/v1/media/${"a".repeat(43)}/${entry.id}`,
        undefined,
        null,
      )
    ).statusCode,
    410,
  );
  const revoked = await call(
    "DELETE",
    `/v1/playback-sessions/${device}/grants`,
  );
  assert.equal(revoked.statusCode, 200);
  assert.equal(
    (await call("GET", `/v1/media/${token}/${entry.id}`, undefined, null))
      .statusCode,
    410,
  );
});
test("account deletion removes owned records and invalidates credentials", async () => {
  const token = (await call("POST", "/auth/demo", {}, null)).json().accessToken;
  await call("POST", "/v1/playlists", { title: "To erase" }, token, {
    "idempotency-key": randomUUID(),
  });
  const res = await call("DELETE", "/v1/me", {}, token);
  assert.equal(res.statusCode, 202, res.body);
  await app.runJobs();
  assert.equal((await call("GET", "/v1/me", undefined, token)).statusCode, 401);
});
test("housekeeping runs with no queued job and terminalizes an exhausted lease", async () => {
  const key = randomUUID();
  await db.admin(async (c) => {
    await c.query(
      "insert into music.rate_limit_buckets(bucket_key,window_start,expires_at) values($1,now()-interval '2 days',now()-interval '1 day')",
      [key],
    );
    await c.query(
      "insert into music.jobs(kind,dedupe_key,status,attempts,locked_until) values('catalog_withdrawal',$1,'running',5,now()-interval '1 minute')",
      [key],
    );
  });
  await app.runJobs();
  const result = await db.admin(async (c) => ({
    bucket: (
      await c.query(
        "select id from music.rate_limit_buckets where bucket_key=$1",
        [key],
      )
    ).rows,
    job: (
      await c.query(
        "select status,locked_until from music.jobs where dedupe_key=$1",
        [key],
      )
    ).rows[0],
  }));
  assert.equal(result.bucket.length, 0);
  assert.equal(result.job.status, "failed");
  assert.equal(result.job.locked_until, null);
});
test("local password auth verifies secrets and signout invalidates every session", async () => {
  const email = `fixture-${randomUUID()}@example.test`,
    password = "fixture-password-2026";
  const registered = await call(
    "POST",
    "/auth/register",
    { email, password, displayName: "Fixture" },
    null,
  );
  assert.equal(registered.statusCode, 200, registered.body);
  const first = registered.json().accessToken;
  assert.equal(
    (
      await call(
        "POST",
        "/auth/login",
        { email, password: "incorrect-password" },
        null,
      )
    ).statusCode,
    401,
  );
  const logged = await call("POST", "/auth/login", { email, password }, null);
  assert.equal(logged.statusCode, 200, logged.body);
  const second = logged.json().accessToken;
  assert.equal((await call("POST", "/auth/logout", {}, first)).statusCode, 200);
  assert.equal(
    (await call("GET", "/v1/me", undefined, second)).statusCode,
    401,
  );
});
test("foreign browser origins are refused and cookies are httpOnly", async () => {
  const result = await call("POST", "/auth/demo", {}, null);
  assert.match(String(result.headers["set-cookie"]), /HttpOnly/i);
  assert.equal(
    (
      await call("POST", "/auth/demo", {}, null, {
        origin: "https://untrusted.example",
      })
    ).statusCode,
    403,
  );
});
test("playlist reorder preserves duplicates and rejects a foreign item identity atomically", async () => {
  const p = (
      await call("POST", "/v1/playlists", { title: "Order test" }, a, {
        "idempotency-key": randomUUID(),
      })
    ).json(),
    trackId = "10000000-0000-4000-8000-000000000300";
  const items = [
    { id: randomUUID(), trackId },
    { id: randomUUID(), trackId },
  ];
  const write = await call("PUT", `/v1/playlists/${p.id}/items`, {
    expectedRevision: "0",
    items,
  });
  assert.equal(write.statusCode, 200, write.body);
  const rev = write.json().revision;
  const reorder = await call("PUT", `/v1/playlists/${p.id}/items`, {
    expectedRevision: rev,
    items: [items[1], items[0]],
  });
  assert.equal(reorder.statusCode, 200, reorder.body);
  const value = (await call("GET", `/v1/playlists/${p.id}`)).json();
  assert.deepEqual(value.items, [items[1], items[0]]);
  assert.equal(
    (
      await call("PUT", `/v1/playlists/${p.id}/items`, {
        expectedRevision: value.revision,
        items: [
          { ...items[0], trackId: "10000000-0000-4000-8000-000000000301" },
        ],
      })
    ).statusCode,
    422,
  );
  assert.deepEqual(
    (await call("GET", `/v1/playlists/${p.id}`)).json().items,
    value.items,
  );
});
test("original audio fixtures validate; truncated or non-PCM uploads are refused", async () => {
  const bytes = await readFile(
    new URL(
      "../../../public/audio/10000000-0000-4000-8000-000000000300.wav",
      import.meta.url,
    ),
  );
  assert.equal(
    inspectWav(bytes.subarray(0, 44), bytes.length).durationMs,
    24000,
  );
  assert.throws(() => inspectWav(bytes.subarray(0, 44), bytes.length - 1));
  const bad = Buffer.from(bytes.subarray(0, 44));
  bad.writeUInt16LE(3, 20);
  assert.throws(() => inspectWav(bad, bytes.length));
});
test("an already-issued lease obeys later explicit preferences and source withdrawal", async () => {
  const device = randomUUID(),
    trackId = "10000000-0000-4000-8000-000000000302",
    entry = { id: randomUUID(), trackId, origin: "context" };
  const put = await call("PUT", `/v1/playback-sessions/${device}`, {
    expectedRevision: null,
    entries: [entry],
    currentEntryId: entry.id,
    positionMs: 0,
    repeatMode: "none",
    shuffle: false,
  });
  assert.equal(put.statusCode, 200, put.body);
  const token = (
      await call("POST", `/v1/playback-sessions/${device}/grants`, {})
    ).json().token,
    url = `/v1/media/${token}/${entry.id}`;
  assert.equal(
    (await call("GET", url, undefined, null, { range: "bytes=-16" })).rawPayload
      .length,
    16,
  );
  await db.admin((c) =>
    c.query("update music.tracks set explicit=true where id=$1", [trackId]),
  );
  await call("PATCH", "/v1/preferences", { explicitAllowed: false });
  assert.equal((await call("HEAD", url, undefined, null)).statusCode, 410);
  await call("PATCH", "/v1/preferences", { explicitAllowed: true });
  assert.equal((await call("HEAD", url, undefined, null)).statusCode, 200);
  await db.admin((c) =>
    c.query("update music.tracks set status='withdrawn' where id=$1", [
      trackId,
    ]),
  );
  assert.equal((await call("HEAD", url, undefined, null)).statusCode, 410);
  await db.admin((c) =>
    c.query(
      "update music.tracks set status='published',explicit=false where id=$1",
      [trackId],
    ),
  );
});
test("only the owner can delete a playlist at its current revision", async () => {
  const p = (
    await call("POST", "/v1/playlists", { title: "Delete fixture" }, a, {
      "idempotency-key": randomUUID(),
    })
  ).json();
  assert.equal(
    (
      await call(
        "DELETE",
        `/v1/playlists/${p.id}`,
        { expectedRevision: p.revision },
        b,
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (await call("DELETE", `/v1/playlists/${p.id}`, { expectedRevision: "99" }))
      .statusCode,
    409,
  );
  assert.equal(
    (
      await call("DELETE", `/v1/playlists/${p.id}`, {
        expectedRevision: p.revision,
      })
    ).statusCode,
    200,
  );
  assert.equal((await call("GET", `/v1/playlists/${p.id}`)).statusCode, 404);
});
test("controlled import validates bytes, stays draft, preserves retry identities, and quarantines corruption", async () => {
  const source = "10000000-0000-4000-8000-000000000998",
    audioId = randomUUID(),
    manifestId = randomUUID();
  const bytes = await readFile(
    new URL(
      "../../../public/audio/10000000-0000-4000-8000-000000000300.wav",
      import.meta.url,
    ),
  );
  const manifest = Buffer.from(
    JSON.stringify({
      tracks: [
        {
          externalId: "import-fixture",
          title: "Ýol test",
          artist: { name: "Import Fixture" },
          album: { title: "Draft Release" },
          audioAssetId: audioId,
          language: "tk",
          genre: "Instrumental",
          explicit: false,
        },
      ],
    }),
  );
  const objects = new Map([
    [audioId, bytes],
    [manifestId, manifest],
  ]);
  const server = createServer((req, res) => {
    const body = objects.get(req.url.slice(1));
    if (!body) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Length": body.length });
    res.end(body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const provider = {
    storage: {
      from() {
        return {
          async createSignedUrl(key) {
            return {
              data: {
                signedUrl: `http://127.0.0.1:${server.address().port}/${key}`,
              },
            };
          },
        };
      },
    },
  };
  try {
    const job = await db.admin(async (c) => {
      for (const [id, body, kind, mime] of [
        [audioId, bytes, "audio", "audio/wav"],
        [manifestId, manifest, "evidence", "application/json"],
      ])
        await c.query(
          "insert into music.media_assets(id,source_id,kind,storage_key,mime_type,byte_size,sha256) values($1,$2,$3,$4,$5,$6,$7)",
          [id, source, kind, id, mime, body.length, hash(body)],
        );
      return (
        await c.query(
          "insert into music.jobs(source_id,kind,dedupe_key,status,attempts,locked_until,payload) values($1,'catalog_import',$2,'running',1,now()+interval '2 minutes',$3) returning *",
          [
            source,
            randomUUID(),
            JSON.stringify({ manifestAssetId: manifestId }),
          ],
        )
      ).rows[0];
    });
    const first = await processImport({
      db,
      provider,
      env: { AUDIO_BUCKET: "fixture" },
      job,
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].status, "draft");
    assert.equal(
      (await call("GET", `/v1/tracks/${first[0].trackId}`)).statusCode,
      404,
    );
    const retry = await processImport({
      db,
      provider,
      env: { AUDIO_BUCKET: "fixture" },
      job,
    });
    assert.deepEqual(retry, first);
    await db.admin((c) =>
      c.query("update music.media_assets set sha256=$1 where id=$2", [
        "0".repeat(64),
        audioId,
      ]),
    );
    await assert.rejects(
      processImport({ db, provider, env: { AUDIO_BUCKET: "fixture" }, job }),
    );
    assert.equal(
      (
        await db.admin((c) =>
          c.query("select status from music.media_assets where id=$1", [
            audioId,
          ]),
        )
      ).rows[0].status,
      "quarantined",
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
