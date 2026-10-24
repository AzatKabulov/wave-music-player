# Dependency audit — 2026-10-24

The API lockfile audit reports **zero vulnerabilities** (78 installed packages). Its runtime validation uses Zod 4.6.7, beyond the affected range in the current Zod advisory.

The Expo app/tooling lockfile reports **five high-severity package entries**, derived from two advisory roots:

| Advisory | Installed path | Reachability / treatment |
| --- | --- | --- |
| [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo CLI/code-signing → node-forge 1.4.0 | Build/update signing tooling. The app/API runtime does not import node-forge; no OTA signing workflow was configured. Registry latest checked as 1.4.0, still in the affected range. Review before signing/distributing updates. |
| [Zod constrained collection memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Expo CLI → Zod 3.25.76 | CLI/build configuration validation, not the API's runtime Zod. Expo declares a v3 dependency; forcing v4 would cross its major API range. Loopback development only; no public dev server. |

The additional entries are parent dependency paths (`expo`, `@expo/cli`, `@expo/code-signing-certificates`), not five independently discovered vulnerabilities. The audit's suggested Expo 44 downgrade would abandon SDK 58 compatibility and was not applied. No compatible automatic remediation was established. These are explicit deferrals, not a clean mobile-toolchain audit or permission to release.

Review date: **2026-11-07**, or before a native/OTA release, whichever is earlier. No scheduled reminder was created. Recheck official upstream releases, install a compatible fix, repeat native exports/device tests, and review the committed lockfiles.

Both package boundaries use npm 11.8.0 and `.npmrc` with `ignore-scripts=true`. Required Expo commands are invoked explicitly; dependency lifecycle scripts were not blanket-enabled. Audit results cover known advisories, not all possible supply-chain risks.
