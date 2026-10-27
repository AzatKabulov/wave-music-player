export type ArtworkWindow = {
  id: string;
  previous?: string;
  next?: string;
  coordinate: number;
  pending?: { id: string; direction: 1 | -1 };
};

// Coordinates belong to queue entries, not their changing visible slot.
export function advanceArtworkWindow(
  old: ArtworkWindow,
  id: string,
  previous?: string,
  next?: string,
): ArtworkWindow {
  const direction =
    old.id === id
      ? 0
      : old.pending?.id === id
        ? old.pending.direction
        : old.next === id
          ? 1
          : old.previous === id
            ? -1
            : 0;
  return {
    id,
    previous,
    next,
    coordinate: old.coordinate + direction,
    pending: old.id === id ? old.pending : undefined,
  };
}
