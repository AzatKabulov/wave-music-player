import { z } from "zod";
import { fail, one, uuid } from "./common.mjs";
export function registerOperators({ route, db, mode, env, provider }) {
  const operator = (req) => {
    const allowed = (env.OPERATOR_USER_IDS || "").split(",");
    if (
      mode !== "supabase" ||
      !allowed.includes(req.identity.id) ||
      req.identity.claims?.aal !== "aal2" ||
      Date.now() / 1000 - req.identity.claims.iat > 900
    )
      fail(
        403,
        "operator_required",
        "A recent operator session with MFA is required.",
      );
  };
  const admin = (req, fn) => {
    operator(req);
    return db.admin(fn);
  };
  route(
    "POST",
    "/v1/admin/catalog-sources",
    z.strictObject({
      name: z.string().trim().min(1).max(160),
      kind: z.enum(["direct", "supplier", "test"]),
      agreementRef: z.string().max(1000).optional(),
    }),
    (req) =>
      admin(req, (c) =>
        one(
          c,
          "insert into music.catalog_sources(name,kind,agreement_ref) values($1,$2,$3) returning id,name,kind,status",
          [req.body.name, req.body.kind, req.body.agreementRef || null],
        ),
      ),
  );
  route(
    "POST",
    "/v1/admin/imports",
    z.strictObject({
      sourceId: uuid,
      manifestAssetId: uuid,
      supplierBatchId: z.string().min(1).max(160),
    }),
    (req) =>
      admin(req, async (c) => {
        await one(
          c,
          "select id from music.media_assets where id=$1 and source_id=$2 and kind='evidence' and mime_type='application/json'",
          [req.body.manifestAssetId, req.body.sourceId],
        );
        return one(
          c,
          "insert into music.jobs(source_id,kind,dedupe_key,payload) values($1,'catalog_import',$2,$3) on conflict(dedupe_key) do update set dedupe_key=excluded.dedupe_key returning id as \"jobId\",status",
          [
            req.body.sourceId,
            `import:${req.body.sourceId}:${req.body.supplierBatchId}`,
            JSON.stringify(req.body),
          ],
        );
      }),
  );
  route("GET", "/v1/admin/imports/:id", null, (req) =>
    admin(req, (c) =>
      one(
        c,
        'select id as "jobId",status,kind,attempts,created_at as "createdAt",last_error_code as "lastErrorCode",payload->\'result\' as result from music.jobs where id=$1 and kind=\'catalog_import\'',
        [req.params.id],
      ),
    ),
  );
  route(
    "POST",
    "/v1/admin/tracks/:id/permissions",
    z.strictObject({
      trackSourceId: uuid,
      territory: z.string().regex(/^(\*|[A-Z]{2})$/),
      allowStream: z.boolean(),
      allowDownload: z.literal(false),
      validFrom: z.iso.datetime(),
      validUntil: z.iso.datetime().optional(),
      evidenceRef: z.string().trim().min(1).max(1000),
    }),
    (req) =>
      admin(req, async (c) => {
        await one(
          c,
          "select id from music.track_sources where id=$1 and track_id=$2",
          [req.body.trackSourceId, req.params.id],
        );
        const b = req.body;
        return one(
          c,
          "insert into music.content_permissions(track_source_id,territory,allow_stream,allow_download,valid_from,valid_until,evidence_ref,status) values($1,$2,$3,false,$4,$5,$6,'active') returning id,status",
          [
            b.trackSourceId,
            b.territory,
            b.allowStream,
            b.validFrom,
            b.validUntil || null,
            b.evidenceRef,
          ],
        );
      }),
  );
  route(
    "PATCH",
    "/v1/admin/tracks/:id/status",
    z.strictObject({ status: z.enum(["draft", "published", "withdrawn"]) }),
    (req) =>
      admin(req, async (c) => {
        if (req.body.status === "published") {
          await one(
            c,
            `select t.id from music.tracks t join music.media_assets a on a.id=t.audio_asset_id and a.status='ready' and a.kind='audio'
    where t.id=$1 and exists(select 1 from music.track_artists ta where ta.track_id=t.id) and exists(select 1 from music.track_sources ts join music.content_permissions p on p.track_source_id=ts.id where ts.track_id=t.id and p.status='active' and p.allow_stream and p.valid_from<=now() and (p.valid_until is null or p.valid_until>now()))`,
            [req.params.id],
          );
          await c.query(
            "update music.artists set status='published' where id in (select artist_id from music.track_artists where track_id=$1)",
            [req.params.id],
          );
          await c.query(
            "update music.albums set status='published' where id in (select album_id from music.album_tracks where track_id=$1)",
            [req.params.id],
          );
        }
        return one(
          c,
          "update music.tracks set status=$1 where id=$2 returning id,status",
          [req.body.status, req.params.id],
        );
      }),
  );
  route(
    "PUT",
    "/v1/admin/home/:id",
    z.strictObject({
      title: z.string().trim().min(1).max(160),
      locale: z.string().min(2).max(35),
      position: z.int().min(0),
      isPublished: z.boolean(),
      items: z
        .array(
          z.strictObject({
            kind: z.enum(["track", "album", "artist", "playlist"]),
            id: uuid,
          }),
        )
        .max(100),
    }),
    (req) =>
      admin(req, async (c) => {
        const b = req.body;
        await c.query(
          "insert into music.home_collections(id,title,locale,position,is_published) values($1,$2,$3,$4,$5) on conflict(id) do update set title=$2,locale=$3,position=$4,is_published=$5",
          [req.params.id, b.title, b.locale, b.position, b.isPublished],
        );
        await c.query(
          "delete from music.home_collection_items where collection_id=$1",
          [req.params.id],
        );
        for (const [i, item] of b.items.entries()) {
          const table = {
            track: "tracks",
            album: "albums",
            artist: "artists",
            playlist: "playlists",
          }[item.kind];
          await one(
            c,
            `select id from music.${table} where id=$1 and ${item.kind === "playlist" ? "kind='editorial' and is_published" : "status='published'"}`,
            [item.id],
          );
          await c.query(
            `insert into music.home_collection_items(collection_id,${item.kind}_id,position) values($1,$2,$3)`,
            [req.params.id, item.id, i],
          );
        }
        return { id: req.params.id };
      }),
  );
  route(
    "POST",
    "/v1/admin/uploads",
    z.strictObject({
      sourceId: uuid,
      kind: z.enum(["audio", "evidence"]),
      mimeType: z.enum(["audio/wav", "application/json"]),
      byteSize: z.int().positive().max(104857600),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    async (req) => {
      operator(req);
      const b = req.body;
      if (
        (b.kind === "evidence" && b.mimeType !== "application/json") ||
        (b.kind === "audio" && b.mimeType !== "audio/wav") ||
        (b.kind === "evidence" && b.byteSize > 1048576)
      )
        fail(
          422,
          "unsupported_asset",
          "Use PCM WAV audio or a JSON manifest of at most 1 MiB.",
        );
      const asset = await db.admin(async (c) => {
        await one(
          c,
          "select id from music.catalog_sources where id=$1 and status='active'",
          [b.sourceId],
        );
        return one(
          c,
          "insert into music.media_assets(source_id,kind,storage_key,mime_type,byte_size,sha256) values($1,$2,gen_random_uuid()::text,$3,$4,$5) returning id,storage_key",
          [b.sourceId, b.kind, b.mimeType, b.byteSize, b.sha256],
        );
      });
      const ticket = await provider.storage
        .from(env.AUDIO_BUCKET)
        .createSignedUploadUrl(asset.storage_key, { upsert: false });
      if (ticket.error)
        fail(503, "storage_unavailable", "Upload preparation failed.");
      return {
        assetId: asset.id,
        uploadUrl: ticket.data.signedUrl,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
    },
  );
  route(
    "POST",
    "/v1/admin/withdrawals",
    z.strictObject({
      trackIds: z.array(uuid).min(1).max(1000),
      reasonCode: z.string().min(1).max(100),
      evidenceRef: z.string().max(1000).optional(),
    }),
    (req) =>
      admin(req, async (c) => {
        await c.query(
          "update music.tracks set status='withdrawn' where id=any($1::uuid[])",
          [req.body.trackIds],
        );
        return one(
          c,
          "insert into music.jobs(kind,dedupe_key,payload) values('catalog_withdrawal',gen_random_uuid()::text,$1) returning id as \"jobId\",status",
          [JSON.stringify({ reasonCode: req.body.reasonCode })],
        );
      }),
  );
}
