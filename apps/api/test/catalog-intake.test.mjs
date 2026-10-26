import test from "node:test";
import assert from "node:assert/strict";
import {
  appleRecordingCandidate,
  appleReleaseManifest,
} from "../src/catalog-intake.mjs";

const sourceUrl =
  "https://itunes.apple.com/lookup?id=100&entity=song&country=US";
const response = () => ({
  results: [
    {
      wrapperType: "collection",
      collectionId: 100,
      collectionName: "Source edition",
      artistName: "Artist",
      trackCount: 2,
    },
    {
      wrapperType: "track",
      kind: "song",
      trackId: 102,
      collectionId: 100,
      trackName: "Second",
      artistName: "Artist",
      discNumber: 1,
      trackNumber: 2,
      trackTimeMillis: 180000,
      trackViewUrl: "https://music.apple.com/us/album/second/100?i=102",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/100x100bb.jpg",
      previewUrl: "https://example.com/preview.mp3",
    },
    {
      wrapperType: "track",
      kind: "song",
      trackId: 101,
      collectionId: 100,
      trackName: "First",
      artistName: "Artist",
      discNumber: 1,
      trackNumber: 1,
      trackTimeMillis: 29000,
    },
  ],
});

test("single recording candidates require an intended edition and retain capability boundaries", () => {
  const song = { ...response().results[1], collectionName: "Source edition" };
  const parsed = appleRecordingCandidate(song, { sourceUrl });
  assert.equal(parsed.intendedVersion, "Source edition");
  assert.equal(parsed.sourceKey, "apple:102");
  assert.equal(parsed.sources.audio.status, "missing");
  assert.equal(parsed.sources.lyrics.status, "missing");
  assert.ok(!JSON.stringify(parsed).includes("preview.mp3"));
  assert.throws(
    () => appleRecordingCandidate(response().results[1], { sourceUrl }),
    /edition/i,
  );
  assert.throws(
    () =>
      appleRecordingCandidate({ ...song, kind: "music-video" }, { sourceUrl }),
    /song/i,
  );
});

test("release intake preserves exact edition/order and separates metadata from audio/lyrics", () => {
  const value = appleReleaseManifest(response(), {
    collectionId: 100,
    sourceUrl,
  });
  assert.equal(value.complete, true);
  assert.deepEqual(
    value.tracks.map((t) => t.sourceKey),
    ["apple:101", "apple:102"],
  );
  assert.equal(value.tracks[0].durationMs, 29000); // A genuine short album intro is not rejected as a preview.
  assert.equal(value.tracks[1].sources.audio.status, "missing");
  assert.equal(value.tracks[1].sources.audio.url, null);
  assert.equal(value.tracks[1].sources.lyrics.status, "missing");
  assert.equal(value.tracks[1].sources.metadata.status, "identified");
  assert.match(value.tracks[1].sources.artwork.url, /600x600bb/);
  assert.ok(!JSON.stringify(value).includes("preview.mp3"));
  assert.deepEqual(
    appleReleaseManifest(response(), { collectionId: 100, sourceUrl }),
    value,
  );
});

test("missing members and ambiguous identities cannot become a complete release", () => {
  const partial = response();
  partial.results[0].trackCount = 3;
  assert.equal(
    appleReleaseManifest(partial, { collectionId: 100, sourceUrl }).complete,
    false,
  );
  const gap = response();
  gap.results[1].trackNumber = 3;
  assert.equal(
    appleReleaseManifest(gap, { collectionId: 100, sourceUrl }).complete,
    false,
  );
  const duplicate = response();
  duplicate.results[1].trackId = 101;
  assert.throws(
    () => appleReleaseManifest(duplicate, { collectionId: 100, sourceUrl }),
    /duplicate/i,
  );
  const collision = response();
  collision.results[1].trackNumber = 1;
  assert.throws(
    () => appleReleaseManifest(collision, { collectionId: 100, sourceUrl }),
    /position/i,
  );
  assert.throws(
    () => appleReleaseManifest(response(), { collectionId: 200, sourceUrl }),
    /identity|edition/i,
  );
});

test("metadata adapters refuse untrusted origins and never treat music video as audio", () => {
  assert.throws(
    () =>
      appleReleaseManifest(response(), {
        collectionId: 100,
        sourceUrl: "https://example.com/lookup?id=100",
      }),
    /official/i,
  );
  const video = response();
  video.results[1].kind = "music-video";
  const parsed = appleReleaseManifest(video, { collectionId: 100, sourceUrl });
  assert.equal(parsed.complete, false);
  assert.equal(parsed.tracks.length, 1);
  const bad = response();
  bad.results[1].artworkUrl100 = "https://example.com/not-apple.jpg";
  assert.throws(
    () => appleReleaseManifest(bad, { collectionId: 100, sourceUrl }),
    /artwork|origin/i,
  );
});
