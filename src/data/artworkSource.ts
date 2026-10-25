export function sizedArtwork(
  uri: string | undefined,
  size: number,
  scale: number,
) {
  if (!uri || !/\/v1\/artwork\/[a-f0-9-]{36}(?:\?|$)/i.test(uri)) return uri;
  const pixels = size * Math.min(3, Math.max(1, scale));
  const width = pixels <= 128 ? 128 : pixels <= 320 ? 320 : 768;
  const url = new URL(uri);
  url.searchParams.set("w", String(width));
  return url.toString();
}
