# Owaryn — working brand, 2026-10-24

**Owaryn / Keep your own rhythm.** The working identity follows the recommended angle in `fixes.md`: chosen music, clear playback modes, a durable personal collection. This is an applied prototype identity, not a cleared commercial name. Proposed pronunciation: oh-WAH-rin; Turkmen/Russian native-speaker testing is pending. No dictionary meaning or cultural endorsement is claimed.

## Twenty candidates

| Style | Candidates | Initial filter |
| --- | --- | --- |
| Descriptive | Own Queue; Music Room; Daily Sound; Open Refrain | Clear but generic, longer and English-dependent |
| Compound | Queuehaven; Tuneplain; Soundpath; Rhythmbank | Explains the job but pronunciation or category crowding needs work |
| Constructed | Yelvra; **Owaryn**; Rovaly; Seyora; Nuvaryn | Shortlisted for a distinctive compact label; existing uses subsequently found |
| Metaphor | Courtyard; Waymark; Caspian; Reedlight | Warm/regionally suggestive; broad existing uses and descriptive/geographic baggage |
| Verb | Resound; Settle; Meander | Fits the pace/control angle; generic search and app-category collision risk |

These are brainstorming candidates, not claims of original worldwide coinage. Nothing resembles the benchmark's name or uses a pun on it.

## Five-name screening

Every per-name check has its own row in `brand-name-checks.csv` (60 rows), with the date and source or **to run**. `brand-name-checks.json` preserves the actual official US Apple search and .com registry responses used for the screening.

| Name | Finding on 2026-10-24 | Decision |
| --- | --- | --- |
| **Owaryn** | No exact US App Store result among the returned names; .com RDAP returned 404/no record. Indexed music-app searches found no identified music app. Unrelated nickname/fictional uses exist. | Working choice; do not describe domain/handles/trademark as available |
| Yelvra | No exact returned US store name; .com registry record exists; no identified exact music-app result | Reserve alternative; domain acquisition not attempted |
| Rovaly | No exact returned US store name; .com record and existing company/surname uses | Drop from working direction |
| Seyora | An existing Android social app uses the name; .com record exists | Reject to avoid app-name confusion |
| Nuvaryn | Existing software-business and song uses; .com record exists | Reject |

The store search is exact returned-name screening in one market, not exhaustive international or phonetic clearance. Indexed Google Play searches are only a partial screen; native category and similar-name checks remain to run. A missing registry record is not a registrar purchase offer or a reservation. No domain or handle was registered and no account was created.

Official US, EU, Canada and WIPO trademark database searches remain **to run for all five**. Add national Turkmenistan and relevant expansion-market review, similar-sounding marks, and applicable goods/services before committing commercially. Exact X/Instagram/TikTok/GitHub handle checks remain **to run**. Conduct native-language meaning/pronunciation checks. These are open screening tasks, not a legal opinion or a claim that the name is free to use.

