---
name: Musify
description: Familiar mobile listening layouts with Musify identity.
colors:
  bg: "#0B0B0D"
  surface: "#18181C"
  surface-raised: "#25252B"
  border: "#45454F"
  border-input: "#85858F"
  text: "#FAFAFC"
  text-muted: "#B5B5BF"
  accent: "#41E2B1"
  on-accent: "#071A13"
  danger: "#FFAAA0"
  success: "#41E2B1"
  focus: "#41E2B1"
  art-clay: "#8A3F32"
  art-sea: "#205E63"
  art-night: "#284A79"
  art-sand: "#75522B"
  art-berry: "#723852"
  art-forest: "#235640"
typography:
  display: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "32px", fontWeight: 700, lineHeight: "38px"}
  xl: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "26px", fontWeight: 700, lineHeight: "32px"}
  lg: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "18px", fontWeight: 600, lineHeight: "24px"}
  base: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: "22px"}
  sm: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "13px", fontWeight: 400, lineHeight: "18px"}
  xs: {fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontSize: "11px", fontWeight: 500, lineHeight: "16px"}
rounded:
  sm: "4px"
  md: "10px"
  pill: "999px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
components:
  button-primary: {backgroundColor: "{colors.accent}", textColor: "{colors.on-accent}", rounded: "{rounded.pill}", padding: "12px 20px"}
  button-secondary: {backgroundColor: "{colors.surface-raised}", textColor: "{colors.text}", rounded: "{rounded.pill}", padding: "12px 20px"}
  button-quiet: {backgroundColor: "transparent", textColor: "{colors.text}", rounded: "{rounded.pill}", padding: "12px 20px"}
  button-danger: {backgroundColor: "{colors.surface-raised}", textColor: "{colors.danger}", rounded: "{rounded.pill}", padding: "12px 20px"}
  input: {backgroundColor: "{colors.surface}", textColor: "{colors.text}", typography: "{typography.base}", rounded: "{rounded.md}", padding: "12px 16px"}
  chip-selected: {backgroundColor: "{colors.accent}", textColor: "{colors.on-accent}", rounded: "{rounded.pill}", padding: "8px 16px"}
  navigation: {backgroundColor: "{colors.bg}", textColor: "{colors.text-muted}", typography: "{typography.xs}", height: "64px"}
  music-card: {textColor: "{colors.text}", width: "160px"}
  mini-player: {backgroundColor: "{colors.surface-raised}", textColor: "{colors.text}", rounded: "8px"}
  sheet: {backgroundColor: "{colors.surface}", textColor: "{colors.text}", rounded: "20px 20px 0 0", width: "100%"}
---

# Design System: Musify

## Overview

**Creative North Star: "Familiar listening, Musify identity"**

Compact, artwork-led mobile layouts put finding and playing music first. The owner's Spotify layout direction informs the hierarchy; Musify keeps its own name, angular brand mark and mint accent. Near-black surfaces, native system type and restrained controls support frequent listening tasks.

This scan records the implemented candidate, using source as authority. The 16 frames in [.impeccable/review/captures.json](.impeccable/review/captures.json) are phone-width and wide **web** layout evidence. There is no approved bitmap comp or detector result. Native gestures, accessibility, audio continuity and release-device performance still require acceptance; these documents certify none of them.

**Key Characteristics:**

- Dense music shelves and readable track metadata.
- Persistent browsing navigation and mini-player; immersive full player.
- Neutral missing-art glyphs and genuine covers when supplied.
- Fast press feedback, richer sheets and system reduced-motion handling.

## Colors

The palette uses one primary accent over a tonal neutral stack. Normative values above come from [src/design/tokens.json](src/design/tokens.json); [src/design/theme.ts](src/design/theme.ts) exposes them to components.

The sidecar's tonal ramps are synthesized panel previews, not additional app colors. Its HTML/CSS samples translate native components for documentation; they do not reproduce native runtime behavior.

### Primary
- **Mint** (`accent`): primary buttons, selected chips, saved states, current-track text and the Musify mark. `on-accent` supplies dark foregrounds; `focus` and `success` reuse mint for their actual semantic states.

### Neutral
- **Near black** (`bg`), **charcoal** (`surface`) and **raised charcoal** (`surface-raised`): canvas, panels and controls respectively.
- **Soft white** (`text`) and **muted silver** (`text-muted`): primary and supporting copy. `border` separates detail; `border-input` keeps editable fields visible.
- **Soft coral** (`danger`): errors and destructive labels; destructive buttons retain the raised neutral background.
- **Catalog atmosphere** (`art-clay`, `art-sea`, `art-night`, `art-sand`, `art-berry`, `art-forest`): genre tiles, liked-art accents and player gradient starts. These are authored catalog palettes, not colors extracted from cover images.

## Typography

Native text inherits the platform system font; the portable frontmatter records the system fallback stack from the token source. No custom font is bundled. Numeric native layout values use `px` equivalents here for portability; actual native text responds to platform font scaling.

The source roles stay intact: `display` introduces collections/auth, `xl` identifies screens and shelves, `lg` identifies subsections and sheet titles, `base` carries tracks/body copy, `sm` carries artist/collection metadata, and `xs` carries tab labels and player timing. Use the frontmatter hierarchy rather than adding another display face. Track/card titles commonly override body weight to 600; mini-player titles use (14/20, 600).

## Layout

