import pg from "pg";
import { applyMigrations } from "./migrations.mjs";
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
  const applied = await applyMigrations(client);
  process.stdout.write(
    applied.length
      ? `Applied: ${applied.join(", ")}\n`
      : "Database is current.\n",
  );
} finally {
  await client.end();
}
