import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../apps/api/data/personal-media/", import.meta.url);
const files = (await readdir(root)).filter((name) =>
  /^[0-9a-f-]{36}\.(jpg|png)$/.test(name),
);
const samples = [];
for (const file of files) {
  const original = (await stat(new URL(file, root))).size;
  const sizes = {};
  for (const width of [128, 320, 768]) {
    const response = await fetch(
      `http://192.168.0.4:4103/v1/artwork/${file.slice(0, 36)}?w=${width}`,
    );
    if (!response.ok) throw Error(`Artwork variant ${response.status}`);
    sizes[width] = (await response.arrayBuffer()).byteLength;
  }
  samples.push({
    assetId: file.slice(0, 36),
    originalBytes: original,
    variantBytes: sizes,
  });
}
const sum = (field) => samples.reduce((total, item) => total + field(item), 0);
const original = sum((item) => item.originalBytes);
const report = {
  at: new Date().toISOString(),
  scope:
    "Existing personal artwork only; same source covers, HTTP response byte sizes, no startup/frame-rate inference",
  samples,
  totals: {
    originalBytes: original,
    row128Bytes: sum((item) => item.variantBytes[128]),
    shelf320Bytes: sum((item) => item.variantBytes[320]),
    row128ReductionPercent:
      100 * (1 - sum((item) => item.variantBytes[128]) / original),
    shelf320ReductionPercent:
      100 * (1 - sum((item) => item.variantBytes[320]) / original),
  },
};
await mkdir("tasks/evidence/candidate", { recursive: true });
await writeFile(
  "tasks/evidence/candidate/artwork-sizes.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ covers: samples.length, ...report.totals }));
