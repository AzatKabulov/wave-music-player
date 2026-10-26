import type { QueueEntry, QueueState, Track } from "./types";
export function contextQueue(
  tracks: Track[],
  options: {
    revision: string;
    start: number;
    shuffle: boolean;
    explicitAllowed: boolean;
  },
  uuid: () => string,
  random = Math.random,
): { state: QueueState; canonical: QueueEntry[] } {
  const eligible = tracks
    .map((track, index) => ({ track, index }))
    .filter(
      ({ track }) =>
        track.available && (options.explicitAllowed || !track.explicit),
    );
  const canonical = eligible.map(({ track }) => ({
    id: uuid(),
    trackId: track.id,
    origin: "context" as const,
  }));
  const entries = options.shuffle
    ? shuffleEntries(canonical, null, random)
    : canonical;
  return {
    canonical,
    state: {
      revision: options.revision,
      entries,
      positionMs: 0,
      repeat: "none",
      shuffle: options.shuffle,
      currentId:
        (options.shuffle
          ? entries[0]?.id
          : entries[eligible.findIndex((item) => item.index === options.start)]
              ?.id) ||
        entries[0]?.id ||
        null,
    },
  };
}
export function moveEntry<T extends { id: string }>(
  entries: T[],
  id: string,
  delta: number,
): T[] {
  const from = entries.findIndex((e) => e.id === id),
    to = from + delta;
  if (from < 0 || to < 0 || to >= entries.length) return entries;
  const result = [...entries];
  const [entry] = result.splice(from, 1);
  result.splice(to, 0, entry);
  return result;
}
export function shuffleEntries(
  entries: QueueEntry[],
  currentId: string | null,
  random = Math.random,
): QueueEntry[] {
  const current = entries.find((e) => e.id === currentId),
    rest = entries.filter((e) => e.id !== currentId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return current ? [current, ...rest] : rest;
}
export function insertExplicit(
  entries: QueueEntry[],
  currentId: string | null,
  entry: QueueEntry,
): QueueEntry[] {
  let at = Math.max(0, entries.findIndex((e) => e.id === currentId) + 1);
  while (entries[at]?.origin === "explicit") at++;
  return [...entries.slice(0, at), entry, ...entries.slice(at)];
}
