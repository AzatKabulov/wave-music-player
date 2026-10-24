import { createHash } from "node:crypto";
import { z } from "zod";
export const uuid = z.uuid(),
  revision = z
    .string()
    .regex(/^(0|[1-9][0-9]{0,18})$/)
    .refine((x) => BigInt(x) <= 9223372036854775807n);
export const item = z.strictObject({ id: uuid, trackId: uuid });
export const entry = item.extend({ origin: z.enum(["context", "explicit"]) });
export const items = z
  .array(item)
  .max(5000)
  .refine(
    (xs) => new Set(xs.map((x) => x.id)).size === xs.length,
    "Duplicate item identity",
  );
export const entries = z
  .array(entry)
  .max(5000)
  .refine(
    (xs) => new Set(xs.map((x) => x.id)).size === xs.length,
    "Duplicate entry identity",
  );
export const playlistInput = z.strictObject({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).default(""),
});
export const preferenceInput = z.strictObject({
  explicitAllowed: z.boolean().optional(),
  locale: z.string().min(2).max(35).optional(),
  librarySort: z.enum(["recent", "title", "creator"]).optional(),
});
export const playbackInput = z
  .strictObject({
    expectedRevision: revision.nullable(),
    entries,
    currentEntryId: uuid.nullable(),
    positionMs: z.int().min(0).max(7200000),
    repeatMode: z.enum(["none", "all", "single"]),
    shuffle: z.boolean(),
  })
  .refine(
    (s) =>
      s.currentEntryId === null
        ? s.entries.length === 0
        : s.entries.some((e) => e.id === s.currentEntryId),
    "Current entry must belong to queue",
  );
export const hash = (x) => createHash("sha256").update(x).digest("hex");
export const fail = (status, code, message) => {
  throw Object.assign(Error(message), { statusCode: status, publicCode: code });
};
export async function one(c, sql, params = []) {
  const row = (await c.query(sql, params)).rows[0];
  if (!row) fail(404, "not_found", "This item is unavailable.");
  return row;
}
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export async function receipt(c, req, scope, fn, status = 200) {
  const key = uuid.parse(req.headers["idempotency-key"]),
    digest = hash(JSON.stringify(canonical(req.body)));
  const inserted = (
    await c.query(
      "insert into music.operation_receipts(user_id,scope,request_key,request_hash) values($1,$2,$3,$4) on conflict(user_id,scope,request_key) do nothing returning id",
      [req.identity.id, scope, key, digest],
    )
  ).rows[0];
  if (!inserted) {
    const existing = await one(
      c,
      "select request_hash,state,response_body from music.operation_receipts where user_id=$1 and scope=$2 and request_key=$3 for update",
      [req.identity.id, scope, key],
    );
    if (existing.request_hash !== digest)
      fail(
        422,
        "idempotency_mismatch",
        "This request key was already used for a different action.",
      );
    if (existing.state !== "succeeded")
      fail(409, "in_flight", "This action is still being processed.");
    return existing.response_body;
  }
  const value = await fn();
  await c.query(
    "update music.operation_receipts set state='succeeded',response_status=$1,response_body=$2 where id=$3",
    [status, JSON.stringify(value), inserted.id],
  );
  return value;
}
export function parseRange(value, size) {
  if (!value) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    return null;
  return { start, end, partial: true };
}
