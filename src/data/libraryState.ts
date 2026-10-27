import type { LibraryEntry } from "./types";

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
  const rest = (previous || []).filter(
    (entry) => entry.kind !== kind || entry.id !== id,
  );
  return saved && addedAt && Number.isFinite(Date.parse(addedAt))
    ? [...rest, { kind, id, addedAt }]
    : rest;
}

type CollectionRow = {
  id: string;
  kind: string;
  title: string;
  creator: string;
  addedAt?: string;
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
