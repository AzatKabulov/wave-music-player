# Mobile reference boundaries

Recorded 2026-10-26. User direction: Spotify-like mobile layouts, Musify identity and existing capabilities.

| Screen | Structural target | Musify route / evidence |
| --- | --- | --- |
| Home | Compact profile/filter rail, two-column shortcuts, horizontal music shelves | /home, .impeccable/review/home-phone-web.png |
| Search | Prominent field, type chips, tracks then albums/artists/playlists | /search, search-phone-web.png |
| Library | Saved collections, filters, sorting, list/grid, separate liked tracks | /library, library-phone-web.png |
| Collections | Artwork, title/creator, save/edit and play, ordered track list | /album/:id, /playlist/:id, /artist/:id |
| Player | Mini-player above menu; full artwork/metadata/transport/seek/queue | /player, player-phone-web.png |
| Queue/sheets | Occurrence identity, compact rows, reorder; contextual actions in a bottom sheet | /queue, /actions/:id, /add/:id |

Spotify's [Now Playing help](https://support.spotify.com/us/article/now-playing/) and [Your Library help](https://support.spotify.com/us/article/your-library/) were rechecked on 2026-10-26. They support behavior and placement, not a pixel-accurate native composition. Prior recon and historical browser captures are in replica/recon.md and replica/clone-screens. No current Spotify account/native screenshots were obtained. All new .impeccable/review captures are Musify's React Native web preview, explicitly labelled as such. No numerical visual parity score or native fidelity certification is justified.
