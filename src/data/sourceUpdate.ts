type SourceEntry = { id: string; trackId: string };

// Reusing an entry also reuses its authorized media URL. A renewed lease must
// replace the sources even when queue membership has not changed.
export function sourceUpdate(
  previous: SourceEntry[],
  next: SourceEntry[],
  sameLease: boolean,
): "reuse" | "append" | "replace" {
  if (!sameLease || !previous.length || next.length < previous.length)
    return "replace";
  const prefix = previous.every(
    (entry, index) =>
      entry.id === next[index].id && entry.trackId === next[index].trackId,
  );
  if (!prefix) return "replace";
  return previous.length === next.length ? "reuse" : "append";
}
