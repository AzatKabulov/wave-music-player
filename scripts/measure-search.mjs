import { performance } from "node:perf_hooks";
import { cpus, totalmem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createDatabase } from "../apps/api/src/database.mjs";
import { createApp } from "../apps/api/src/app.mjs";
const db = await createDatabase({ memory: true });
const app = await createApp({
  db,
  mode: "local",
  origin: "http://localhost:8081",
});
const headers = { origin: "http://localhost:8081", "x-saz-platform": "native" };
const call = (method, url, payload) =>
  app.inject({ method, url, payload, headers });
try {
  headers.authorization = `Bearer ${(await call("POST", "/auth/demo", {})).json().accessToken}`;
  const profile = (await call("GET", "/v1/snapshot")).json().profile;
  const ids = await db.admin(async (client) => {
    const source = (
      await client.query("select audio_asset_id from music.tracks limit 1")
    ).rows[0];
    const artist = (await client.query("select id from music.artists limit 1"))
      .rows[0];
    const rows = (
      await client.query(
        `insert into music.tracks(title,search_text,duration_ms,audio_asset_id,status,created_at)
      select (case when i%3=0 then 'Ýol synag ' when i%3=1 then 'Проверка ' else 'Search test ' end) || lpad(i::text,5,'0'),
      (case when i%3=0 then 'Ýol synag ' when i%3=1 then 'Проверка ' else 'Search test ' end) || lpad(i::text,5,'0'),
      24000,$1,'published',now()+interval '1 day' from generate_series(1,10000) i returning id`,
        [source.audio_asset_id],
      )
    ).rows.map((row) => row.id);
    await client.query(
      "insert into music.track_artists(track_id,artist_id,credit_role,position) select unnest($1::uuid[]),$2,'primary',0",
      [rows, artist.id],
    );
    return rows;
  });
  const snapshot = (await call("GET", "/v1/snapshot")).json();
  const samples = [];
  for (let i = 0; i < 30; i++) {
    const q = ["Ýol", "Проверка", "Search test"][i % 3];
    const start = performance.now();
    const response = await call(
      "GET",
      `/v1/search?q=${encodeURIComponent(q)}&type=track&limit=30`,
    );
    const ms = performance.now() - start;
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.length, 30);
    assert.ok(response.json().nextCursor);
    samples.push(ms);
  }
  headers["idempotency-key"] = randomUUID();
  const created = (
    await call("POST", "/v1/playlists", {
      title: "Isolated 1000 item stress fixture",
    })
  ).json();
  await db.user(profile.id, (client) =>
    client.query(
      "insert into music.playlist_items(playlist_id,user_id,track_id,position) select $1,$3,id,ordinality-1 from unnest($2::uuid[]) with ordinality as tracks(id,ordinality)",
      [created.id, ids.slice(0, 1000), profile.id],
    ),
  );
  const detailStart = performance.now();
  const detail = await call("GET", `/v1/resolve/playlist/${created.id}`);
  const detailMs = performance.now() - detailStart;
  assert.equal(detail.statusCode, 200, detail.body);
  assert.equal(detail.json().playlists[0].items.length, 1000);
  assert.equal(detail.json().tracks.length, 1000);
  const sorted = [...samples].sort((a, b) => a - b);
  const report = {
    at: new Date().toISOString(),
    fixture: {
      addedPublishedTracks: 10000,
      playlistItems: 1000,
      initialSnapshotTracks: snapshot.catalog.tracks.length,
    },
    environment: {
      node: process.version,
      cpu: cpus()[0]?.model,
      ramGiB: Math.round(totalmem() / 2 ** 30),
      database:
        "PGlite in-memory, isolated fixture; app.inject, no LAN transfer",
    },
    search: {
      samplesMs: samples,
      medianMs: sorted[14],
      p95Ms: sorted[28],
      budgetMs: 200,
      pass: sorted[28] <= 200,
      measures:
        "Server request processing only; excludes 220ms debounce, network and browser rendering",
    },
    collection: { items: 1000, resolveMs: detailMs },
    physicalPhoneFrameRate: "Not measured",
    baseline: "No matched pre-change timing; no before/after speed claim",
  };
  await mkdir("tasks/evidence/candidate", { recursive: true });
  await writeFile(
    "tasks/evidence/candidate/search-scale.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      searchP95Ms: report.search.p95Ms,
      searchServerBudgetPass: report.search.pass,
      collection1000Ms: detailMs,
    }),
  );
} catch (error) {
  console.error(error.message, error.code);
  process.exitCode = 1;
} finally {
  await app.close();
  await db.close();
}
