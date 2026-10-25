export function savedIds(previous: string[], id: string, saved: boolean) {
  const rest = previous.filter((value) => value !== id);
  return saved ? [id, ...rest] : rest;
}
