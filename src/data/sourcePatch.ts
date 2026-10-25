type Entry = { id: string; trackId: string };
// Retain ordered sources on each side of the active MediaItem. Android's
// insert/remove APIs keep that item alive while its index changes.
export function sourcePatch<T extends Entry>(
  previous: T[],
  next: T[],
  currentId: string | null,
) {
  const anchor = previous.findIndex((item) => item.id === currentId);
  const target = next.findIndex((item) => item.id === currentId);
  if (
    anchor < 0 ||
    target < 0 ||
    previous[anchor].trackId !== next[target].trackId
  )
    return null;
  const positions = new Map(
    next.map((item, index) => [item.id, { index, trackId: item.trackId }]),
  );
  const retained = new Set([currentId]);
  let last = -1;
  for (let i = 0; i < previous.length; i++) {
    if (i === anchor) {
      last = target;
      continue;
    }
    const item = previous[i];
    const position = positions.get(item.id);
    if (
      position &&
      position.trackId === item.trackId &&
      position.index > last &&
      (i > anchor || position.index < target)
    ) {
      retained.add(item.id);
      last = position.index;
    }
  }
  return {
    remove: previous
      .flatMap((item, index) => (retained.has(item.id) ? [] : [index]))
      .reverse(),
    insert: next.flatMap((entry, index) =>
      retained.has(entry.id) ? [] : [{ entry, index }],
    ),
  };
}
