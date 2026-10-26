import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { inspectArtwork } from "../src/artwork-metadata.mjs";

test("cover metadata is measured from decoded pixels, not inferred from an artist ID", async () => {
  const bytes = await sharp({
    create: { width: 600, height: 598, channels: 3, background: "#356578" },
  })
    .png()
    .toBuffer();
  const result = await inspectArtwork(bytes);
  assert.equal(result.width, 600);
  assert.equal(result.height, 598);
  assert.match(result.dominantColor, /^#[a-f0-9]{6}$/);
  assert.ok(
    parseInt(result.dominantColor.slice(1, 3), 16) <
      parseInt(result.dominantColor.slice(5, 7), 16),
  );
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(await inspectArtwork(bytes), result);
  await assert.rejects(() => inspectArtwork(Buffer.from("not an image")));
  await assert.rejects(() =>
    inspectArtwork(bytes.subarray(0, bytes.length / 2)),
  );
});
