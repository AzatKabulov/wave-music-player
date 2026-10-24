# Regional catalog research: Aydym and Belet Music

Research date: 2026-10-24. Scope: public product pages, publisher store listings, and published terms. No accounts, private APIs, music downloads, or private contracts were accessed. Russian/Turkmen source statements below are summarized in English, not quoted verbatim.

## Decision for this product

Build a **broad-catalog music app for listeners in Turkmenistan**. Its catalog model, search, and discovery should accommodate international and local releases across genres and languages. Do not constrain the software to Turkmen music only. This confirms the user's direction while separating the app's technical capacity from the supply of particular recordings.

Use Spotify for the core listening experience and Aydym/Belet Music for regional product and operations research. Do not treat a competitor's visible catalog as evidence that its contracts, legal position, or content can be reused by another service.

## What the public evidence establishes

| Topic | Observation | Implication and limit |
| --- | --- | --- |
| Aydym catalog breadth | Its public homepage includes a foreign-music section alongside local releases, plus geographic charts [A1]. | International music belongs in the benchmark. A visible selection is not proof that every song is available or that every underlying agreement is public. |
| Aydym positioning | Its about page emphasizes Turkmen music; its Android listing is regionally positioned [A2, A3]. | Regional positioning and a broader catalog can coexist. That does not establish that an explicitly false local-only claim is its strategy. |
| Aydym artist supply | The site exposes a For Artists link, and its Android listing gives a contact for placing songs [A3, A4]. | A creator submission route is publicly signposted. The linked artist guide returned no readable text in this research; its actual onboarding and contracts remain unverified. |
| Aydym user-posted material | The rights-holder page describes information posted by users and a process for reporting suspected infringement. It says correctly completed complaints will be reviewed within five working days [A5]. | There is a self-described user-posting/complaint workflow. This is the operator's statement, not a determination of its legal protection or complete licensing model. |
| Aydym user responsibility | Section 2.1.3 of its agreement tells users to respect copyright and related rights [A6]. | Its published terms do not present unrestricted use of other people's music as an entitlement. |
| Belet listener product | Its publisher listings advertise music discovery, albums, playlists, search, and user playlists [B1, B2]. | Useful regional UX reference. The pages reviewed do not substantiate an exhaustive international catalog or identify all content suppliers. |
| Belet creator supply | Belet Music Studio advertises release publishing, audio/cover upload, catalog and artist-profile management, and listening statistics for artists and labels [B3]. | Concrete evidence of a first-party creator intake workflow. This supports considering a verified artist/label submission tool later. It does not prove the source of every consumer-app track. |
| Belet content terms | Service terms identify recordings as protected material, describe personal listening, restrict commercial reuse by users, and provide a rights-holder contact route [B4]. | Consumer access is not permission to ingest or redistribute Belet's music in this app. Its supplier arrangements still need direct verification. |

## What remains unknown

- The complete catalog feeds, licensors, distributor relationships, and actual per-recording coverage used by either company.
- Whether any claimed local legal exception applies to the intended commercial service, recordings, uses, and distribution. This research does not establish such an exception.
- Whether the self-described user-posting workflow accounts for all, some, or none of Aydym's editorially displayed catalog. Do not infer internal architecture from a disclaimer.
- Any hidden reviewer-specific behavior. No evidence for such a strategy was established, and it is not a requirement for this product.
- The economics or terms on which these operators might supply another service. Artist tooling, a complaint address, and store presence do not answer that question.

Neither company was contacted. Published disclaimers were not copied as legal advice or adopted as the new app's terms.

## Candidate strategy to investigate

The following is a proposed operating model for the new product, not a claim that either competitor uses precisely this combination.

1. **Admin-controlled catalog first.** Import supplied releases with audio, artwork, artist/album relationships, language/genre metadata, source identity, and a permission record. The first playable catalog can be small while the system remains capable of supporting more repertoire.
2. **Direct artist/label intake.** Use an invitation or verified account workflow before considering a public upload feature. Record who supplies each release and what uses/territories it covers. Belet Studio is the observable product reference, not a source of transferable content rights [B3].
3. **Broader supplier feed.** Evaluate an actual catalog provider or distribution agreement for international repertoire. Check its offered titles, territory coverage, streaming/offline uses, delivery format, updates, and withdrawal process. Do not assume coverage from the provider's headline catalog size.
4. **Catalog lifecycle operations.** Plan draft/review/publish/unpublish states, withdrawal handling, evidence storage, and a complaint channel. Complaint handling is an operational process; do not assume it substitutes for permission to offer a recording.
5. **Accurate regional presentation.** Describe the real product as a music service for Turkmenistan with the repertoire actually supplied. Regional focus can be expressed through curation and language without claiming that an international catalog is local-only.

This strategy does not require a mobile UI change to add each genre or country. It does require adding catalog supply before those tracks can actually be offered.

## Architecture handoff

- Preserve the existing 20 core listener surfaces and 12 core flows. No new listener screen is necessary merely to support international repertoire.
- Add feature M32: broad-catalog metadata and discovery. Actual coverage must not be implied by a placeholder search result.
- Add optional C06: verified artist/label submissions, modeled on the publicly advertised creator workflow. It is outside the first listener release and its screen count.
- Keep source references and permission evidence attached to catalog records. Multiple sources, featured artists, duplicate titles, and withdrawal must be representable.
- Search should preserve display text and handle the scripts actually selected for launch; do not use nationality as an artist identity or as a substitute for permission scope.
- Build the player against the app's catalog contract rather than binding it to a competitor's stream URLs. A later supplier change should not require rewriting playlist and player screens.
- Price/payment choices and regional network defaults remain research items; they were not established by the catalog findings.

## Questions for supplier/operator verification

Before adopting an operating arrangement, obtain concrete answers to:

- Who delivers the audio and metadata, and can they authorize use in this product?
- Which recordings and territories are covered, and for which streaming/offline/paid uses?
- Is the proposed relationship direct artist supply, licensed catalog delivery, or user submissions? What agreements and review responsibilities go with it?
- How are releases updated, matched, withdrawn, and reported? What cost and reporting commitments apply?
- Is there a commercial feed or partnership for another service, or only a consumer listening product?

These are verification inputs, not messages sent to third parties and not prerequisites for continuing player and UI development with supplied permitted test tracks.

## Sources

| ID | Source | URL |
| --- | --- | --- |
| A1 | Aydym public catalog | https://aydym.com/ |
| A2 | Aydym about page | https://aydym.com/about-us |
| A3 | Aydym publisher Android listing | https://play.google.com/store/apps/details?hl=en_US&id=com.gozleg.aydym |
| A4 | For Artists destination; link verified, page text unavailable | https://artist.aydym.com/guide |
| A5 | Aydym rights-holder page | https://aydym.com/law |
| A6 | Aydym user agreement | https://aydym.com/useragreement |
| B1 | Belet Music publisher Android listing | https://play.google.com/store/apps/details?id=com.sanlytilsimat.musicapp |
| B2 | Belet Music publisher iOS listing | https://apps.apple.com/ru/app/belet-music/id6503349020 |
| B3 | Belet Music Studio publisher listing | https://play.google.com/store/apps/details?hl=en&id=com.sanlytilsimat.studio |
| B4 | Belet service terms linked from publisher listing | https://st.com.tm/ru/legal/terms-of-use |

Public pages and publisher descriptions can change and can lag the actual app. Their claims were not independently audited. This research supports the product direction; it does not settle the commercial rights to an individual track.
