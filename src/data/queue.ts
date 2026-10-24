import type { QueueEntry } from "./types";
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
