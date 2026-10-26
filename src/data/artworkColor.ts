const channels = (hex: string) =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const luminance = (hex: string) =>
  channels(hex).reduce((sum, value, index) => {
    const x = value / 255;
    return (
      sum +
      (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][index]
    );
  }, 0);
export function colorContrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function artworkSurface(
  color?: string,
  fallback = "#25252B",
  secondary = "#B5B5BF",
) {
  if (!color || !/^#[a-f0-9]{6}$/i.test(color)) return fallback;
  const rgb = channels(color);
  const tint = (factor: number) =>
    "#" +
    rgb
      .map((value) =>
        Math.floor(value * factor)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  // Darken only as much as the actual secondary foreground needs. No arbitrary
  // artist-ID hue, transparency guess, or cover-specific text exception.
  let low = 0,
    high = 1;
  for (let step = 0; step < 9; step++) {
    const mid = (low + high) / 2;
    if (
      colorContrast(tint(mid), secondary) >= 4.5 &&
      luminance(tint(mid)) <= luminance(secondary)
    )
      low = mid;
    else high = mid;
  }
  return tint(low);
}
