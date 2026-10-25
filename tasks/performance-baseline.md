# Performance baseline and repeatable journey

2026-10-26. Pre-redesign source baseline: git 25965fc. Existing APK 0.1.0 is retained for rollback. No matched pre-change native startup/frame/memory/audio trace was captured. Therefore this work cannot claim a percentage speedup, a stable frame rate on the owner's phones, or a measured native pass against the plan's budgets.

Owner devices: iPhone 15 Pro; Redmi described as “10 Pro”, exact model and both OS versions unknown. No physical device is attached. iPhone 0.1.0 Expo Go opening was owner-confirmed on 2026-10-25; that is not confirmation of the 0.2.0 main flow.

Repeatable candidate journey: cold launch → Home → collection → play → full player → seek → collapse → Search → save → playlist add → queue move/remove/Undo → resume after backgrounding. Use the same catalog, network and cache state when comparing old/new builds. Record Android release results separately from iPhone Expo Go.

Data scale measurement is isolated from personal data: node scripts/measure-search.mjs creates an in-memory database with 10,000 added published metadata records, three-language terms and a 1,000-item playlist, then discards it. No extra music is downloaded. API integration tests isolate 30 owned playlists and a second listener. Browser QA uses disposable databases on 4101/4102, not the personal database.
