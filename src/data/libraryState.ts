import type { LibraryEntry } from "./types";

// Keep in step with the API cap; the server remains the authority.
export const maxLibraryPins = 8;

export function savedIds(previous: string[], id: string, saved: boolean) {
  const rest = previous.filter((value) => value !== id);
  return saved ? [id, ...rest] : rest;
}

export function datedSave(
  previous: LibraryEntry[] | undefined,
  kind: LibraryEntry["kind"],
  id: string,
  saved: boolean,
  addedAt?: string,
): LibraryEntry[] {
  const current = (previous || []).find(
    (entry) => entry.kind === kind && entry.id === id,
  );
  const rest = (previous || []).filter(
    (entry) => entry.kind !== kind || entry.id !== id,
  );
  // Saving an item that is already saved keeps its pin; leaving the Library drops it,
  // matching the server, which clears the pin when the collection is unsaved.
  return saved && addedAt && Number.isFinite(Date.parse(addedAt))
    ? [
        ...rest,
        {
          kind,
          id,
          addedAt,
          ...(current?.pinnedAt ? { pinnedAt: current.pinnedAt } : {}),
        },
      ]
    : rest;
}

export function withPin(
  previous: LibraryEntry[] | undefined,
  kind: LibraryEntry["kind"],
  id: string,
  pinnedAt?: string,
): LibraryEntry[] {
  return (previous || []).map((entry) => {
    if (entry.kind !== kind || entry.id !== id) return entry;
    const next = { ...entry };
    if (pinnedAt && Number.isFinite(Date.parse(pinnedAt)))
      next.pinnedAt = pinnedAt;
    else delete next.pinnedAt;
    return next;
  });
}

export function pinCount(entries: LibraryEntry[] | undefined) {
  return (entries || []).filter(
    (entry) => entry.pinnedAt && Number.isFinite(Date.parse(entry.pinnedAt)),
  ).length;
}

type CollectionRow = {
  id: string;
  kind: string;
  title: string;
  creator: string;
  addedAt?: string;
  pinnedAt?: string;
};
export function libraryMatches(
  title: string,
  creator: string,
  query: string,
  locale = "en",
) {
  const normalized = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase(locale)
      .trim();
  return normalized(`${title} ${creator}`).includes(normalized(query));
}
export function orderedLibrary<T extends CollectionRow>(
  entries: T[],
  sort: "recent" | "title" | "creator",
  locale = "en",
): T[] {
  const text = (a: string, b: string) =>
    a.localeCompare(b, locale, { sensitivity: "base", numeric: true });
  const time = (value?: string) =>
    value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return [...entries].sort((a, b) => {
    // Pins lead under every sort and filter, most recently pinned first; unpinned
    // rows all compare as 0 and fall through to the chosen order.
    const pinned = time(b.pinnedAt) - time(a.pinnedAt);
    if (pinned) return pinned;
    const primary =
      sort === "recent"
        ? time(b.addedAt) - time(a.addedAt)
        : text(
            sort === "title" ? a.title : a.creator,
            sort === "title" ? b.title : b.creator,
          );
    return (
      primary ||
      text(a.title, b.title) ||
      text(`${a.kind}:${a.id}`, `${b.kind}:${b.id}`)
    );
  });
}
