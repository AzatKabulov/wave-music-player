import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { one, uuid } from "./common.mjs";
export function inspectWav(header, size) {
  if (
    header.length < 44 ||
    header.toString("ascii", 0, 4) !== "RIFF" ||
    header.toString("ascii", 8, 12) !== "WAVE" ||
    header.toString("ascii", 12, 16) !== "fmt " ||
    header.readUInt32LE(16) !== 16 ||
    header.readUInt16LE(20) !== 1 ||
    header.readUInt16LE(34) !== 16 ||
    header.toString("ascii", 36, 40) !== "data" ||
    header.readUInt32LE(4) !== size - 8 ||
    header.readUInt32LE(40) !== size - 44
  )
    throw Error("Use canonical 16-bit PCM WAV recordings.");
  const channels = header.readUInt16LE(22),
    rate = header.readUInt32LE(24),
    block = header.readUInt16LE(32),
    bytes = header.readUInt32LE(28);
  if (
    ![1, 2].includes(channels) ||
    rate < 8000 ||
    rate > 48000 ||
    block !== channels * 2 ||
    bytes !== rate * block ||
    (size - 44) % block !== 0
  )
    throw Error("Invalid PCM format.");
  const durationMs = Math.round(((size - 44) / bytes) * 1000);
  if (durationMs < 1 || durationMs > 7200000)
    throw Error("Invalid audio duration.");
  return { durationMs };
}
async function controlledRead(
  provider,
  bucket,
  asset,
  { manifest = false } = {},
) {
  const size = Number(asset.byte_size),
    max = manifest ? 1048576 : 104857600;
  if (size > max) throw Error("Asset is too large.");
  const signed = await provider.storage
    .from(bucket)
    .createSignedUrl(asset.storage_key, 60);
  if (signed.error) throw Error("Storage read failed.");
  const response = await fetch(signed.data.signedUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.body) throw Error("Storage read failed.");
  let total = 0,
    header = Buffer.alloc(0);
  const chunks = [],
    digest = createHash("sha256");
  for await (const value of response.body) {
    const chunk = Buffer.from(value);
    total += chunk.length;
    if (total > max || total > size) throw Error("Asset size mismatch.");
    digest.update(chunk);
    if (header.length < 44)
      header = Buffer.concat([header, chunk.subarray(0, 44 - header.length)]);
    if (manifest) chunks.push(chunk);
  }
  if (total !== size || digest.digest("hex") !== asset.sha256)
    throw Error("Asset integrity check failed.");
  return manifest
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : inspectWav(header, total);
}
const manifestSchema = z.strictObject({
  tracks: z
    .array(
      z.strictObject({
        externalId: z.string().min(1).max(256),
        title: z.string().trim().min(1).max(300),
        artist: z.strictObject({
          id: uuid.optional(),
          name: z.string().trim().min(1).max(240),
        }),
        album: z.strictObject({
          id: uuid.optional(),
          title: z.string().trim().min(1).max(300),
        }),
        audioAssetId: uuid,
        language: z.string().min(2).max(35),
        genre: z.string().min(1).max(100),
        explicit: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
});
export async function processImport({ db, provider, env, job }) {
  if (!provider)
    throw Error("A configured private storage provider is required.");
  const manifestAsset = await db.admin((c) =>
    one(
      c,
      "select * from music.media_assets where id=$1 and source_id=$2 and kind='evidence' and mime_type='application/json' and status in ('pending','ready')",
      [job.payload.manifestAssetId, job.source_id],
    ),
  );
  const manifest = manifestSchema.parse(
    await controlledRead(provider, env.AUDIO_BUCKET, manifestAsset, {
      manifest: true,
    }),
  );
  if (
    new Set(manifest.tracks.map((t) => t.externalId)).size !==
    manifest.tracks.length
  )
    throw Error("Duplicate source identity.");
  const validated = [];
  let total = 0;
  for (const track of manifest.tracks) {
    const asset = await db.admin((c) =>
      one(
        c,
        "select * from music.media_assets where id=$1 and source_id=$2 and kind='audio' and mime_type='audio/wav' and status in ('pending','ready')",
        [track.audioAssetId, job.source_id],
      ),
    );
    total += Number(asset.byte_size);
    if (total > 209715200) throw Error("A batch may contain at most 200 MiB.");
    try {
      validated.push({
        track,
        asset,
        info: await controlledRead(provider, env.AUDIO_BUCKET, asset),
      });
    } catch (e) {
      await db.admin((c) =>
        c.query(
          "update music.media_assets set status='quarantined' where id=$1",
          [asset.id],
        ),
      );
      throw e;
    }
    await db.admin((c) =>
      c.query(
        "update music.jobs set locked_until=now()+interval '2 minutes' where id=$1 and attempts=$2 and status='running'",
        [job.id, job.attempts],
      ),
    );
  }
  return db.admin(async (c) => {
    await one(
      c,
      "select id from music.jobs where id=$1 and attempts=$2 and status='running' and locked_until>now() for update",
      [job.id, job.attempts],
    );
    const result = [],
      artistIds = new Map(),
      albumIds = new Map();
    for (const { track, asset, info } of validated) {
      const existing = (
        await c.query(
          `select ts.id,ts.track_id,ta.artist_id,a.name artist_name,at.album_id,al.title album_title,at.track_number
        from music.track_sources ts left join music.track_artists ta on ta.track_id=ts.track_id and ta.position=0
        left join music.artists a on a.id=ta.artist_id left join music.album_tracks at on at.track_id=ts.track_id
        left join music.albums al on al.id=at.album_id where ts.source_id=$1 and ts.external_id=$2 order by at.disc_number,at.track_number limit 1`,
          [job.source_id, track.externalId],
        )
      ).rows[0];
      const artistId =
          track.artist.id ||
          artistIds.get(track.artist.name) ||
          (existing?.artist_name === track.artist.name
            ? existing.artist_id
            : null) ||
          randomUUID(),
        albumId =
          track.album.id ||
          albumIds.get(track.album.title) ||
          (existing?.album_title === track.album.title
            ? existing.album_id
            : null) ||
          randomUUID();
      artistIds.set(track.artist.name, artistId);
      albumIds.set(track.album.title, albumId);
      await c.query(
        "insert into music.artists(id,name,search_text) values($1,$2,$2) on conflict(id) do nothing",
        [artistId, track.artist.name],
      );
      await c.query(
        "insert into music.albums(id,title,search_text) values($1,$2,$2) on conflict(id) do nothing",
        [albumId, track.album.title],
      );
      const trackId = existing?.track_id || randomUUID();
      await c.query(
        "update music.media_assets set status='ready' where id=$1",
        [asset.id],
      );
      await c.query(
        "insert into music.tracks(id,title,search_text,duration_ms,explicit,language_code,genres,audio_asset_id) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do update set title=$2,search_text=$3,duration_ms=$4,explicit=$5,language_code=$6,genres=$7,audio_asset_id=$8,status='draft'",
        [
          trackId,
          track.title,
          `${track.title} ${track.artist.name} ${track.album.title}`,
          info.durationMs,
          track.explicit,
          track.language,
          [track.genre],
          asset.id,
        ],
      );
      await c.query("delete from music.track_artists where track_id=$1", [
        trackId,
      ]);
      await c.query(
        "insert into music.track_artists(track_id,artist_id) values($1,$2)",
        [trackId, artistId],
      );
      await c.query("delete from music.album_tracks where track_id=$1", [
        trackId,
      ]);
      await c.query(
        "insert into music.album_tracks(album_id,track_id,track_number) select $1,$2,coalesce($3,max(track_number)+1,1) from music.album_tracks where album_id=$1",
        [
          albumId,
          trackId,
          existing?.album_id === albumId ? existing.track_number : null,
        ],
      );
      const source = await one(
        c,
        "insert into music.track_sources(track_id,source_id,external_id) values($1,$2,$3) on conflict(source_id,external_id) do update set external_id=excluded.external_id returning id",
        [trackId, job.source_id, track.externalId],
      );
      result.push({
        trackId,
        trackSourceId: source.id,
        artistId,
        albumId,
        status: "draft",
      });
    }
    return result;
  });
}
