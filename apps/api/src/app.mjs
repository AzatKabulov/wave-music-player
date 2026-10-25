import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { z, ZodError } from "zod";
import { createAuth } from "./auth.mjs";
import { catalog, palette, snapshot } from "./catalog.mjs";
import { catalogGraph, createCatalogSearch } from "./catalog-query.mjs";
import {
  entries,
  fail,
  hash,
  item,
  items,
  one,
  parseRange,
  playbackInput,
  playlistInput,
  preferenceInput,
  receipt,
  revision,
  uuid,
} from "./common.mjs";
import { createJobs } from "./jobs.mjs";
import { registerOperators } from "./operators.mjs";
import { audioRoot } from "./seed.mjs";
import { registerPersonalDownload } from "./personal-download.mjs";
import { artworkVariant } from "./artwork-variants.mjs";

export async function createApp({
  db,
  mode = "local",
  origin = "http://localhost:8081",
  baseUrl = "http://127.0.0.1:4100",
  env = process.env,
  personalTest = false,
  personalMediaRoot = new URL("../data/personal-media/", import.meta.url),
} = {}) {
  const app = Fastify({
    logger: false,
    bodyLimit: 32768,
    requestTimeout: 30000,
    trustProxy: false,
  });
  registerPersonalDownload(app, {
    enabled: personalTest && mode === "local",
    apkFile: new URL("../../../../musify-android-test.apk", import.meta.url),
  });
  await app.register(cookie);
  await app.register(cors, {
    origin,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "content-type",
      "authorization",
      "idempotency-key",
      "x-saz-platform",
      "range",
    ],
  });
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  app.addHook("onSend", async (req, reply, payload) => {
    if (!reply.hasHeader("Cache-Control"))
      reply.header("Cache-Control", "no-store");
    reply.header("Referrer-Policy", "no-referrer");
    return payload;
  });
  app.setErrorHandler((e, req, reply) => {
    const status =
      e instanceof ZodError
        ? 422
        : e.statusCode ||
          {
            40001: 409,
            23505: 409,
            23503: 422,
            23514: 422,
            22023: 422,
            P0002: 404,
            42501: 403,
          }[e.code] ||
          500;
    const message =
      e instanceof ZodError
        ? "Some request fields are invalid."
        : e.publicCode
          ? e.message
          : status === 409
            ? "This item changed. Reload before saving again."
            : status === 404
              ? "This item is unavailable."
              : status === 422
                ? "Some request values are invalid."
                : status === 413
                  ? "This request is too large."
                  : "The request could not be completed.";
    if (status >= 500)
      process.stderr.write(
        JSON.stringify({
          event: "request_failed",
          requestId: req.id,
          status,
          code: e.publicCode || e.code || "internal",
        }) + "\n",
      );
    reply.code(status).send({
      error: {
        code:
          e.publicCode ||
          (status === 409
            ? "revision_conflict"
            : status === 422
              ? "validation"
              : "request_failed"),
        message,
        requestId: req.id,
      },
    });
  });
  let auth;
  const route = (method, url, schema, handler, options = {}) =>
    app.route({
      method,
      url,
      bodyLimit: options.large ? 1048576 : 32768,
      preHandler: async (req, reply) => {
        // Browser cookie mutations require the configured Origin; native bearer requests remain independent.
        const bearer = req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null;
        if (
          !["GET", "HEAD"].includes(req.method) &&
          req.headers.origin &&
          req.headers.origin !== origin
        )
          fail(403, "origin_rejected", "This origin is not allowed.");
        if (
          !["GET", "HEAD"].includes(req.method) &&
          req.cookies.saz_access &&
          !bearer &&
          req.headers.origin !== origin
        )
          fail(
            403,
            "origin_required",
            "Open this action from the application.",
          );
        const authRoute = url.startsWith("/auth/");
        const windowMs = authRoute ? 900000 : 60000,
          key = hash(`${authRoute ? "auth" : "api"}:${req.ip}`),
          start = new Date(Math.floor(Date.now() / windowMs) * windowMs);
        const count = await db.admin(
          async (c) =>
            (
              await c.query(
                "insert into music.rate_limit_buckets(bucket_key,window_start,expires_at) values($1,$2,$3) on conflict(bucket_key,window_start) do update set requests=music.rate_limit_buckets.requests+1 returning requests",
                [key, start, new Date(start.getTime() + windowMs)],
              )
            ).rows[0].requests,
        );
        if (count > (authRoute ? (mode === "local" ? 30 : 10) : 600)) {
          reply.header("Retry-After", String(Math.ceil(windowMs / 1000)));
          fail(429, "rate_limited", "Please wait before trying again.");
        }
        req.accessToken = bearer || req.cookies.saz_access;
        req.identity = await auth?.identify(req.accessToken);
        if (!options.public && !req.identity)
          fail(401, "unauthorized", "Sign in to continue.");
        for (const [name, value] of Object.entries(req.params || {}))
          if (name !== "token" && name !== "kind") uuid.parse(value);
        if (schema) req.body = schema.parse(req.body ?? {});
      },
      handler,
    });
  auth = createAuth({ db, mode, env, route, app, origin });
  const user = (req, fn) => db.user(req.identity.id, fn);
  const getCatalog = (req) =>
    user(req, (c) => catalog(c, req.identity.id, baseUrl));
  const searchCatalog = createCatalogSearch(db, baseUrl);
  const getPlaylist = (req, id) =>
    user(req, async (c) => {
      const all = await catalog(c, req.identity.id, baseUrl),
        p = all.playlists.find((x) => x.id === id);
      if (!p) fail(404, "not_found", "This playlist is unavailable.");
      return p;
    });
  const query = z.strictObject({
    q: z.string().max(120).optional(),
    type: z.enum(["all", "track", "album", "artist", "playlist"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().max(4096).optional(),
    locale: z.string().max(35).optional(),
  });
  const page = (req, data) => {
    const q = query.parse(req.query);
    if (q.cursor)
      fail(
        422,
        "cursor_unsupported",
        "This bounded pilot API does not accept pagination cursors yet.",
      );
    return {
      data: data.slice(0, q.limit),
      nextCursor: null,
      truncated: data.length > q.limit,
    };
  };
  app.get("/health/live", () => ({ ok: true }));
  app.get("/health/ready", async () => {
    await db.admin((c) => c.query("select 1"));
    return { ok: true, mode };
  });
  route(
    "GET",
    "/v1/snapshot",
    null,
    async (req) => ({
      ...(await snapshot(db, req.identity, baseUrl)),
      demoEnabled: mode === "local",
      accountProvider: mode === "local" ? "local" : "supabase",
    }),
    { public: true },
  );
  route(
    "GET",
    "/v1/artwork/:assetId",
    null,
    async (req, reply) => {
      if (!personalTest || mode !== "local")
        fail(404, "not_found", "This artwork is unavailable.");
      const asset = await db.admin(
        async (c) =>
          (
            await c.query(
              `select storage_key,mime_type,byte_size from music.media_assets a
       where a.id=$1 and a.kind='image' and a.status='ready' and (
         exists(select 1 from music.albums al where al.cover_asset_id=a.id and al.status='published') or
         exists(select 1 from music.artists ar where ar.image_asset_id=a.id and ar.status='published'))`,
              [req.params.assetId],
            )
          ).rows[0],
      );
      if (
        !asset ||
        !/^personal\/[0-9a-f-]{36}\.(jpg|png)$/.test(asset.storage_key) ||
        !["image/jpeg", "image/png"].includes(asset.mime_type) ||
        Number(asset.byte_size) > 10485760
      )
        fail(404, "not_found", "This artwork is unavailable.");
      const width = z
        .object({ w: z.enum(["128", "320", "768"]).optional() })
        .strict()
        .parse(req.query).w;
      if (width) {
        const buffer = await artworkVariant(
          fileURLToPath(new URL(asset.storage_key.slice(9), personalMediaRoot)),
          new URL("variants/", personalMediaRoot),
          req.params.assetId,
          Number(width),
        );
        return reply
          .type("image/jpeg")
          .header("Cache-Control", "private, max-age=86400")
          .send(buffer);
      }
      return reply
        .type(asset.mime_type)
        .header("Content-Length", asset.byte_size)
        .send(
          createReadStream(
            new URL(asset.storage_key.slice(9), personalMediaRoot),
          ),
        );
    },
    { public: true },
  );
  route("GET", "/v1/me", null, (req) =>
    user(req, (c) =>
      one(
        c,
        'select user_id as id,display_name as "displayName",country_code as "countryCode" from music.profiles where user_id=$1',
        [req.identity.id],
      ),
    ),
  );
  for (const method of ["PUT", "PATCH"])
    route(
      method,
      "/v1/me",
      z.strictObject({
        displayName: z.string().trim().min(1).max(80),
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .default("TM"),
      }),
      (req) =>
        user(req, (c) =>
          one(
            c,
            'insert into music.profiles(user_id,display_name,country_code) values($1,$2,$3) on conflict(user_id) do update set display_name=$2,country_code=$3 returning user_id as id,display_name as "displayName",country_code as "countryCode"',
            [req.identity.id, req.body.displayName, req.body.countryCode],
          ),
        ),
    );
  route("GET", "/v1/home", null, async (req) => {
    const c = await getCatalog(req);
    return {
      collections: [
        {
          id: "releases",
          title: "Fresh perspectives",
          items: c.albums.map((item) => ({ kind: "album", item })),
        },
        {
          id: "editorial",
          title: "Made for a moment",
          items: c.playlists
            .filter((p) => !p.owner)
            .map((item) => ({ kind: "playlist", item })),
        },
      ],
    };
  });
  route("GET", "/v1/search", null, async (req) => {
    const q = query.parse(req.query);
    if (!q.q?.trim()) fail(422, "query_required", "Enter a search.");
    return searchCatalog(req.identity.id, q);
  });
  route("GET", "/v1/resolve/:kind/:id", null, async (req) => {
    const kind = z.enum(["album", "artist", "playlist"]).parse(req.params.kind);
    const id = uuid.parse(req.params.id);
    return user(req, (client) =>
      catalogGraph(client, req.identity.id, baseUrl, { [kind]: [id] }, true),
    );
  });
  route("GET", "/v1/search/suggestions", null, async (req) => {
    const q = query.parse(req.query);
    const c = await getCatalog(req);
    return {
      data: [
        ...new Set(
          c.tracks
            .map((t) => t.title)
            .filter(
              (x) =>
                q.q &&
                x.toLocaleLowerCase().startsWith(q.q.toLocaleLowerCase()),
            ),
        ),
      ].slice(0, 10),
    };
  });
  for (const [type, kind] of [
    ["tracks", "tracks"],
    ["albums", "albums"],
    ["artists", "artists"],
  ])
    route("GET", `/v1/${type}/:id`, null, async (req) => {
      const c = await getCatalog(req),
        value = c[kind].find((x) => x.id === req.params.id);
      if (!value) fail(404, "not_found", "This item is unavailable.");
      return value;
    });
  route("GET", "/v1/artists/:id/albums", null, async (req) =>
    page(
      req,
      (await getCatalog(req)).albums.filter(
        (a) => a.artistId === req.params.id,
      ),
    ),
  );
  route("GET", "/v1/albums/:id/tracks", null, async (req) =>
    page(
      req,
      (await getCatalog(req)).tracks.filter((t) => t.albumId === req.params.id),
    ),
  );
  route("GET", "/v1/playlists/:id", null, (req) =>
    getPlaylist(req, req.params.id),
  );
  route("GET", "/v1/playlists/:id/items", null, async (req) => {
    const p = await getPlaylist(req, req.params.id);
    return { ...page(req, p.items), revision: p.revision };
  });
  route("GET", "/v1/me/playlists", null, async (req) =>
    page(
      req,
      (await getCatalog(req)).playlists.filter((p) => p.owner),
    ),
  );
  route(
    "GET",
    "/v1/library",
    null,
    async (req) => (await snapshot(db, req.identity)).library,
  );
  route("GET", "/v1/library/tracks", null, async (req) => {
    const sn = await snapshot(db, req.identity);
    return page(
      req,
      sn.library.tracks.map(
        (id) =>
          sn.catalog.tracks.find((t) => t.id === id) || {
            id,
            available: false,
          },
      ),
    );
  });
  for (const [kind, column, target] of [
    ["tracks", "track_id", "tracks"],
    ["albums", "album_id", "albums"],
    ["artists", "artist_id", "artists"],
    ["playlists", "playlist_id", "playlists"],
  ])
    for (const method of ["PUT", "DELETE"])
      route(method, `/v1/library/${kind}/:id`, z.strictObject({}), (req) =>
        user(req, async (c) => {
          if (method === "PUT") {
            await one(c, `select id from music.${target} where id=$1`, [
              req.params.id,
            ]);
            await c.query(
              `insert into music.saved_${kind}(user_id,${column}) values($1,$2) on conflict(user_id,${column}) do nothing`,
              [req.identity.id, req.params.id],
            );
          } else
            await c.query(
              `delete from music.saved_${kind} where user_id=$1 and ${column}=$2`,
              [req.identity.id, req.params.id],
            );
          return { saved: method === "PUT" };
        }),
      );
  route("POST", "/v1/playlists", playlistInput, async (req, reply) => {
    const value = await user(req, (c) =>
      receipt(
        c,
        req,
        "playlist:create",
        async () => {
          const p = await one(
            c,
            "insert into music.playlists(user_id,title,description) values($1,$2,$3) returning id,title,description,revision",
            [req.identity.id, req.body.title, req.body.description],
          );
          return {
            ...p,
            revision: String(p.revision),
            owner: true,
            palette: palette(p.id),
            items: [],
          };
        },
        201,
      ),
    );
    reply.code(201);
    return value;
  });
  route(
    "PATCH",
    "/v1/playlists/:id",
    z.strictObject({
      expectedRevision: revision,
      title: z.string().trim().min(1).max(160).optional(),
      description: z.string().max(2000).optional(),
    }),
    (req) =>
      user(req, async (c) => {
        await one(
          c,
          "select id from music.playlists where id=$1 and user_id=$2 and kind='personal'",
          [req.params.id, req.identity.id],
        );
        const r = await c.query(
          "update music.playlists set title=coalesce($1,title),description=coalesce($2,description),revision=revision+1 where id=$3 and user_id=$4 and revision=$5 returning revision",
          [
            req.body.title ?? null,
            req.body.description ?? null,
            req.params.id,
            req.identity.id,
            req.body.expectedRevision,
          ],
        );
        if (!r.rows.length)
          fail(
            409,
            "revision_conflict",
            "This playlist changed. Reload before saving again.",
          );
        return { revision: String(r.rows[0].revision) };
      }),
  );
  route(
    "DELETE",
    "/v1/playlists/:id",
    z.strictObject({ expectedRevision: revision }),
    (req) =>
      user(req, async (c) => {
        await one(
          c,
          "select id from music.playlists where id=$1 and user_id=$2",
          [req.params.id, req.identity.id],
        );
        const r = await c.query(
          "delete from music.playlists where id=$1 and user_id=$2 and revision=$3 returning id",
          [req.params.id, req.identity.id, req.body.expectedRevision],
        );
        if (!r.rows.length)
          fail(
            409,
            "revision_conflict",
            "This playlist changed. Reload before deleting.",
          );
        return { ok: true };
      }),
  );
  route(
    "PUT",
    "/v1/playlists/:id/items",
    z.strictObject({
      expectedRevision: revision,
      items,
      title: z.string().trim().min(1).max(160).optional(),
      description: z.string().max(2000).optional(),
    }),
    (req) =>
      user(req, async (c) => {
        const r = await one(
          c,
          "select music.replace_playlist_items($1,$2,$3::jsonb) as revision",
          [
            req.params.id,
            req.body.expectedRevision,
            JSON.stringify(req.body.items),
          ],
        );
        if (req.body.title !== undefined || req.body.description !== undefined)
          await c.query(
            "update music.playlists set title=coalesce($1,title),description=coalesce($2,description) where id=$3 and user_id=$4",
            [
              req.body.title ?? null,
              req.body.description ?? null,
              req.params.id,
              req.identity.id,
            ],
          );
        return {
          revision: String(r.revision),
          itemCount: req.body.items.length,
        };
      }),
    { large: true },
  );
  route(
    "POST",
    "/v1/playlists/:id/items",
    item.extend({ expectedRevision: revision }),
    async (req) => {
      const p = await getPlaylist(req, req.params.id);
      return user(req, async (c) => {
        const r = await one(
          c,
          "select music.replace_playlist_items($1,$2,$3::jsonb) as revision",
          [
            p.id,
            req.body.expectedRevision,
            JSON.stringify([
              ...p.items,
              { id: req.body.id, trackId: req.body.trackId },
            ]),
          ],
        );
        return { revision: String(r.revision) };
      });
    },
  );
  route(
    "DELETE",
    "/v1/playlists/:id/items/:itemId",
    z.strictObject({ expectedRevision: revision }),
    async (req) => {
      const p = await getPlaylist(req, req.params.id);
      return user(req, async (c) => {
        const r = await one(
          c,
          "select music.replace_playlist_items($1,$2,$3::jsonb) as revision",
          [
            p.id,
            req.body.expectedRevision,
            JSON.stringify(p.items.filter((i) => i.id !== req.params.itemId)),
          ],
        );
        return { revision: String(r.revision) };
      });
    },
  );
  const readSession = (req, c) =>
    one(
      c,
      "select id,revision,current_queue_entry_id,position_ms,repeat_mode,shuffle from music.playback_sessions where installation_id=$1 and user_id=$2",
      [req.params.installationId, req.identity.id],
    );
  const sessionDto = async (c, s) => ({
    revision: String(s.revision),
    currentEntryId: s.current_queue_entry_id,
    positionMs: s.position_ms,
    repeatMode: s.repeat_mode,
    shuffle: s.shuffle,
    entries: (
      await c.query(
        'select id,track_id as "trackId",origin from music.queue_entries where session_id=$1 order by position',
        [s.id],
      )
    ).rows,
  });
  route("GET", "/v1/playback-sessions/:installationId", null, (req) =>
    user(req, async (c) => {
      const s = (
        await c.query(
          "select id,revision,current_queue_entry_id,position_ms,repeat_mode,shuffle from music.playback_sessions where installation_id=$1 and user_id=$2",
          [req.params.installationId, req.identity.id],
        )
      ).rows[0];
      return s ? sessionDto(c, s) : null;
    }),
  );
  const putSession = async (req) =>
    user(req, async (c) => {
      const b = req.body;
      let s;
      if (b.expectedRevision === null) {
        s = (
          await c.query(
            "insert into music.playback_sessions(user_id,installation_id) values($1,$2) on conflict(user_id,installation_id) do nothing returning *",
            [req.identity.id, req.params.installationId],
          )
        ).rows[0];
        if (!s)
          fail(
            409,
            "revision_conflict",
            "A queue already exists for this installation.",
          );
      } else {
        s = await one(
          c,
          "select * from music.playback_sessions where user_id=$1 and installation_id=$2 for update",
          [req.identity.id, req.params.installationId],
        );
        if (String(s.revision) !== b.expectedRevision)
          fail(
            409,
            "revision_conflict",
            "Your queue changed. Reload before editing.",
          );
      }
      const old = (
        await c.query(
          "select id,track_id from music.queue_entries where session_id=$1",
          [s.id],
        )
      ).rows;
      if (
        b.entries.some((e) =>
          old.some((o) => o.id === e.id && o.track_id !== e.trackId),
        )
      )
        fail(
          422,
          "identity_changed",
          "An existing queue entry cannot change its track.",
        );
      for (const e of b.entries)
        await one(
          c,
          "select t.id from music.tracks t where t.id=$1 and (not t.explicit or exists(select 1 from music.user_preferences p where p.user_id=$2 and p.explicit_allowed))",
          [e.trackId, req.identity.id],
        );
      await c.query(
        "update music.playback_sessions set current_queue_entry_id=null where id=$1",
        [s.id],
      );
      await c.query("delete from music.queue_entries where session_id=$1", [
        s.id,
      ]);
      for (const [position, e] of b.entries.entries())
        await c.query(
          "insert into music.queue_entries(id,session_id,user_id,track_id,position,origin) values($1,$2,$3,$4,$5,$6)",
          [e.id, s.id, req.identity.id, e.trackId, position, e.origin],
        );
      const next = await one(
        c,
        "update music.playback_sessions set current_queue_entry_id=$1,position_ms=$2,repeat_mode=$3,shuffle=$4,revision=revision+1 where id=$5 returning *",
        [b.currentEntryId, b.positionMs, b.repeatMode, b.shuffle, s.id],
      );
      return sessionDto(c, next);
    });
  route(
    "PUT",
    "/v1/playback-sessions/:installationId",
    playbackInput,
    putSession,
    { large: true },
  );
  route(
    "PATCH",
    "/v1/playback-sessions/:installationId",
    z.strictObject({
      expectedRevision: revision,
      currentEntryId: uuid.nullable().optional(),
      positionMs: z.int().min(0).max(7200000).optional(),
      repeatMode: z.enum(["none", "all", "single"]).optional(),
      shuffle: z.boolean().optional(),
    }),
    (req) =>
      user(req, async (c) => {
        const s = await readSession(req, c);
        const b = req.body;
        const next = await c.query(
          "update music.playback_sessions set current_queue_entry_id=$1,position_ms=$2,repeat_mode=$3,shuffle=$4,revision=revision+1 where id=$5 and revision=$6 returning *",
          [
            b.currentEntryId === undefined
              ? s.current_queue_entry_id
              : b.currentEntryId,
            b.positionMs ?? s.position_ms,
            b.repeatMode ?? s.repeat_mode,
            b.shuffle ?? s.shuffle,
            s.id,
            b.expectedRevision,
          ],
        );
        if (!next.rows.length)
          fail(409, "revision_conflict", "Your queue changed.");
        return sessionDto(c, next.rows[0]);
      }),
  );
  route(
    "POST",
    "/v1/playback-sessions/:installationId/queue",
    item.extend({ expectedRevision: revision }),
    async (req) => {
      const s = await user(req, async (c) =>
        sessionDto(c, await readSession(req, c)),
      );
      let at = Math.max(
        0,
        s.entries.findIndex((e) => e.id === s.currentEntryId) + 1,
      );
      while (s.entries[at]?.origin === "explicit") at++;
      const all = [
        ...s.entries.slice(0, at),
        { id: req.body.id, trackId: req.body.trackId, origin: "explicit" },
        ...s.entries.slice(at),
      ];
      req.body = {
        ...s,
        entries: all,
        expectedRevision: req.body.expectedRevision,
        currentEntryId: s.currentEntryId || req.body.id,
      };
      delete req.body.revision;
      return putSession(req);
    },
  );
  route(
    "PUT",
    "/v1/playback-sessions/:installationId/queue",
    z.strictObject({
      expectedRevision: revision,
      entries,
      currentEntryId: uuid.nullable(),
    }),
    async (req) => {
      const s = await user(req, async (c) =>
        sessionDto(c, await readSession(req, c)),
      );
      req.body = { ...s, ...req.body };
      delete req.body.revision;
      playbackInput.parse(req.body);
      return putSession(req);
    },
    { large: true },
  );
  route(
    "POST",
    "/v1/playback-sessions/:installationId/grants",
    z.strictObject({}),
    async (req, reply) => {
      const s = await user(req, (c) => readSession(req, c)),
        token = randomBytes(32).toString("base64url");
      // Without a validated territory resolver, production grants authorize wildcard coverage only.
      const territory = mode === "local" ? "TM" : "ZZ";
      const expires = await db.admin(async (c) => {
        await c.query(
          "update music.playback_grants set revoked_at=now() where id in (select id from music.playback_grants where user_id=$1 and session_id=$2 and revoked_at is null order by created_at desc offset 4)",
          [req.identity.id, s.id],
        );
        return one(
          c,
          "insert into music.playback_grants(user_id,session_id,token_hash,territory,expires_at) values($1,$2,$3,$4,now()+interval '24 hours') returning expires_at",
          [req.identity.id, s.id, hash(token), territory],
        );
      });
      reply.code(201);
      return {
        token,
        expiresAt: expires.expires_at,
        mediaBaseUrl: `${baseUrl}/v1/media`,
      };
    },
  );
  route(
    "DELETE",
    "/v1/playback-sessions/:installationId/grants",
    z.strictObject({}),
    async (req) => {
      const s = await user(req, (c) => readSession(req, c));
      await db.admin((c) =>
        c.query(
          "update music.playback_grants set revoked_at=now() where user_id=$1 and session_id=$2",
          [req.identity.id, s.id],
        ),
      );
      return { ok: true };
    },
  );
  const media = async (req, reply) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token))
      fail(410, "lease_expired", "This playback lease is no longer valid.");
    const asset = await db.admin(
      async (c) =>
        (
          await c.query(
            `select a.storage_key,a.mime_type,a.byte_size from music.playback_grants g
   join music.profiles p on p.user_id=g.user_id and p.state='active' join music.user_preferences pref on pref.user_id=g.user_id
   join music.queue_entries q on q.session_id=g.session_id and q.user_id=g.user_id and q.id=$2
   join music.tracks t on t.id=q.track_id join music.media_assets a on a.id=t.audio_asset_id
   where g.token_hash=$1 and g.revoked_at is null and g.expires_at>now() and (not t.explicit or pref.explicit_allowed) and music.can_stream(t.id,g.territory)`,
            [hash(req.params.token), req.params.entryId],
          )
        ).rows[0],
    );
    if (!asset)
      fail(
        410,
        "lease_expired",
        "Playback access expired or this track is unavailable.",
      );
    const size = Number(asset.byte_size),
      range = parseRange(req.headers.range, size);
    reply.header("Accept-Ranges", "bytes");
    if (!range) {
      reply.header("Content-Range", `bytes */${size}`);
      return reply.code(416).send();
    }
    reply
      .type(asset.mime_type)
      .header("Content-Length", String(range.end - range.start + 1));
    if (range.partial)
      reply
        .code(206)
        .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    if (req.method === "HEAD") return reply.send();
    if (mode === "local") {
      const personalFile =
        personalTest &&
        /^personal\/[0-9a-f-]{36}\.(wav|mp3|m4a)$/.test(asset.storage_key);
      if (!personalFile && !/^[0-9a-f-]{36}\.wav$/.test(asset.storage_key))
        fail(404, "media_missing", "The recording is unavailable.");
      return reply.send(
        createReadStream(
          personalFile
            ? new URL(asset.storage_key.slice(9), personalMediaRoot)
            : new URL(asset.storage_key, audioRoot),
          {
            start: range.start,
            end: range.end,
          },
        ),
      );
    }
    const signed = await auth.provider.storage
      .from(env.AUDIO_BUCKET)
      .createSignedUrl(asset.storage_key, 60);
    if (signed.error)
      fail(
        503,
        "storage_unavailable",
        "The recording is temporarily unavailable.",
      );
    const response = await fetch(signed.data.signedUrl, {
      headers: { Range: `bytes=${range.start}-${range.end}` },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (
      !response.ok ||
      !response.body ||
      (range.partial &&
        (response.status !== 206 ||
          response.headers.get("content-range") !==
            `bytes ${range.start}-${range.end}/${size}`))
    )
      fail(
        503,
        "storage_unavailable",
        "The recording is temporarily unavailable.",
      );
    return reply.send(Readable.fromWeb(response.body));
  };
  route(["GET", "HEAD"], "/v1/media/:token/:entryId", null, media, {
    public: true,
  });
  route(
    "GET",
    "/v1/preferences",
    null,
    async (req) => (await snapshot(db, req.identity)).preferences,
  );
  route("PATCH", "/v1/preferences", preferenceInput, (req) =>
    user(req, async (c) => {
      await c.query(
        "update music.user_preferences set explicit_allowed=coalesce($1,explicit_allowed),locale=coalesce($2,locale),library_sort=coalesce($3,library_sort) where user_id=$4",
        [
          req.body.explicitAllowed ?? null,
          req.body.locale ?? null,
          req.body.librarySort ?? null,
          req.identity.id,
        ],
      );
      return { ok: true };
    }),
  );
  route("GET", "/v1/recents", null, async (req) =>
    page(req, (await snapshot(db, req.identity)).recents),
  );
  route(
    "POST",
    "/v1/listening-events",
    z.strictObject({
      events: z
        .array(
          z.strictObject({
            id: uuid,
            trackId: uuid,
            occurredAt: z.iso.datetime(),
            playedMs: z.int().min(0).max(7200000),
          }),
        )
        .max(100),
    }),
    (req) =>
      user(req, async (c) => {
        for (const event of req.body.events) {
          const when = new Date(event.occurredAt).getTime();
          if (when < Date.now() - 604800000 || when > Date.now() + 300000)
            fail(
              422,
              "invalid_time",
              "The event time is outside the supported window.",
            );
          await c.query(
            "insert into music.listening_events(user_id,track_id,client_event_id,occurred_at,played_ms) values($1,$2,$3,$4,$5) on conflict(user_id,client_event_id) do nothing",
            [
              req.identity.id,
              event.trackId,
              event.id,
              event.occurredAt,
              event.playedMs,
            ],
          );
        }
        return { ok: true };
      }),
  );
  const jobs = createJobs({ db, mode, provider: auth.provider, env });
  app.decorate("runJobs", jobs.run);
  app.addHook("onClose", jobs.close);
  route("DELETE", "/v1/me", z.strictObject({}), async (req, reply) => {
    if (Date.now() / 1000 - req.identity.authenticatedAt > 600)
      fail(
        403,
        "reauthentication_required",
        "Sign in again before deleting your account.",
      );
    const job = await db.admin(async (c) => {
      await c.query(
        "update music.profiles set state='deleting' where user_id=$1",
        [req.identity.id],
      );
      await c.query(
        "update music.playback_grants set revoked_at=now() where user_id=$1",
        [req.identity.id],
      );
      return one(
        c,
        "insert into music.jobs(user_id,kind,dedupe_key,payload) values($1,'account_delete',$2,$3) on conflict(dedupe_key) do update set dedupe_key=excluded.dedupe_key returning id as \"jobId\",status",
        [
          req.identity.id,
          `delete:${req.identity.id}`,
          JSON.stringify({ userId: req.identity.id }),
        ],
      );
    });
    reply.code(202);
    return job;
  });
  registerOperators({ route, db, mode, env, provider: auth.provider });
  return app;
}
