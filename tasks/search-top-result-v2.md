# V25.1 — search "Top result"

**Problem (plan audit):** in *All* results the song rows rendered first and albums, artists and playlists sat in a footer, so an exact artist or album was buried under every song that merely mentions it.

**Change.** The API already ranks hits (exact title, then title prefix, then other matches, with a stable tie-break). *All* results now lead with a **Top result** section built from the first ranked hit:

- a song is shown as its normal row and keeps the whole ranked song list as its playback context and queue position;
- an artist uses the artist row, an album or playlist uses the standard card;
- the top result is removed from its own section below, so nothing appears twice; the empty state still counts every hit, so a lone top result never shows "Nothing matched";
- the *Tracks*, *Albums*, *Artists* and *Playlists* filters, genre browsing and the pre-query landing page are unchanged and show no top result.

**Accessibility fix found on the way.** The artist row's accessible name was only the artist's name while the row also shows the word "Artist", which fails WCAG 2.5.3 (label in name). It was latent because no earlier test ran axe with that row on screen. The name is now "<artist> Artist" and the row follows the repo's trailing-space convention so visible text and name agree. The one selector that matched the old exact name (`f03-search.spec.ts`) was updated to the complete name. Songs, albums, playlists and every other assertion are unchanged.

**Verification.** `e2e/v2-search-top.spec.ts` (both viewports): an exact artist query shows *Top result*, the artist once and above the first song, axe clean, and opens the artist; an exact song title is the top result, appears once and plays; the *Tracks* filter shows no top result. Full browser suite **114/114** (six new), client 61/61, lint, typecheck and formatting pass.

**Not done / still open.** Aliases, typo tolerance and indexed ranking (V12) are not implemented, so the top result is only as good as the existing ranking; the server does not expose a rank, so a weak substring match can still be the top result. Bounded per-type sections with "See all", recent selected entities and server-backed categories are later V25/V26 slices. Native keyboard and screen-reader behaviour is unverified; Turkmen/Russian "Top result" strings need native-speaker review.
