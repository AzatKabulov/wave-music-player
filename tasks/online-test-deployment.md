# Musify online personal test — 2026-10-27

**Deferred by the owner:** “we will do deployment later let's stick with improvement firsty.” Stop hosting setup, source uploads, credential collection and new remote services. Resume the improvement plan and the uncommitted V19.2 player-context slice. Pending GitHub sign-in / Supabase credential questions are no longer required now. Retain the free project and prepared files as a checkpoint; do not claim deployment is live.

## Scope and authorization

The owner authorized a PC-independent Expo Go preview with an online backend and music storage. Free plans only; personal testing by the owner; the existing 58 recordings; no public launch, store submission or payments. Keep the accepted 0.2.4 player direction and preserve local accounts, saved music, playlist and queue IDs.

The owner confirmed Supabase organization **kabulov** (`sgsgxcjvhejgdykjsptb`) and Render workspace **Musify** (`tea-dbg50k0m7kps73be4sc0`). Both integrations are connected. Expo CLI confirms the existing `azatkabulov` account.

## Created online

- Supabase project **musify-personal-test**, ref `dhsykpogvbnapgcforkd`, Singapore, healthy. Quoted project cost: **$0/month**.
- API URL: `https://dhsykpogvbnapgcforkd.supabase.co` — this is the Supabase platform URL, NOT Musify's application API URL.
- Application migrations 001–004 applied through Supabase. A separate runtime migration ledger contains the original file checksums, with application roles denied access and RLS enabled.
- Security advisor returned no findings after application migrations. No local database, accounts or recordings have been uploaded yet.
- No Render service or Git remote has been created. No EAS Update has been published. No replacement online APK has been submitted.
- After adding the private runtime ledger, the security advisor reports one **INFO** notice: `music.schema_migrations` has RLS enabled without an application policy. This is intentional fail-closed behavior: all application-role grants are revoked and only the migration owner accesses it. No ERROR or WARN findings. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Prepared code

- `render.yaml`: free Node 24 API, Singapore, external Supabase database/storage, `/health/ready`, automatic deployments disabled, secret values supplied separately. Never place PGlite or audio files on Render's ephemeral disk.
- `MUSIFY_ONLINE_TEST=1` requires explicit UUIDs in `PRIVATE_TEST_USER_IDS`, disables demo/public registration and rejects other authenticated accounts. Fixtures remain hidden.
- Supabase artwork delivery uses short-lived signed storage requests internally; signed provider URLs stay on the server. Reads are bounded to 10 MiB, validate MIME/size and reject redirects. Upload precomputed 128/320/768 JPG variants using `cloudArtworkKey`, alongside the original files, before opening the app.
- `eas.json` has a separate `online-test` APK profile using the preview environment. Set `EXPO_PUBLIC_API_URL` in that environment only after the Musify API is live.
- `EXPO_PUBLIC_ONLINE_TEST=1` rejects LAN/HTTP/credential-bearing API URLs and conflicts with the LAN flag. Android package stays `com.local.musifytest`; online builds disable cleartext HTTP.
- No Expo updates configuration/dependency was added yet. Verify actual Expo Go manifest compatibility against SDK 58 before publishing; current Expo documentation and EAS CLI comments differ about runtimeVersion compatibility. Do not blindly configure a fingerprint runtime and promise Expo Go support.

## Verification

- API regressions: **45/45 passed**, including account isolation, private-test admission, playback-source compatibility, local artwork and media ranges. Evidence: workspace `work/online-api-tests.log`.
- New configuration test passes: `node --test scripts/online-config.test.mjs`.
- Lint and TypeScript pass: `work/online-lint.log`, `work/online-typecheck.log`.
- The independent, uncommitted V19 player-header frontend remains work in progress. Its browser cold `/player` reload hangs before DOMContentLoaded and shows a blank page. Changing navigation readiness did not resolve it. Latest run stopped at the first failure; do not claim those four flows pass or include this frontend in a hosted release yet. Use the committed 0.2.4 frontend as the release baseline with the tested hosting/backend changes. Do not discard the uncommitted work.
- No physical-device or live streaming verification for the online setup yet.

## Next steps

