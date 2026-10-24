import { deflateSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
const bg = [16, 22, 35],
  fg = [245, 189, 114];
const polygons = [
  [
    [4, 3],
    [15, 3],
    [21, 9],
    [18, 12],
    [13, 7],
    [4, 7],
  ],
  [
    [21, 9],
    [21, 15],
    [15, 21],
    [9, 21],
    [3, 15],
    [3, 10],
    [7, 10],
    [7, 13],
    [11, 17],
    [13, 17],
    [17, 13],
    [17, 9],
  ],
];
const path =
  "M4 3H15L21 9L18 12L13 7H4Z M21 9V15L15 21H9L3 15V10H7V13L11 17H13L17 13V9Z";
function inside(x, y, p) {
  let yes = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i],
      [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      yes = !yes;
  }
  return yes;
}
function crc(bytes) {
  let v = 0xffffffff;
  for (const byte of bytes) {
    v ^= byte;
    for (let k = 0; k < 8; k++) v = (v >>> 1) ^ (v & 1 ? 0xedb88320 : 0);
  }
  return (v ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const name = Buffer.from(type),
    len = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  sum.writeUInt32BE(crc(Buffer.concat([name, body])));
  return Buffer.concat([len, name, body, sum]);
}
function png(size, transparent = false, scale = 1) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = (((x + 0.5) / size - 0.5) * 24) / scale + 12,
        py = (((y + 0.5) / size - 0.5) * 24) / scale + 12;
      const ink = polygons.some((p) => inside(px, py, p));
      raw.set(
        ink ? [...fg, 255] : [...bg, transparent ? 0 : 255],
        y * (size * 4 + 1) + 1 + x * 4,
      );
    }
  const h = Buffer.alloc(13);
  h.writeUInt32BE(size);
  h.writeUInt32BE(size, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const dir = new URL("../assets/brand/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(
  new URL("../assets/owaryn-icon.png", import.meta.url),
  png(1024),
);
await writeFile(
  new URL("../assets/owaryn-adaptive.png", import.meta.url),
  png(1024, true, 0.76),
);
for (const size of [16, 32, 48, 180, 512])
  await writeFile(new URL(`favicon-${size}.png`, dir), png(size));
await writeFile(
  new URL("owaryn-mark.svg", dir),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F5BD72" d="${path}"/></svg>`,
);
await writeFile(
  new URL("owaryn-lockup.svg", dir),
  `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="120" viewBox="0 0 580 120"><g transform="translate(0,0) scale(5)"><path fill="#F5BD72" d="${path}"/></g><text x="142" y="88" font-family="system-ui,sans-serif" font-size="88" font-weight="600" letter-spacing="-4" fill="#FAF5EA">owaryn</text></svg>`,
);
await writeFile(
  new URL("social-1200x630.svg", dir),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#101623"/><circle cx="1060" cy="70" r="380" fill="#1B2434"/><path d="M880 10L1180 350L1010 630" fill="none" stroke="#35435B" stroke-width="100"/><g transform="translate(76,68) scale(3)"><path fill="#F5BD72" d="${path}"/></g><text x="166" y="123" fill="#FAF5EA" font-family="system-ui,sans-serif" font-size="54" font-weight="600">owaryn</text><text x="80" y="300" fill="#FAF5EA" font-family="system-ui,sans-serif" font-size="76" font-weight="600">Keep your</text><text x="80" y="386" fill="#F5BD72" font-family="system-ui,sans-serif" font-size="76" font-weight="600">own rhythm.</text><text x="84" y="510" fill="#C0CADB" font-family="system-ui,sans-serif" font-size="26">A personal place for the music you choose.</text><text x="84" y="567" fill="#C0CADB" font-family="system-ui,sans-serif" font-size="18">Working identity · Original demo recordings</text></svg>`,
);
const sizes = [16, 32, 48],
  images = sizes.map((s) => png(s)),
  hdr = Buffer.alloc(6 + 16 * 3);
hdr.writeUInt16LE(1, 2);
hdr.writeUInt16LE(3, 4);
let offset = hdr.length;
for (let i = 0; i < 3; i++) {
  const p = 6 + i * 16;
  hdr[p] = sizes[i];
  hdr[p + 1] = sizes[i];
  hdr.writeUInt16LE(1, p + 4);
  hdr.writeUInt16LE(32, p + 6);
  hdr.writeUInt32LE(images[i].length, p + 8);
  hdr.writeUInt32LE(offset, p + 12);
  offset += images[i].length;
}
await writeFile(new URL("favicon.ico", dir), Buffer.concat([hdr, ...images]));
console.log(
  "Original Owaryn icons, SVG lockup, favicon set and social source generated.",
);
