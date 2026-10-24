import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function verifySchema(PGlite) {
  const root = new URL('../', import.meta.url);
  const schema = await readFile(new URL('schema.sql', root), 'utf8');
  const tests = await readFile(new URL('tests/schema.test.sql', root), 'utf8');
  const db = new PGlite();
  try {
    // Minimal provider boundary for a disposable DB, never a real Auth project.
    await db.exec(`create schema auth; create table auth.users(id uuid primary key);
      create role anon nologin; create role authenticated nologin;`);
    await db.exec(schema);
    const result = await db.exec(tests);
    const rows = result.flatMap(item => item.rows ?? []).filter(row => row.test_name);
    const version = (await db.query('select version() as version')).rows[0].version;
    const report = {
      engine: 'PGlite 0.5.11 (PostgreSQL WASM)', postgresVersion: version,
      schemaSha256: createHash('sha256').update(schema).digest('hex'),
      testsSha256: createHash('sha256').update(tests).digest('hex'),
      passed: rows.length, tests: rows.map(row => row.test_name),
      limitations: [
        'Provider auth.users and anon/authenticated roles are a minimal local fixture; real authentication is not exercised.',
        'No Supabase deployment, storage, network, concurrent clients, or native playback was exercised.'
      ]
    };
    await writeFile(new URL('schema-validation.json', root), JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally { await db.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { PGlite } = await import('@electric-sql/pglite');
    process.stdout.write(JSON.stringify(await verifySchema(PGlite), null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
