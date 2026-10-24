import { PGlite } from "@electric-sql/pglite";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { seedLocal } from "./seed.mjs";
const migration = new URL("../migrations/001_music.sql", import.meta.url);
export async function createDatabase({
  mode = "local",
  memory = false,
  personalTest = false,
  env = process.env,
} = {}) {
  if (mode === "local") {
    const location = fileURLToPath(
      new URL(
        personalTest ? "../data/personal-postgres" : "../data/postgres",
        import.meta.url,
      ),
    );
    if (!memory) await mkdir(location, { recursive: true });
    const raw = new PGlite(memory ? undefined : location);
    await raw.waitReady;
    const found = await raw.query(
      "select 1 from pg_namespace where nspname='music'",
    );
    if (!found.rows.length) {
      await raw.exec(
        "create schema auth;create table auth.users(id uuid primary key);create role anon nologin;create role authenticated nologin;",
      );
      await raw.exec(await readFile(migration, "utf8"));
      await raw.exec(`create schema local_auth;
    create table local_auth.users(user_id uuid primary key references auth.users(id) on delete cascade,email text unique,password_hash text);
    create table local_auth.sessions(token_hash text primary key,user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null,created_at timestamptz not null default now());
    create index local_session_user_idx on local_auth.sessions(user_id);`);
      await seedLocal(raw);
    }
    const tx = (role, user, fn) =>
      raw.transaction(async (client) => {
        await client.exec(`set local role ${role}`);
        if (user)
          await client.query(
            "select set_config('request.jwt.claims',$1,true)",
            [JSON.stringify({ sub: user })],
          );
        return fn(client);
      });
    return {
      mode,
      raw,
      user: (id, fn) => tx("music_user", id, fn),
      admin: (fn) => tx("music_admin", null, fn),
      system: (fn) => raw.transaction(fn),
      close: () => raw.close(),
    };
  }
  if (mode !== "supabase") throw Error("APP_MODE must be local or supabase");
  if (!env.DATABASE_USER_URL || !env.DATABASE_ADMIN_URL)
    throw Error("Both restricted database connection URLs are required");
  const ssl = {
    rejectUnauthorized: true,
    ...(env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : {}),
  };
  const userPool = new pg.Pool({
    connectionString: env.DATABASE_USER_URL,
    ssl,
    max: 8,
    connectionTimeoutMillis: 10000,
  });
  const adminPool = new pg.Pool({
    connectionString: env.DATABASE_ADMIN_URL,
    ssl,
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  for (const [pool, role] of [
    [userPool, "music_user"],
    [adminPool, "music_admin"],
  ]) {
    const {
      rows: [r],
    } = await pool.query(
      "select rolsuper,rolbypassrls,pg_has_role(current_user,$1,'MEMBER') as allowed,pg_has_role(current_user,'music_admin','MEMBER') as admin from pg_roles where rolname=current_user",
      [role],
    );
    if (
      !r ||
      r.rolsuper ||
      r.rolbypassrls ||
      !r.allowed ||
      (role === "music_user" && r.admin)
    )
      throw Error("Unsafe database login role configuration");
  }
  const tx = async (pool, role, id, fn) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${role}`);
      if (id)
        await client.query("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify({ sub: id }),
        ]);
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  };
  return {
    mode,
    user: (id, fn) => tx(userPool, "music_user", id, fn),
    admin: (fn) => tx(adminPool, "music_admin", null, fn),
    close: () => Promise.all([userPool.end(), adminPool.end()]),
  };
}
