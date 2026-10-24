# Backend implementation and staging handoff

2026-10-24. Source: `../music-app/apps/api`. This phase delivered a working persistent local backend and production adapters. Production provider behavior has not been exercised because no user-owned project/configuration was supplied.

## Delivered boundaries

Fastify 5.12.7, Zod 4.6.7, pg 8.23.1, Supabase JS 2.118.0, PGlite 0.5.11. The API is an independent npm package with its own lockfile; both installation boundaries disable dependency lifecycle scripts in `.npmrc`.

The migration is copied verbatim from `schema.sql` into `apps/api/migrations/001_music.sql`. Local mode supplies a minimal `auth.users` fixture plus a private `local_auth` schema, seeds only original recordings, and persists the Postgres engine on disk. Local sessions are opaque random credentials stored only as SHA-256 hashes; passwords use scrypt with unique salts. No local Auth tables are created on Supabase.

Production mode uses two distinct restricted pg pools. Startup rejects superuser/BYPASSRLS logins and a listener login that is a member of the admin role. Each request's verified subject is set transaction-locally on the same checked-out connection after `SET LOCAL ROLE music_user`; rollback/release happen on that connection. Operator/worker operations use `music_admin` explicitly. Native clients never receive database credentials or access to the private schema.

Supabase identities are verified with `getUser(accessToken)`. Password/signup/recovery/refresh/OTP operations use fresh SDK clients; the privileged Storage/admin client never holds a listener session. Native access/refresh credentials use SecureStore; web uses httpOnly, sameSite=strict cookies (secure outside loopback). Global sign-out revokes media leases and records an application token cutoff as well as calling the provider. Fresh authentication is required before account deletion or password change.

The client serializes membership and cursor commands. Queue membership is committed before native receives changed source URIs; cursor-only changes use PATCH. Failed/conflicting commands reconcile the acknowledged server queue paused. Stable queue and playlist item IDs allow duplicate tracks. Creates have atomic idempotency receipts; playlist/queue edits enforce expected revisions. Remaining receipt coverage is listed below.

## Managed setup — user-owned services

1. Create your Supabase staging project and private audio bucket. Keep `music` out of the Data API exposed-schema list. Enable/verify database backups and restore testing in your chosen plan.
2. Put the migration connection URL in `DATABASE_MIGRATION_URL` and run `npm run migrate` from `apps/api`. Run migration 001 once on a fresh project. It deliberately fails instead of overwriting an existing schema. Migration credentials are not runtime credentials.
3. Provision separate server login roles with `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`. Grant `music_user` only to the listener login, and `music_admin` only to the operator/worker login. Do not give either role table ownership, Auth schema write permissions, or both memberships. Put their TLS connection URLs in `DATABASE_USER_URL` and `DATABASE_ADMIN_URL`; use a verified CA chain (`DATABASE_SSL_CA` if needed).
4. Configure `APP_MODE=supabase`, your HTTPS `APP_ORIGIN` and `API_PUBLIC_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AUDIO_BUCKET`, and a strong final native identity. These are server env values; the app receives only its public API URL.
5. Enable email confirmation and configure your own SMTP sender in Supabase. Use an allowlisted Universal/App Link or HTTPS callback ending in `/callback`. Configure confirmation/recovery templates to send the one-time `token_hash` and type to that callback; `AUTH_RECOVERY_REDIRECT` must match your allowlist. The app verifies that link, replaces the URL, and shows password reset for recovery. Test expired, reused, and cancelled links and email delivery before accepting real users.
6. Put verified operator UUIDs in `OPERATOR_USER_IDS`; enroll MFA. Operator routes require an allowlisted verified identity, `aal2`, and a recent access session. Listener clients have no operator controls. This gate has not been tested against an actual provider MFA session.
7. Run the API in one always-on process initially, configure HTTPS and explicit CORS origin, and test `/health/live` and `/health/ready`. Redact media lease paths from host/reverse-proxy logs. Install job failure alerts and retain only sanitized operational events. Tune shared IP limits after regional/NAT probes.
8. Set the mobile `EXPO_PUBLIC_API_URL` to staging, create your own development builds, then run native acceptance on iOS and Android in the target market.

No service sign-up, key entry, deployment, SMTP send, or hosted migration was performed here.

## Playback and storage

An owned installation receives at most five active random 24-hour media leases; only token hashes are stored. Every GET/HEAD/range read checks active profile, lease expiry/revocation, queue/session ownership, explicit preference, ready audio, active source, and a current permission record. The API supports single byte ranges, suffix ranges, 206 and 416, and streaming backpressure. Invalid or withdrawn access returns a generic expired/unavailable response. Buffered audio cannot be recalled.

Local mode uses the explicit test territory TM and original WAV fixtures. Production without a trusted location resolver uses `ZZ`, so only wildcard content coverage matches. The user's profile or country header never grants territory access. A restricted-territory catalog needs a validated server-side territory resolver before launch. This delivery path is access control, not DRM.

