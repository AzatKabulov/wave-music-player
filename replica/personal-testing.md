# Musify personal mobile test — 2026-10-26

The current candidate is **0.2.0 (versionCode 2)**, package `com.local.musifytest`, Expo SDK 58. The owner uses an iPhone 15 Pro and a Redmi described as “10 Pro” (exact model unconfirmed). Both phones use the Windows PC's Wi-Fi; the PC and test services stay on.

## Running services

Use `node scripts/launch-phone-test.mjs` or the sibling output `start-musify-testing.cmd`. The launcher starts persistent hidden Windows services, checks readiness and exits without stopping them. Logs/process metadata: `apps/api/data/phone-test/`. Foreground alternative: `npm run test:phones` with the terminal left open.

- iPhone Expo Go: `exp://192.168.0.4:8082`
- Personal API: `http://192.168.0.4:4103`
- Health: `http://192.168.0.4:4103/health/ready`
- APK: `http://192.168.0.4:4103/test/android.apk`

The launcher selects the private IPv4 interface; use `MUSIFY_PERSONAL_TEST_HOST` if multiple adapters require an explicit choice. No firewall rule, public tunnel or hosted service was added. Local personal data is separate from the ordinary local database. Browser QA uses the existing localhost workflow; an arbitrary HTTP LAN browser preview is not a supported replacement for native testing because browser crypto requires a secure context.

## Android

[Download the signed 0.2.0 APK](https://expo.dev/artifacts/eas/WXbrAA3zJi8-DojbZ1tP1N1UwxP6c_ONJtDmmJILRA0.apk). Local outputs: `../Musify-0.2.0.apk`, `../Musify.apk`, and `../musify-android-test.apk`, all the same binary. Size 115,618,236 bytes. SHA-256 `adeb170ff9a84f34071ce86d9e09ce54360da19f09cba9358f31f7ab82147b0a`.

[Completed EAS build](https://expo.dev/accounts/azatkabulov/projects/musify-personal-test/builds/f0de680d-82a2-48fc-bc18-260be5bc39b6). The 0.1.0 build is retained at `../Musify-0.1.0-rollback.apk`. The new APK shares the existing package/signing certificate. It embeds the explicit personal HTTP API address; an address change requires rebuilding this profile.

Verification: full APK signature with apksigner (v2), ZIP CRC, package/version, min SDK 24, target SDK 36, four CPU architectures, personal cleartext setting, background media permission, no microphone permission, correct embedded URL and absence of popular audio assets. Full HTTP download hash matched. Emulator install returned Success; package version 0.2.0 and MainActivity resumed; inspected startup logs contained Running main and no Android/React Native exception. These checks do not cover the complete native main flow. Details: `tasks/evidence/candidate/android-apk-0.2.0.json`.

## iPhone

Use Expo Go signed into **azatkabulov**, allow Local Network access, and scan the saved iPhone QR in `../musify-testing-qr-fixed.png`. Manifest `exposdk:58.0.0` and a 13,924,075-byte bundle served over Wi-Fi after the catalog restart. The owner confirmed an earlier Expo Go launch on 2026-10-25; physical acceptance of this redesigned candidate remains open. Expo Go previews foreground playback. Own-build iOS background/lock-screen behavior requires a separate Musify iOS binary.

## Catalog and data safety

30 popular full-length recordings across 12 artists and 27 album entries, plus 12 engineering fixtures. Popular picks (30), Pop essentials (16), Rap rotation (6), After dark (8). All 30 tracks passed search, cover/audio hash checks and initial/final range streaming. The first import changed 15 → 42; repeating it kept 42 → 42. See `tasks/catalog-expansion.md` and `tasks/evidence/candidate/catalog-verification.json`.

Database: `apps/api/data/personal-postgres`; media/provenance: `apps/api/data/personal-media`; pre-import backup: `apps/api/data/catalog-backups/before-expansion-20261026-070549/`. All are gitignored and excluded from EAS uploads. Stop the personal API before opening the embedded PGlite database from any other process. Never reuse the private personal manifest as a production artist/label grant. The managed-provider importer remains WAV-only. No broad automatic download resolver was added.

## Checks and remaining acceptance

40/40 browser E2E, 24/24 client/data/locale tests, 23/23 API tests and candidate export/check evidence are recorded in `tasks/implementation-status.md`. Fresh lint/typecheck passed. EN/RU/TK dictionaries and device-language/Settings selection are included; native language, accessibility and layout acceptance remain open.

On both physical phones: login/Explore demo, search/play/seek/skip, full player, queue reorder/undo, save, create/edit playlists, close/reopen and queue restoration. Android own-build checks: background/lock-screen, interruptions and headphones. Measure the planned frame/memory/audio budgets and 30-minute listening session on actual devices. No release-device performance or physical playback claim follows from emulator startup or HTTP checks. Public name, catalog, infrastructure, payment and store gates remain open.