1. GitHub is now **connected and verified** as `AzatKabulov`; repository tools appeared and account/repository reads succeeded. No Musify repository exists. The connector cannot create repositories, so the in-app GitHub `/new` page was opened; it requires a separate web sign-in. That tab is marked for handoff and the owner was asked to sign in there or create the private repository themselves. No source has been uploaded anywhere new. Render separately needs private repository deployment access.
2. Create a private source repository from the reviewed committed baseline. Exclude `.env*`, databases, personal audio/artwork, APKs, account exports, keys and Git history. The existing mobile `.easignore` excludes the backend; it is not the backend repository's deployment ignore list.
3. Supabase connector does not expose the server key or pooler host. A private input template is outside Git at workspace `work/musify-online-setup.env`. The owner must supply `SUPABASE_SECRET_KEY` and `SUPABASE_POOLER_URL` from the dashboard. The latter can retain its `[YOUR-PASSWORD]` placeholder: no administrator password is needed, because the connected SQL tools can provision separate runtime roles, and their generated credentials replace the placeholder. Never print values or copy them into chat/source.
4. Provision separate restricted database login roles per `replica/backend.md`; create private storage buckets through the official Storage API; disable provider-level public sign-ups. Never use the migration/postgres login as the runtime identity.
5. Take a fresh consistent local backup before data transfer. Transfer the owner account through the Auth admin API, preserving its UUID, and handle the local scrypt → managed-auth password transition explicitly. Preserve track, library, playlist, item, session, installation and queue IDs. Do not silently replace the owner's library with a fresh account. Import compatible metadata, then upload and verify the 58 recordings/artwork and generated variants. Local originals remain intact.
6. Create Render's free service with the private source and reviewed server-only environment values. Run readiness, anonymous/admitted/other-user access checks, private bucket checks, snapshot/search, artwork, audio HEAD/Range, seek and lease revocation checks against HTTPS.
7. Configure and publish the Expo Go-compatible preview with the real HTTPS API; inspect the served update manifest. Build an Android online APK with the same test package and signing certificate. Do not overwrite the verified LAN APK aliases until the new APK is checked.
8. Test on cellular with the PC and local services off. Only this confirms the requested independence. Ask the owner to verify iPhone and Android playback/motion; do not claim device evidence from exports or browser checks.

## Subsequent connection check

Both values in the private `work/musify-online-setup.env` template were blank at the connection check. No secrets were printed. The original migration-URI field was replaced only if still blank, with `SUPABASE_POOLER_URL`, avoiding any request for the administrator's database password. A backend-only archive was prepared from committed source `4b73385` at `work/online-release/4b73385-api.tar`: 33 entries, SHA256 `ef3be2e5b417a3f786529f0a4100e480e6ec4356bcc177565e6e64a2ea8dd2ef`. Its membership was checked to exclude audio, APKs, databases, personal media, credentials, node_modules and Git history. It includes API source, migrations, manifests, the empty environment example and render.yaml.

Render CLI is absent. Public-schema validation was attempted, but the app's existing Ajv validator supports an older JSON Schema draft than Render's current 2020-12 schema. This is a tooling limitation; the Blueprint has **not** passed schema/platform validation. Use a draft-2020-12-capable validator or Render CLI >=2.7 before deployment. Do not suppress schema features to obtain a pass. No application dependencies were changed for this check.

## Free-plan behavior and rollback

Render sleeps after 15 minutes without traffic and can need about a minute to wake; Supabase Free may pause after a week of inactivity. Supabase includes 1 GB object storage; local top-level media currently totals 214,526,458 bytes. Verify usage and service wake-up behavior rather than promising always-on performance. Do not add paid resources or keep-alive traffic to circumvent free-plan limits.

Retain the local database/media and verified Android 0.2.4 APK as rollback. A deployment is incomplete until both the HTTPS backend and Expo preview work with the PC off.

Sources: [Render free instances](https://render.com/docs/free), [Supabase Free allowances](https://supabase.com/pricing), [Expo SDK 58 updates](https://docs.expo.dev/versions/v58.0.0/sdk/updates/#testing), [Expo runtime compatibility](https://docs.expo.dev/build/updates/).
