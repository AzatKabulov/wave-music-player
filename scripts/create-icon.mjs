import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
const size = 1024,
  raw = Buffer.alloc((size * 4 + 1) * size),
  bg = [20, 37, 29],
  fg = [226, 223, 204],
  heights = [160, 300, 460, 220, 380, 120];
for (let y = 0; y < size; y++) {
  const row = y * (size * 4 + 1);
  for (let x = 0; x < size; x++) {
    let ink = false;
    for (let i = 0; i < heights.length; i++) {
      const left = 230 + i * 96;
      if (x >= left && x < left + 40 && Math.abs(y - 512) < heights[i] / 2)
        ink = true;
    }
    const at = row + 1 + x * 4;
    raw.set(ink ? [...fg, 255] : [...bg, 255], at);
  }
}
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let k = 0; k < 8; k++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  checksum.writeUInt32BE(crc(Buffer.concat([name, body])));
  return Buffer.concat([length, name, body, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
await writeFile(new URL("../assets/saz-icon.png", import.meta.url), png);
console.log("Original waveform app icon generated.");