[src/ui/Shell.tsx](src/ui/Shell.tsx) is the spatial authority: phone horizontal padding (16), wide padding (32), content maximum (1200), header minimum height (64). At width (960), browsing switches from three bottom tabs to a sidebar (248 wide, 24 padding). These source values take precedence over unused legacy layout entries in `tokens.json`.

Home has two-column shortcuts and horizontal shelves; music cards are (160) wide with (16) gaps. Shared track rows have minimum height (64), artwork (48), and independent save/options controls. Lists use `FlatList` in [MusicList](src/ui/MusicList.tsx), Search, Library and Queue; do not wrap these in another vertical scroller. Home shelves remain horizontal scroll views, not a claim that every collection is virtualized.

The mini-player sits above bottom tabs and safe-area padding. Its row is at least (62) plus a (2) progress rail. Player controls cap at (480); artwork adapts to window height, width and font scale. Sheets cap at (560) wide and 90% height; settings cap at (600). Retain safe-area/keyboard accommodations and allow translated copy to wrap. EN/RU/TK dictionaries and system-language fallback exist; linguistic and device acceptance remain open.

## Elevation & Depth

The rendered system uses tonal layering, not runtime drop shadows. Cards are flat; panels separate through background tone and spacing. Sheet scrims use black at (0.64) alpha; confirmation dialogs use (0.68). The player blends its catalog atmosphere into the canvas. The unused `shadow.pop` token is not a visual requirement.

**The Context Rule.** Keep the originating screen visible beneath an action sheet while blocking its input/focus. [src/ui/Screens.tsx](src/ui/Screens.tsx) retains that background and applies web inert/aria-hidden state.

## Shapes

Album/playlist artwork uses the small radius; artists use circles. Buttons/chips use pills; shared form fields use the medium radius. Mini-player and browse tiles use (8) corners; sheets have (20) top corners; dialogs use (16). Favor compact rectangular artwork and calm surfaces, keeping circular forms for people and transport. [Artwork](src/design/Artwork.tsx) provides neutral music, playlist or person glyphs as appropriate; it does not generate decorative cover art.

## Components

- **Buttons, icons and chips:** [Primitives](src/design/Primitives.tsx) defines primary/secondary/quiet/danger variants. Shared buttons and icon controls have minimum (48) bounds, a transparent (2) border that turns mint on focus, disabled opacity (0.45), and busy indicators. Chips reuse Button with tighter padding. The custom profile and queue handle also have actual (48×48) bounds. This is the target for new controls, not a blanket claim about every existing hit area.
- **Inputs:** labeled neutral fields use an input border and mint focus; errors turn the border coral and add text. Search has its own prominent soft-white field (52 minimum height), dark text and a (48×48) clear control in [Search.tsx](src/ui/screens/Search.tsx).
- **Cards and rows:** [common.tsx](src/ui/screens/common.tsx) keeps covers above two-line titles and metadata without enclosing shadows. [TrackRow](src/ui/TrackRow.tsx) marks current music in mint and explicitly dims unavailable tracks.
- **Navigation and mini-player:** [Shell](src/ui/Shell.tsx) uses text/icon selection; [MiniPlayer](src/ui/player/MiniPlayer.tsx) retains title, artist, play/pause, next and progress while browsing. Tabs switch without transition animation and are lazy mounted.
- **Full player:** [NowPlaying](src/ui/player/NowPlaying.tsx) removes browsing chrome, places artwork above metadata/seek/transport, and uses a white (72×72) central play control. The native stack presents it from below; the header/art region supports downward dismiss. There is no shared-element transition.
- **Sheets and dialogs:** [Sheet](src/ui/sheets/Sheet.tsx) provides a grip, header/close control, scrollable content, backdrop dismissal and hardware Back handling. [Dialog](src/ui/Dialog.tsx) provides explicit cancel/destructive actions. Native focus trapping and screen-reader behavior still need device verification.
- **Queue:** [Playback](src/ui/screens/Playback.tsx) groups Playing now, Up next and Earlier in queue; repeated tracks keep occurrence identity. Drag uses measured row frames. Web move buttons wrap below narrow rows at width below (600); native exposes adjustable accessibility actions. Removal has an Undo state (6500ms).

Press feedback in [Motion](src/design/Motion.tsx) scales to (0.975) and fades to (0.84) over (80ms), releasing over (140ms) with cubic ease-out. Artwork fades over (120ms). Sheets fade their scrim over (160ms) and enter over (240ms); player gesture dismissal uses (180ms). Player/sheet return springs use damping (26), stiffness (260); queue return uses stiffness (280). OS reduced motion removes press scale, artwork fade and sheet/player/queue translation; press opacity remains, stack navigation uses fade, and dialog animation becomes none. Haptics are optional, persisted locally and skipped on web. Static frames do not verify these timings on phones.

## Do's and Don'ts

### Do:
- **Do** use shared primitives, tokens and native system type for new screens.
- **Do** preserve visible music context, readable metadata and 48-unit targets for new controls.
- **Do** retain neutral entity-specific fallbacks, translated UI and system reduced-motion handling.
- **Do** label web captures and native/device measurements separately.

### Don't:
- **Don't** restore the rejected navy/amber identity or use Spotify branding/assets.
- **Don't** replace missing covers with repeated decorative records.
- **Don't** describe catalog palette gradients as cover-color extraction or claim shared-element motion.
- **Don't** treat the reviewed web/source candidate as native or public-release acceptance.