Production signs short-lived internal Storage reads and proxies them; the native playlist retains stable API media URLs. Native 24-hour renewal, background queue advance, network recovery, and seeking against actual hosted storage still require staging/device evidence.

## Controlled catalog intake

There are eight guarded operator routes corresponding to source creation, upload preparation, import submission/status, permission review, publication, Home curation, and withdrawal. No arbitrary URL fetch or competitor API adapter exists.

The first import format is deliberately narrow: canonical RIFF/WAVE, PCM format 1, 16-bit mono/stereo, 8–48 kHz; no extra WAV chunks. Validation checks declared bytes, SHA-256, RIFF/data lengths, sample/block alignment, and decoded duration. A JSON manifest is at most 1 MiB, 20 tracks, and 200 MiB total audio. Audio is streamed during integrity checking; only its header is retained. Bad audio is quarantined. Asset upload MIME/size claims do not make an asset ready.

Prepare an audio upload ticket (`kind=audio`, `mimeType=audio/wav`) and one JSON manifest ticket (`kind=evidence`, `mimeType=application/json`) against an active source. Upload those exact bytes to their scoped URLs, then submit the manifest asset ID and stable supplier batch ID. Manifest example:

```json
{
  "tracks": [{
    "externalId": "your-stable-source-track-id",
    "title": "An original release",
    "artist": {"name": "Your supplied artist"},
    "album": {"title": "Your supplied release"},
    "audioAssetId": "REPLACE_WITH_UPLOADED_ASSET_UUID",
    "language": "tk",
    "genre": "Instrumental",
    "explicit": false
  }]
}
```

Existing artist/album UUIDs can be supplied to preserve identities across batches. Imports create/update draft tracks and return track/source/artist/album IDs in the job result. An operator records applicable permission evidence, then publishes. Publication validates processed audio, credits, mappings, and an active permission. Withdrawal disables fresh media access synchronously and queues cleanup. MP3 processing, image decoding/upload, feeds from actual suppliers, and production storage jobs are not yet verified.

Jobs use durable Postgres rows, leases, retries, fencing by attempt, maximum five attempts, and explicit failed status. Account deletion immediately blocks the profile/revokes media, then deletes the Auth user and cascades owned data. A fifth-attempt crash is terminalized; housekeeping runs even when no job is queued. Listening events/audit cutoffs expire after 90 days; receipts/rate buckets/grants/sessions use their own expiry. Failed deletion jobs require operator attention; backups need a documented expiry policy.

## Security checklist

- [x] Environment examples contain names only; secrets excluded from Git/client bundles.
- [x] Every JSON mutation uses strict runtime validation, bounded bodies, parameterized SQL.
- [x] Listener authorization plus RLS; independent two-user isolation tests.
- [x] Cookie origin checks, security headers, generic errors, no URL/body/token logging.
- [x] Shared database rate buckets: local auth 30/15 min, production auth 10/15 min; API 600/min per IP. Tune for regional shared IPs before launch.
- [x] Local password hashing and session/sign-out tests; production SDK adapters use official APIs.
- [x] Range/lease/revocation tests and account erasure tests.
- [x] Dependency audits run; API audit has zero advisories.
- [ ] Real managed login grants, RLS concurrency, private Storage permissions, SMTP/OTP delivery, and MFA session validation.
- [ ] Native transport, background/interruption/device route tests and regional probes.
- [ ] Production privacy/support pages, processor agreements, backup restore, alert destinations.
- [ ] Upstream Expo toolchain advisories resolved or reviewed before release.

Payments, webhooks, offline entitlements, and third-party analytics are absent because the approved first slice deferred them; no unverified payment provider was enabled.

## Contract differences and remaining work

The 54-route architecture remains the target contract. Handlers exist for its route families, with an additional bounded `/v1/snapshot` and `/auth/*` gateway for the pilot. Implemented DTOs match the mobile `MusicData` interface, not every proposed architecture DTO. Artist/album/playlist metadata is denormalized for the pilot. List responses are bounded/truncating and reject cursors; signed pagination and full-catalog server search are outstanding. Artist following uses the saved-artists library route.

Create-playlist receipts and CAS edits are tested. Operator upload preparation and some CAS/operator mutations do not yet implement the complete planned receipt/replay contract. Do not advertise blanket exactly-once semantics. UI recovery retries can require reload after a conflict. No undo stack or offline mutation outbox is implemented.

The backend source uses modern ESM JavaScript with Zod runtime boundaries; the mobile app is strict TypeScript. This is an implementation-language deviation from the original all-TypeScript API suggestion. Original migration and RLS remain unchanged. Browser/native exports are not evidence of hosted service behavior or production readiness.

Official implementation references: [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [Supabase verified user lookup](https://supabase.com/docs/reference/javascript/auth-getuser), [PGlite persistence](https://pglite.dev/docs/). All read on 2026-10-24.
