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
  const stats = await sharp(decoded.data, { raw: decoded.info })
    .resize({ width: 64, height: 64, fit: "inside" })
    .stats();
  return {
    width: decoded.info.width,
    height: decoded.info.height,
    dominantColor:
      "#" +
      [stats.dominant.r, stats.dominant.g, stats.dominant.b]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join(""),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    paletteVersion: 1,
  };
}
