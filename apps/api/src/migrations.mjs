import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../migrations/", import.meta.url);

// Run with the migration identity and a single connection. The API runtime
// roles cannot read or change this ledger. Existing 0.2 databases adopt 001.
export async function applyMigrations(client) {
  const exec = (sql) => (client.exec ? client.exec(sql) : client.query(sql));
  const files = (await readdir(root))
    .filter((name) => /^\d{3}_[a-z_]+\.sql$/.test(name))
    .sort();
  const found = await client.query(
    "select 1 from pg_namespace where nspname='music'",
  );
  if (!found.rows.length)
    await exec(await readFile(new URL(files[0], root), "utf8"));
  await exec(`create table if not exists music.schema_migrations (
    version text primary key, sha256 text not null, applied_at timestamptz not null default now()
  ); revoke all on music.schema_migrations from public, anon, authenticated, music_user, music_admin;`);
  const applied = [];
  for (const [index, file] of files.entries()) {
    const sql = await readFile(new URL(file, root), "utf8");
    const hash = createHash("sha256")
      .update(sql.replace(/\r\n/g, "\n"))
      .digest("hex");
    const previous = (
      await client.query(
        "select sha256 from music.schema_migrations where version=$1",
        [file],
      )
    ).rows[0];
    if (previous) {
      if (previous.sha256 !== hash)
        throw Error(`Migration checksum mismatch: ${file}`);
      continue;
    }
    await exec("begin");
    try {
      if (index !== 0) await exec(sql);
      await client.query(
        "insert into music.schema_migrations(version,sha256) values($1,$2)",
        [file, hash],
      );
      await exec("commit");
      applied.push(file);
    } catch (error) {
      await exec("rollback");
      throw error;
    }
  }
  return applied;
}
