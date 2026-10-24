# Musify personal mobile test — 2026-10-25

## Start the PC services

On Windows, run `node scripts/launch-phone-test.mjs` or double-click the output `start-musify-testing.cmd`. It starts the test controller as a persistent hidden Windows process, checks API/Expo readiness, and exits without stopping them. Logs and process metadata are under `apps/api/data/phone-test`. The previous temporary execution servers had stopped; this launcher fixes that lifecycle issue. For foreground debugging, `npm run test:phones` still works while its terminal remains open. Keep the PC awake. The controller selects the single private IPv4 interface; with multiple adapters set `MUSIFY_PERSONAL_TEST_HOST` first.

Current connection:

- iPhone Expo Go: `exp://192.168.0.4:8082`.
- API diagnostic in the phone browser: `http://192.168.0.4:4103/health/ready` (expect `{"ok":true,"mode":"local"}`).
- Metro: port 8082. Personal API: port 4103.
- Both phones must use the same trusted Wi-Fi as this PC. Allow Expo Go local-network access on iOS if prompted. If Windows asks about Node network access, allow the trusted private network.

The launcher does not modify firewall rules, create a public tunnel or provision a hosted service. It preserves the ordinary loopback-only server and uses a separate database at `apps/api/data/personal-postgres`. Personal media and provenance live in `apps/api/data/personal-media`; both directories are gitignored.

## iPhone

Install the current Expo Go and sign in as **azatkabulov**, matching this PC's Expo account. [Current Expo instructions](https://docs.expo.dev/get-started/start-developing/) require matching accounts on physical iOS devices. Enable Expo Go in **Settings → Privacy & Security → Local Network** ([Apple instructions](https://support.apple.com/en-us/102229)). This project serves SDK 58. Scan the QR with iPhone Camera, open in Expo Go, then choose **Explore demo → Popular picks**.

This preview uses foreground playback. It deliberately avoids activating the app's own background audio and lock-screen configuration inside Expo Go. Test those behaviors later in Musify's own iOS binary.

The iOS manifest and a 10.6 MB JavaScript bundle were successfully served on the Wi-Fi interface. This is a server-side readiness check; an actual iPhone run is still required.

## Android APK

The `personal` EAS profile builds an installable APK with package `com.local.musifytest`. It embeds `http://192.168.0.4:4103` as the test API address and enables cleartext HTTP only for this explicit personal build. Other builds retain the default HTTPS policy. If the PC's address changes, update `eas.json` and rebuild the APK; Expo Go can use the launcher's newly detected address.

Build project: https://expo.dev/accounts/azatkabulov/projects/musify-personal-test

Initial build: https://expo.dev/accounts/azatkabulov/projects/musify-personal-test/builds/ae3e57de-0600-416a-9c8a-bf99fdeaa823

**Build completed successfully.** [Download the Android APK](https://expo.dev/artifacts/eas/XDol7xcHr96wNPPmquUeCHQ1Y6X7gkjDclNzR-z-ihE.apk). The local output is `outputs/musify-android-test.apk`, 107,584,493 bytes (about 108 MB), SHA-256 `049ad2bb2edb5c69291aa08c8d0a75b5e0e46c455427b14bbc3a5b74aed604ea`.

The same validated file is also provided as `outputs/Musify.apk`. The personal API's `GET/HEAD /test/android.apk` serves it as `application/vnd.android.package-archive`, with `attachment; filename="Musify.apk"` and byte-range/resume support. This route is absent in ordinary local and production configurations. A full HTTP download matched the build's size and SHA-256. No native rebuild was needed for these server/launcher fixes.

The downloaded binary passed ZIP CRC checks. Its parsed manifest confirms package `com.local.musifytest`, version 0.1.0, min SDK 24, target SDK 36, personal-test cleartext HTTP and foreground media playback permission, with no microphone permission. It includes arm64-v8a, armeabi-v7a, x86 and x86_64 libraries. The embedded bundle contains the correct private API URL and no personal M4A/MP3 files. An APK signing block is present; full signature validation and physical installation were not executed by these file checks.

Download/install instructions and final artifact verification are recorded in the output handoff. No Google Play enrollment is required to install the private APK directly. No store submission was performed.

## Personal music library

The isolated personal test library contains the 12 original engineering recordings plus:

| Artist | Track | Inspected duration | Album cover |
| --- | --- | --- | --- |
| The Weeknd | Blinding Lights | 201.583 seconds | After Hours, 600×600 JPEG |
| Shawn Mendes | Treat You Better | 187.976 seconds | Illuminate, 600×600 JPEG |
| Eminem | Mockingbird | 250.762 seconds | Encore (Deluxe Version), 600×600 JPEG |

The site's download labels said MP3, but inspection identified AAC in M4A containers, with audio and no video. Those files are stored/served as `audio/mp4`. Metadata/duration checks, file hashes, image decoding and byte-range requests at both ends of every file passed. The source labels were not independently fingerprinted against a rightsholder master. Eminem's recording is conservatively marked explicit because the exact clean/explicit edition was not independently established.

These were selected normal public downloads from imusic.fm. Musify.club's tested download links redirected to login; no login gate was bypassed. Source pages, metadata/artwork URLs, hashes and scope are retained in the private provenance manifest. No general search/download resolver was built, and the managed-provider importer still requires canonical WAV. The active personal database access records describe the user's private test instruction, not an artist/label commercial grant. Personal media are excluded from the EAS source archive and the source repository.

## Checks and remaining acceptance

- Queue: 3/3; API: 18/18, including private-interface and artwork isolation checks.
- Strict TypeScript and Expo lint passed after the mobile/artwork changes. The subsequent browser-origin adjustment passed the focused listener tests.
- Wi-Fi API checks: all 3 recordings returned correct MIME types and 206 responses for initial/final ranges; all 3 cover hashes matched.
- Ordinary PC browser QA remains the previously documented localhost workflow. Raw HTTP LAN browser previews are not a supported acceptance route: browser crypto APIs require a secure context. This does not affect native Expo Go/Android crypto.
- Test on each physical phone: open app, Explore demo, Popular picks, play/seek/skip, open full player, save tracks, create/reorder a playlist, close/reopen and restore the queue. Test Android background/lock-screen, interruptions and headset behavior using the APK.
- The current interface is English. Turkmen/Russian localization and language selection remain pending. Musify is a working name; public name clearance and all production release gates remain open.
