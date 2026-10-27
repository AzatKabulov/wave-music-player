import test from "node:test";
import assert from "node:assert/strict";
import { loadCloudArtwork, cloudArtworkKey } from "../src/cloud-artwork.mjs";

const asset = {
  id: "10000000-0000-4000-8000-000000000001",
  storage_key: "personal/10000000-0000-4000-8000-000000000001.png",
  sha256: "a".repeat(64),
  mime_type: "image/png",
  byte_size: 4,
};
test("cloud artwork loads only a short-lived signed object and chooses pre-generated thumbnails", async () => {
  const signed = [];
  const storage = {
    from: (bucket) => ({
      createSignedUrl: async (key, seconds) => {
        signed.push({ bucket, key, seconds });
        return { data: { signedUrl: "https://example.supabase.co/object" } };
      },
    }),
  };
  const result = await loadCloudArtwork(
    storage,
    "private-covers",
    asset,
    "320",
    async (url, init) => {
      assert.equal(url, "https://example.supabase.co/object");
      assert.equal(init.redirect, "error");
      return new Response(Buffer.from([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      });
    },
  );
  assert.deepEqual(signed, [
    {
      bucket: "private-covers",
      key: `artwork/${asset.id}-${asset.sha256}-320.jpg`,
      seconds: 60,
    },
  ]);
  assert.equal(result.mimeType, "image/jpeg");
  assert.deepEqual(result.buffer, Buffer.from([1, 2, 3]));
  assert.equal(cloudArtworkKey(asset), asset.storage_key);
  assert.throws(() => cloudArtworkKey(asset, "9999"));
});

test("missing, oversized, mismatched and failed cloud artwork is rejected", async () => {
  const storage = {
    from: () => ({
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.supabase.co/object" },
      }),
    }),
  };
  const load = (response) =>
    loadCloudArtwork(storage, "covers", asset, undefined, async () => response);
  await assert.rejects(load(new Response("missing", { status: 404 })));
  await assert.rejects(
    load(new Response("html", { headers: { "content-type": "text/html" } })),
  );
  await assert.rejects(
    load(
      new Response("huge", {
        headers: { "content-type": "image/png", "content-length": "10485761" },
      }),
    ),
  );
  await assert.rejects(
    load(
      new Response("wrong length", {
        headers: { "content-type": "image/png" },
      }),
    ),
  );
  await assert.rejects(
    loadCloudArtwork(
      {
        from: () => ({
          createSignedUrl: async () => ({
            error: new Error("private provider detail"),
          }),
        }),
      },
      "covers",
      asset,
    ),
  );
});
