import { readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_MIGRATION_URL)
  throw Error(
    "Set DATABASE_MIGRATION_URL for your own staging project. Runtime identities must be different.",
  );
const client = new pg.Client({
  connectionString: process.env.DATABASE_MIGRATION_URL,
  ssl: {
    rejectUnauthorized: true,
    ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA } : {}),
  },
});
await client.connect();
try {
  await client.query(
    await readFile(
      new URL("../migrations/001_music.sql", import.meta.url),
      "utf8",
    ),
  );
  process.stdout.write("Migration 001 applied.\n");
} finally {
  await client.end();
}
