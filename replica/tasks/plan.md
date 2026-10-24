# Implementation: design → build → backend

Continue the approved music recon/architecture in the user's requested order. Product target: iOS/Android music listening, broad local/international catalog, regional audience. Deliver source and a local runnable preview; managed cloud configuration depends on user-created accounts/keys.

1. Design: original tokens, component/state contract, native primitives, isolated design screen, contrast check, public-reference notes. Use neutral provisional Saz identity, not a final cleared brand.
2. Build: Expo shell and typed data client, catalog/search/player, artist/album/playlist/library flows, dialogs/settings/history/auth views, persistent local UI behavior. Verify the shared UI in an Expo web preview at phone and wide widths. Keep native-only playback validation explicit.
3. Backend: runnable Fastify service, local PostgreSQL runtime and durable data for development, production Postgres/Supabase adapters, schema migrations/seed/import tools, ownership checks, media ranges/leases, auth/recovery/deletion, jobs and tests. Connect the UI through the same API contract. No paid billing/offline expansion.
4. Final integration/review: typecheck/build, API isolation/conflict/range tests, browser flow checks/screenshots, dependency audit, updated feature/build/backend evidence. Record gaps instead of claiming native hardware/cloud checks passed.

Do not sign up for provider accounts or ask the user to paste keys into chat. Supply .env.example and concrete setup instructions. Never use competitor audio/CDNs. Generated original instrumental fixtures are test content, not an acquired music catalog.
