import { fail } from "./common.mjs";

const maxBytes = 10485760;
export function cloudArtworkKey(asset, width) {
  if (!width) return asset.storage_key;
  if (
    !["128", "320", "768"].includes(String(width)) ||
    !/^[a-f0-9]{64}$/.test(asset.sha256 || "")
  )
    throw Error("Unsupported cloud artwork variant.");
  return `artwork/${asset.id}-${asset.sha256}-${width}.jpg`;
}

// The bucket stays private. Signed provider URLs never leave the backend.
export async function loadCloudArtwork(
  storage,
  bucket,
  asset,
  width,
  transport = fetch,
) {
  try {
    if (!bucket || Number(asset.byte_size) > maxBytes)
      throw Error("Invalid artwork configuration.");
    const signed = await storage
      .from(bucket)
      .createSignedUrl(cloudArtworkKey(asset, width), 60);
    if (signed.error || !signed.data?.signedUrl) throw Error("Signing failed.");
    const response = await transport(signed.data.signedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    const mimeType = width ? "image/jpeg" : asset.mime_type;
    if (
      !response.ok ||
      !response.body ||
      response.headers.get("content-type")?.split(";")[0] !== mimeType ||
      Number(response.headers.get("content-length")) > maxBytes
    )
      throw Error("Invalid artwork response.");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > maxBytes) throw Error("Artwork too large.");
      chunks.push(Buffer.from(chunk));
    }
    if (!size || (!width && size !== Number(asset.byte_size)))
      throw Error("Incomplete artwork.");
    return { buffer: Buffer.concat(chunks), mimeType };
  } catch {
    fail(503, "storage_unavailable", "The artwork is temporarily unavailable.");
  }
}
