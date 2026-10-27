import type { PlaybackSource, Snapshot } from "./types";

export function parsePlaybackSource(value: unknown): PlaybackSource | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.kind === "liked") return { kind: "liked" };
  if (
    raw.kind === "search" &&
    typeof raw.query === "string" &&
    raw.query.trim().length > 0 &&
    raw.query.length <= 160
  )
    return { kind: "search", query: raw.query.trim() };
  if (
    (raw.kind === "album" ||
      raw.kind === "artist" ||
      raw.kind === "playlist") &&
    typeof raw.id === "string" &&
    /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(raw.id)
  )
    return { kind: raw.kind, id: raw.id };
  return null;
}

export function playbackSourceLink(
  source: PlaybackSource | null | undefined,
  snapshot: Snapshot,
) {
  if (!source) return null;
  if (source.kind === "search")
    return {
      title: source.query,
      path: `/search?q=${encodeURIComponent(source.query)}`,
    };
  if (source.kind === "liked")
    return { title: "Liked tracks", path: "/liked", translate: true };
  const entity =
    source.kind === "album"
      ? snapshot.catalog.albums.find((item) => item.id === source.id)
      : source.kind === "artist"
        ? snapshot.catalog.artists.find((item) => item.id === source.id)
        : [...snapshot.playlists, ...snapshot.catalog.playlists].find(
            (item) => item.id === source.id,
          );
  if (!entity) return null;
  return {
    title: "title" in entity ? entity.title : entity.name,
    path: `/${source.kind}/${source.id}`,
  };
}
