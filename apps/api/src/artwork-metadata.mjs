import { createHash } from "node:crypto";
import sharp from "sharp";

export async function inspectArtwork(bytes) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw Error("Artwork byte limit exceeded");
  const input = sharp(bytes, { failOn: "warning", limitInputPixels: 16000000 });
  const metadata = await input.metadata();
  if (
    !["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format) ||
    (metadata.pages || 1) > 1
  )
    throw Error("A still raster cover is required");
  // Decode the entire source first, so a valid header cannot hide truncation.
  const decoded = await input
    .rotate()
    .flatten({ background: "#151518" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sample = await sharp(decoded.data, { raw: decoded.info })
    .resize({ width: 64, height: 64, fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let at = 0; at < sample.data.length; at += sample.info.channels) {
    const [r, g, b] = sample.data.subarray(at, at + 3);
    const high = Math.max(r, g, b),
      chroma = high - Math.min(r, g, b);
    if (high < 64 || chroma < 20) continue;
    const key = `${r >> 5}:${g >> 5}:${b >> 5}`;
    const bin = bins.get(key) || { r: 0, g: 0, b: 0, count: 0, weight: 0 };
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bin.count++;
    bin.weight += 1 + chroma / 255;
    bins.set(key, bin);
  }
  // Ignore black borders and neutral lettering when choosing the atmosphere;
  // retain a neutral dominant fallback for genuinely monochrome covers.
  const best = [...bins.values()].sort((a, b) => b.weight - a.weight)[0];
  const fallback = best
    ? null
    : (await sharp(sample.data, { raw: sample.info }).stats()).dominant;
  const color = best
    ? [best.r, best.g, best.b].map((n) => Math.round(n / best.count))
    : [fallback.r, fallback.g, fallback.b];
  return {
    width: decoded.info.width,
    height: decoded.info.height,
    dominantColor:
      "#" + color.map((n) => n.toString(16).padStart(2, "0")).join(""),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    paletteVersion: 2,
  };
}
