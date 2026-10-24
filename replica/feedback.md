# User feedback research — 2026-10-24

**153 unique entries from three source families:** 142 Apple App Store reviews, nine Google Play reviews, two Reddit opening posts. Products: 147 Spotify entries and six regional entries (three Belet Music, three Aydym). Started with 161; removed eight duplicate/empty normalized texts. Apple ratings in this deduplicated slice: {'1': 26, '2': 8, '3': 8, '4': 7, '5': 93}. Positive reviews remain in the sample; complaints are not synonymous with low stars.

The Apple cohort is three consecutive US “most recent” feed pages from 2026-10-22, a narrow time window. Google Play supplied selected visible reviews dated 2021–2026, rather than an exhaustive recent feed. Reddit supplied two deliberately selected shuffle discussions, not a representative survey; dates are blank because relative browser dates conflicted with search cache. No ratings were invented for Google Play/Reddit. None of these people are verified customers of this new app, and the regional sample is too small to estimate Turkmenistan demand or willingness to pay.

`reviews.csv` is a citation/metadata index. Apple rows contain only a two-word verbatim cue plus the exact entry ID, feed page, original length and text hash; other rows use short verbatim excerpts. Full text was read for coding, not redistributed as a bulk review archive. Public feed source links may require finding the entry ID. The keyword ranker was run against the full research cache using `review-themes.json`, date 2026-10-24, 18-month age decay; the short public cues are not a substitute corpus for reranking. Raw ranker output was checked against the actual text. Scores prioritize low stars; older reviews have half weight. Counts below are unweighted, can overlap, and count source families rather than URLs/products.

| Rank | Theme | Entries | Source families | Weighted score | Strength |
| --- | --- | --- | --- | --- | --- |
| 1 | Unwanted repeats and queue order changes | 15 | 3 | 11.2 | Directional |
| 2 | Price or basic control restrictions | 11 | 2 | 8.0 | Directional |
| 3 | Repeated or intrusive ads | 12 | 2 | 7.1 | Directional |
| 4 | Playback, resume or performance failures | 8 | 2 | 5.8 | Directional |
| 5 | Forced interface or recommendation changes | 7 | 2 | 4.8 | Directional |
| 6 | Unavailable songs or country access | 3 | 2 | 2.1 | Directional |
| 7 | Playlist search, deletion and sorting | 2 | 2 | 0.7 | Thin |
| 8 | Choose a song excerpt as ringtone | 1 | 1 | 0.6 | Thin |

## What they hate

1. **Unexpected repeats and lost queue order — 15 entries, 3 families.** “Plays the same songs over and over.” ([app-store 14698708245](https://itunes.apple.com/us/rss/customerreviews/page=1/id=324684580/sortBy=mostRecent/json)) The regional ordering complaint and the two selected Reddit posts reinforce control as a useful direction. They do not prove a particular private recommendation algorithm is responsible.
2. **Basic-control restrictions or price — 11, 2 families.** “Prices are too high” ([app-store 14698242702](https://itunes.apple.com/us/rss/customerreviews/page=2/id=324684580/sortBy=mostRecent/json)) Pass pricing research to launch; do not infer a sustainable local price from complaints alone.
3. **Intrusive/repetitive ads — 12, 2 families.** “if you want to listen to ads” ([app-store 14698440019](https://itunes.apple.com/us/rss/customerreviews/page=1/id=324684580/sortBy=mostRecent/json)) Some positive reviews accept ads, so an ad-free paid plan is a hypothesis to test, not an automatic answer.
4. **Playback/resume/performance trouble — 8, 2 families.** “Super buggy and slow” ([app-store 14698247844](https://itunes.apple.com/us/rss/customerreviews/page=2/id=324684580/sortBy=mostRecent/json)) Some reports involve podcasts, TV or cars; only the transferable queue/resume/reliability jobs belong in this phone MVP.
5. **Forced UI or recommendation changes — 7, 2 families.** “my home screen is completely changed” ([app-store 14697938493](https://itunes.apple.com/us/rss/customerreviews/page=3/id=324684580/sortBy=mostRecent/json)) Stable navigation and user-controlled modes are a plausible response.
6. **Availability/access disappointment — 3, 2 families, heterogeneous and weak.** “can’t listen to music anymore” ([app-store 14698479669](https://itunes.apple.com/us/rss/customerreviews/page=1/id=324684580/sortBy=mostRecent/json)) Country restrictions and missing repertoire are different problems; do not promise every song or universal access.

## What is missing

1. **Find/sort/delete within a large playlist — 2 entries, 2 families; thin.** “delete option when searching” ([google-play GP-B3](https://play.google.com/store/apps/details?id=com.sanlytilsimat.musicapp)); “sort by genre” ([app-store 14698279266](https://itunes.apple.com/us/rss/customerreviews/page=2/id=324684580/sortBy=mostRecent/json)). Cheap and relevant despite limited frequency.
2. **Choose a song excerpt as a ringtone — 1 entry, 1 family; thin.** “on ringtone” ([google-play GP-B2](https://play.google.com/store/apps/details?id=com.sanlytilsimat.musicapp)). Defer: device APIs, export permissions and commercial supply complicate it.

## What is unsolved

1. **Trust the queue across listening sessions — 15 entries, 3 families support the broad control theme.** “the same shuffled songs in the same shuffled order.” ([reddit RD-1](https://www.reddit.com/r/truespotify/comments/1vfduxm/shuffle_isnt_so_shuffle/)) A persistent acknowledged queue is a job, not a request for a more opaque recommendation system.
2. **Stay focused on music as the interface changes — 7 entries, 2 families support the broad UI-control theme.** Treat a stable music-first surface as a positioning hypothesis. The same broad theme is not seven independent requests for one exact feature.
3. **Regional large-library maintenance — one Belet review, one family; thin.** The search/delete quote above is the direct evidence. Validate with local listeners before promoting it as a regional trend.

## Interpretation limits

This is exploratory evidence, not a competitor defect audit or prevalence estimate. A review's rating does not verify its technical explanation. Read nine unthemed low-star entries manually: several are non-actionable one-liners or unverified political/corporate allegations; none become factual marketing claims. A privacy/phone-number concern appears in other public regional listings, but it was not included in this counted cohort. No aggregate Trustpilot rating was used; the public page displayed a review-integrity warning. All competitor names/quotes stay in planning documentation, never customer testimonials or store copy.

See `fixes.md` for the build order and positioning options.