Observed collision references: [Seyora publisher listing](https://play.google.com/store/apps/details?hl=en_SG&id=com.seyoo.rara), [Rovaly company record](https://find-and-update.company-information.service.gov.uk/company/13755852), [Nuvaryn operator privacy page](https://bottlebank.io/legal/privacy). The working name's registry check is [Owaryn .com RDAP](https://rdap.verisign.com/com/v1/domain/OWARYN.COM); a future response can change.

## Palette and type

| Role | Value | Use |
| --- | --- | --- |
| Night navy | #101623 | App canvas and icon background |
| Deep slate | #1B2434 / #2A3548 | Surfaces and raised controls |
| Warm amber | #F5BD72 | Primary action, active control, mark and focus |
| Linen | #FAF5EA | Primary text |
| Mist | #C0CADB | Supporting text |
| Copper | #995033 | Original editorial card family |

Amber is a different primary hue family from the benchmark's green. Existing semantic colors and independent artwork palettes remain token roles rather than one-off component colors. `design/tokens.json`, CSS and native tokens are synchronized. All 18 defined text/UI contrast pairs pass WCAG AA; `design/contrast-report.json` contains ratios. This is a token audit, not full native accessibility certification. Type uses native system fonts with the existing scale; no proprietary font file is bundled.

## Logo brief and delivered draft

Idea: **an open, angular listening window**—a folded path that leaves room for a listener's next choice. Symbol plus lowercase wordmark. The interrupted geometric “O” connects to Owaryn and the control/space angle. Keep one flat amber mark; use navy behind it. Do not add three curved bars, a green disc, headphones copied from another product, or a lookalike wordmark treatment.

The drafted symbol is independently drawn as SVG and reproduced in native UI. It remains identifiable at 16px; the icon is a separate 1024×1024 opaque PNG. Android has a transparent foreground with inset safe artwork. The mark was checked by eye against the familiar benchmark structure: open angular geometry rather than its closed circular disc/curved-bar arrangement. This visual distinction is not trademark clearance.

Delivered in `brand/`: mark SVG; wordmark lockup SVG; opaque app icon; adaptive foreground; 16/32/48/180/512 PNG favicon set and multi-size ICO; social SVG/PNG at 1200×630. Editable geometry/icon generation is in the app repository's `scripts/create-icon.mjs`. Social PNG uses installed system-font rendering; fonts are not redistributed. The social image says “working identity” and uses no review as a testimonial, no invented customer counts, no real artist cover, and no unimplemented download/catalog promise.

## Voice

**Clear**: name the action and its outcome; avoid vague technical blame. **Warm**: make room for individual taste without forced enthusiasm. **Steady**: use familiar words and stable labels; avoid grand promises about reliability or catalog size.

| Do | Avoid |
| --- | --- |
| Say what pressing a control will do | Ambiguous creative labels for destructive/account actions |
| Offer a concrete next step after an error | Backend details in listener-facing failures |
| Respect personal taste | “You must love this” or forced discovery |
| Admit when this is a preview | Unsupported “every song”, “never buffers”, “offline everywhere” claims |
| Keep transport labels predictable | Renaming Play/Pause/Queue for novelty |

## Rewritten interface strings

| Surface | Previous | Applied |
| --- | --- | --- |
| Home heading | Find your rhythm | Keep your own rhythm |
| Brand promise | Your everyday soundtrack | Keep your own rhythm |
| Welcome | A space for your sound. | Make room for your music. |
| Welcome support | Discover something new. Keep what stays with you. | Choose a track. Keep a feeling. Make it yours. |
| Join entry | Join | Join Owaryn |
| Account primary | Create account | Create your account |
| Empty collection | Nothing here yet | Your next listen starts here |
| Search no-match | No matches yet | Nothing matched this time |
| Playlist validation | Give your playlist a name. | Start with a name for your playlist. |
| Playlist confirmation | Playlist saved | Playlist changes saved. |
| Connection error | Could not reach the service | Your music is a little out of reach |
| Connection help | Check your connection and try again. | Check your connection, then try again. |

## Applied scope and verification

Public app title, wordmark, icon, social/favicons, tokens, welcome/settings/empty/error copy and package display names are Owaryn. Routes now live in `src/app/` as required by the project instructions and current Expo Router documentation. Planning artifacts moved to the repository's `replica/` folder, which the pack sweep intentionally excludes because benchmark evidence belongs there.

Legacy internal cookie/storage/header identifiers and the existing deep-link scheme stay stable to preserve already-issued sessions and links. They are protocol compatibility keys, not displayed product branding; migrate them together with a real native/provider release. The example bundle IDs remain pre-distribution identifiers. Original-name/domain/green checks apply to shipped source/config/assets; research references remain in planning only. No claim that those internal compatibility names are a new public identity is made.

The automated sweep uses `brand.json`. Final scan result, contrast checks and post-brand browser/build outcomes are in `brand-verification.md`. No landing page, paid registration, DNS, app-store publication or deployment was performed in this stage.
