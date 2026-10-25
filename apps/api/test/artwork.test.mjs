import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createDatabase } from "../src/database.mjs";
import sharp from "sharp";
import { createApp } from "../src/app.mjs";

test("personal artwork is linked to a published album and never exposes audio assets", async () => {
  const db = await createDatabase({ memory: true });
  const dir = await mkdtemp(join(tmpdir(), "musify-art-"));
  const id = randomUUID();
  const png = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#446155" },
  })
    .png()
    .toBuffer();
  await writeFile(join(dir, `${id}.png`), png);
  await db.admin(async (c) => {
    await c.query(
      "insert into music.media_assets(id,source_id,kind,storage_key,mime_type,byte_size,status) values($1,'10000000-0000-4000-8000-000000000998','image',$2,'image/png',$3,'ready')",
      [id, `personal/${id}.png`, png.length],
    );
    await c.query(
      "update music.albums set cover_asset_id=$1 where id=(select id from music.albums limit 1)",
      [id],
    );
  });
  const app = await createApp({
    db,
    personalTest: true,
    personalMediaRoot: pathToFileURL(`${dir}/`),
    baseUrl: "http://192.168.0.4:4103",
  });
  const ordinary = await createApp({ db });
  try {
    const response = await app.inject({
      method: "GET",
      url: `/v1/artwork/${id}`,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/png");
    assert.deepEqual(response.rawPayload, png);
    const thumbnail = await app.inject({
      method: "GET",
      url: `/v1/artwork/${id}?w=128`,
    });
    assert.equal(thumbnail.statusCode, 200, thumbnail.body);
    assert.equal(thumbnail.headers["content-type"], "image/jpeg");
    assert.equal(thumbnail.headers["cache-control"], "private, max-age=86400");
    assert.equal(
      (await app.inject({ method: "GET", url: `/v1/artwork/${id}?w=9999` }))
        .statusCode,
      422,
    );
    assert.equal(
      (await ordinary.inject({ method: "GET", url: `/v1/artwork/${id}` }))
        .statusCode,
      404,
    );
    const audio = await db.admin(
      async (c) =>
        (
          await c.query(
            "select id from music.media_assets where kind='audio' limit 1",
          )
        ).rows[0].id,
    );
    assert.equal(
      (await app.inject({ method: "GET", url: `/v1/artwork/${audio}` }))
        .statusCode,
      404,
    );
    const auth = (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json();
    const snapshot = (
      await app.inject({
        method: "GET",
        url: "/v1/snapshot",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      })
    ).json();
    assert.ok(
      snapshot.catalog.albums.some(
        (album) =>
          album.artworkUrl === `http://192.168.0.4:4103/v1/artwork/${id}`,
      ),
    );
    await db.admin((c) =>
      c.query("update music.media_assets set status='withdrawn' where id=$1", [
        id,
      ]),
    );
    assert.equal(
      (await app.inject({ method: "GET", url: `/v1/artwork/${id}` }))
        .statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ method: "GET", url: `/v1/artwork/${id}?w=128` }))
        .statusCode,
      404,
    );
  } finally {
    await app.close();
    await ordinary.close();
    await db.close();
    await unlink(join(dir, `${id}.png`));
    await unlink(join(dir, "variants", `${id}-128.jpg`)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await rmdir(join(dir, "variants")).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await rmdir(dir);
  }
});
