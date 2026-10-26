import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/database.mjs";
import { applyMigrations } from "../src/migrations.mjs";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { seedLocal } from "../src/seed.mjs";

test("an existing 001 database keeps its accounts, saved tracks and playlist entry IDs", async () => {
  const raw = new PGlite();
  await raw.waitReady;
  try {
    await raw.exec(
      "create schema auth;create table auth.users(id uuid primary key);create role anon nologin;create role authenticated nologin;",
    );
    await raw.exec(
      await readFile(
        new URL("../migrations/001_music.sql", import.meta.url),
        "utf8",
      ),
    );
    await seedLocal(raw);
    const owner = "10000000-0000-4000-8000-000000000999";
    const track = (await raw.query("select id from music.tracks limit 1"))
      .rows[0].id;
    await raw.query(
      "insert into music.saved_tracks(user_id,track_id) values($1,$2)",
      [owner, track],
    );
    const entries = (
      await raw.query(
        "select id,track_id,playlist_id,position from music.playlist_items order by id",
      )
    ).rows;
    await applyMigrations(raw);
    assert.deepEqual(
      (
        await raw.query(
          "select id,track_id,playlist_id,position from music.playlist_items order by id",
        )
      ).rows,
      entries,
    );
    assert.equal(
      (
        await raw.query(
          "select track_id from music.saved_tracks where user_id=$1",
          [owner],
        )
      ).rows[0].track_id,
      track,
    );
    assert.equal(
      (await raw.query("select count(*)::int n from music.profiles")).rows[0].n,
      1,
    );
  } finally {
    await raw.close();
  }
});

test("catalog upgrades preserve identities, distinguish fixtures, and run once", async () => {
  const db = await createDatabase({ memory: true });
  try {
    const before = (
      await db.raw.query("select id, title from music.tracks order by id")
    ).rows;
    assert.equal(before.length, 12);
    const migrated = (
      await db.raw.query(
        "select content_kind, explicit_state from music.tracks",
      )
    ).rows;
    assert.ok(migrated.every((row) => row.content_kind === "fixture"));
    assert.ok(
      migrated.every((row) =>
        ["unknown", "explicit"].includes(row.explicit_state),
      ),
    );
    const releases = (
      await db.raw.query("select release_type, completeness from music.albums")
    ).rows;
    assert.ok(
      releases.every(
        (row) =>
          row.release_type === "unknown" && row.completeness === "unknown",
      ),
    );
    assert.deepEqual(await applyMigrations(db.raw), []);
    assert.deepEqual(
      (await db.raw.query("select id, title from music.tracks order by id"))
        .rows,
      before,
    );
    const versions = (
      await db.raw.query(
        "select version from music.schema_migrations order by version",
      )
    ).rows;
    assert.deepEqual(
      versions.map((row) => row.version),
      ["001_music.sql", "002_catalog_metadata.sql"],
    );
    await assert.rejects(
      () =>
        db.user("10000000-0000-4000-8000-000000000999", (client) =>
          client.query("select * from music.schema_migrations"),
        ),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

test("migration history detects edited historical SQL instead of silently replaying", async () => {
  const db = await createDatabase({ memory: true });
  try {
    await db.raw.query(
      "update music.schema_migrations set sha256=repeat('0',64) where version='002_catalog_metadata.sql'",
    );
    await assert.rejects(() => applyMigrations(db.raw), /checksum/i);
    assert.equal(
      (await db.raw.query("select count(*)::int as n from music.tracks"))
        .rows[0].n,
      12,
    );
  } finally {
    await db.close();
  }
});
