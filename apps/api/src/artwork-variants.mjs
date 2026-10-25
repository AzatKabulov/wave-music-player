import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const pending = new Map();
export async function artworkVariant(source, cacheRoot, key, width) {
  if (![128, 320, 768].includes(width))
    throw Error("Unsupported artwork size.");
  const destination = new URL(`${key}-${width}.jpg`, cacheRoot);
  try {
    return await readFile(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const cacheKey = destination.href;
  if (pending.has(cacheKey)) return pending.get(cacheKey);
  const request = (async () => {
    const buffer = await sharp(source, { limitInputPixels: 16777216 })
      .rotate()
      .resize(width, width, { fit: "cover", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(destination, buffer);
    return buffer;
  })().finally(() => pending.delete(cacheKey));
  pending.set(cacheKey, request);
  return request;
}
