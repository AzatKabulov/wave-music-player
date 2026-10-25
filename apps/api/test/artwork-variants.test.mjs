import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { artworkVariant } from "../src/artwork-variants.mjs";
test("artwork variants bound decoded dimensions, share work and reuse the disk cache", async () => {
  const dir = await mkdtemp(join(tmpdir(), "musify-artwork-"));
  try {
    const root = pathToFileURL(`${dir}/`);
    const source = await sharp({
      create: { width: 600, height: 600, channels: 3, background: "#a83261" },
    })
      .png()
      .toBuffer();
    const [first, second] = await Promise.all([
      artworkVariant(source, root, "fixture", 128),
      artworkVariant(source, root, "fixture", 128),
    ]);
    assert.deepEqual(first, second);
    const metadata = await sharp(first).metadata();
    assert.equal(metadata.width, 128);
    assert.equal(metadata.height, 128);
    assert.equal(metadata.format, "jpeg");
    assert.equal((await readdir(dir)).length, 1);
    assert.deepEqual(
      await artworkVariant(Buffer.from("invalid"), root, "fixture", 128),
      first,
    );
    await assert.rejects(artworkVariant(source, root, "fixture", 4096));
  } finally {
    await unlink(join(dir, "fixture-128.jpg"));
    await rmdir(dir);
  }
});
