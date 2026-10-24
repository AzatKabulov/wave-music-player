# Owaryn — regional music app prototype

A shared iOS/Android Expo app with an original interface and a working Fastify/Postgres backend. **Owaryn is a provisional name.** No trademark/domain clearance or store publication has been performed.

The local build includes twelve original synthesized recordings, fictional artists, geometric artwork, and an original folded-path icon. No competitor audio, artwork, branding, or private API is used. Local and international repertoire use the same catalog model; the demo recordings do not establish a commercial catalog.

## Run locally

Use Node 24 and npm 11.8.0. From this folder:

```powershell
npm ci --ignore-scripts
npm --prefix apps/api ci --ignore-scripts
```

In the first terminal:

```powershell
npm run api
```

In a second terminal:

```powershell
npm run web
```

Open [the local preview](http://localhost:8081/home) and choose **Explore demo**. This creates a separate private local session. You can also register a local test account. The API binds only to `127.0.0.1:4100`; no service account or key is needed for local mode. Data persists in `apps/api/data/postgres`, which is gitignored. Local demo recovery sends no email.

For UI-only work, explicitly set `EXPO_PUBLIC_DATA_MODE=mock`. The normal default uses the real local API. Do not use mock mode to assess persistence or access control.

## What works

- Home collections, browse/search, artist/album/playlist pages.
- Native AudioPlaylist integration, mini/full player, seek, skip, shuffle/repeat, queue edits.
- Liked tracks, independent saves/follows, library filters/sorting, recent listening.
- Private playlist creation, description, rename, duplicate entries, reordering/removal, deletion confirmation, revision conflicts.
- Durable local authentication and account data; scrypt password hashing; httpOnly browser sessions; SecureStore on native.
- RLS-protected database transactions, playback leases, byte-range streaming, revocation, account deletion jobs.
- Supabase Auth/Postgres/Storage adapters and guarded operator APIs for source/upload/import/permission/publication/withdrawal.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run format:check
npx expo export --platform all --max-workers 2
```

The QA stage passed 30 browser cases, 3 queue tests, 14 API tests, 27 schema tests, and 18 design contrast pairs. Web, Android, and iOS JavaScript/Hermes exports succeeded. Browser checks exercised real API playback, seeking/skipping, saving a track, empty search, Unicode playlist creation, adding a track, and reload persistence. See [verification](replica/implementation-verification.md), [backend notes](replica/backend.md), and [feature status](replica/features.csv).

JavaScript export is **not** an APK/IPA build or a device test. This Windows machine has no Android SDK or iOS compiler. Background playback, interruption handling, Bluetooth/headphone behavior, and accessibility services still require physical-device checks.

## Native development

`app.json` configures playback-only background audio and lock-screen integration. `eas.json` contains development, preview APK, and production profiles; `expo-dev-client` is installed. Use your own Expo/Apple/Google accounts and replace `com.example.owarynmusic` with your final identifiers before creating native builds. Set `EXPO_PUBLIC_API_URL` to your own reachable HTTPS staging API for phone builds. The loopback demo backend is intentionally inaccessible from another device.

## Production configuration and limits

Put client configuration in a gitignored root `.env.local`; only `EXPO_PUBLIC_API_URL` and optional data mode belong there. Put **server** values in `apps/api/.env.local`, following its `.env.example`. Never put a Supabase secret key or database URL into an `EXPO_PUBLIC_` variable.

The backend setup procedure, database login grants, storage/email configuration, import manifest, and acceptance gaps are in [backend.md](replica/backend.md). No cloud project, SMTP sender, hosted bucket, account, paid service, DNS record, or app listing was created.

This is a bounded pilot: catalog snapshots currently load at most 100 published tracks/artists/albums/playlists, and playlist/queue snapshots accept at most 5,000 entries. Search operates on that bounded catalog. List endpoints report truncation and reject cursors; the planned signed pagination contract is still outstanding. Expand this path before loading a large commercial catalog. The first controlled import accepts canonical 16-bit PCM WAV and JSON manifests; MP3 processing, alternate quality renditions, and artwork uploads remain extensions.

Payments, offline downloads, public sharing, custom cover upload, translated UI, and advanced recommendations are outside this first build. Local SQLite currently stores installation identity; queue restoration requires the API. General production launch also requires a final brand, support/privacy details, real catalog agreements/intake, backups, monitoring, and regional connectivity probes.

The API dependency audit is clean. The Expo toolchain audit reports **five high-severity dependency entries**, covering two advisories in `node-forge` and the CLI's Zod v3 dependency. Their reachability and lack of compatible fixes are documented in [dependency review](replica/dependency-review.md). A forced downgrade of Expo was not applied. This prototype is not a production release approval.

## QA and brand follow-through

Run `npm run test:e2e` with the local web preview running and Microsoft Edge installed. The suite starts disposable in-memory QA APIs on 4101/4102 and preserves the persistent preview library. See the [four-stage progress index](replica/progress.md), [test results](replica/test-results.md), [parity](replica/parity.md), [research](replica/feedback.md), and [brand](replica/brand.md). The working identity is not final trademark clearance. Stable internal cookie/storage/header identifiers and the existing deep-link scheme remain for session compatibility; public names/assets are Owaryn. Production bundle IDs still use the example namespace and must be set for the owner before native distribution.
