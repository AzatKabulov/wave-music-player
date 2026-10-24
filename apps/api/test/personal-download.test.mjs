import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerPersonalDownload } from "../src/personal-download.mjs";

test("the personal installer serves the APK as a named attachment and supports resume", async () => {
  const dir = await mkdtemp(join(tmpdir(), "musify-apk-"));
  const file = join(dir, "test.apk");
  const bytes = Buffer.from("PK\x03\x04test-archive-fixture");
  await writeFile(file, bytes);
  const app = Fastify();
  const ordinary = Fastify();
  registerPersonalDownload(app, { enabled: true, apkFile: file });
  registerPersonalDownload(ordinary, { apkFile: file });
  try {
    const full = await app.inject({ method: "GET", url: "/test/android.apk" });
    assert.equal(full.statusCode, 200);
    assert.equal(
      full.headers["content-type"],
      "application/vnd.android.package-archive",
    );
    assert.equal(
      full.headers["content-disposition"],
      'attachment; filename="Musify.apk"',
    );
    assert.deepEqual(full.rawPayload, bytes);
    const part = await app.inject({
      method: "GET",
      url: "/test/android.apk",
      headers: { range: "bytes=0-3" },
    });
    assert.equal(part.statusCode, 206);
    assert.deepEqual(part.rawPayload, bytes.subarray(0, 4));
    const head = await app.inject({ method: "HEAD", url: "/test/android.apk" });
    assert.equal(head.statusCode, 200);
    assert.equal(Number(head.headers["content-length"]), bytes.length);
    assert.equal(head.rawPayload.length, 0);
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/test/android.apk",
          headers: { range: "bytes=999-" },
        })
      ).statusCode,
      416,
    );
    assert.equal(
      (await ordinary.inject({ method: "GET", url: "/test/android.apk" }))
        .statusCode,
      404,
    );
  } finally {
    await app.close();
    await ordinary.close();
    await unlink(file);
    await rmdir(dir);
  }
});
