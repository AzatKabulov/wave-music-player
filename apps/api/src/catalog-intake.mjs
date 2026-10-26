import { z } from "zod";

const externalId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const collectionSchema = z.object({
  collectionId: externalId,
  collectionName: z.string().trim().min(1).max(300),
  artistName: z.string().trim().min(1).max(240),
  trackCount: z.int().min(1).max(5000),
});
const songSchema = z.object({
  trackId: externalId,
  collectionId: externalId,
  trackName: z.string().trim().min(1).max(300),
  collectionName: z.string().trim().min(1).max(300).optional(),
  artistName: z.string().trim().min(1).max(240),
  artistId: externalId.optional(),
  discNumber: z.int().min(1).max(100).default(1),
  discCount: z.int().min(1).max(100).optional(),
  trackNumber: z.int().min(1).max(5000),
  trackTimeMillis: z.int().min(1).max(7200000),
  trackExplicitness: z.enum(["explicit", "cleaned", "notExplicit"]).optional(),
  trackViewUrl: z.string().max(2048).optional(),
  artworkUrl100: z.string().max(2048).optional(),
});
function officialUrl(value, artwork = false) {
  const url = new URL(value);
  const allowed = artwork
    ? url.hostname.endsWith(".mzstatic.com")
    : ["itunes.apple.com", "music.apple.com"].includes(url.hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !allowed
  )
    throw Error(
      artwork
        ? "Untrusted artwork origin"
        : "An official metadata URL is required",
    );
  return url.toString();
}

export function appleRecordingCandidate(input, { sourceUrl, releaseTitle }) {
  if (input?.kind !== "song") throw Error("An audio song is required");
  const song = songSchema.parse(input);
  const intendedVersion = releaseTitle || song.collectionName;
  if (!intendedVersion) throw Error("An intended release edition is required");
  const source = officialUrl(sourceUrl);
  return {
    sourceKey: `apple:${song.trackId}`,
    sourceTrackId: String(song.trackId),
    sourceCollectionId: String(song.collectionId),
    title: song.trackName,
    artist: song.artistName,
    sourceArtistId: song.artistId ? String(song.artistId) : null,
    intendedVersion,
    discNumber: song.discNumber,
    trackNumber: song.trackNumber,
    durationMs: song.trackTimeMillis,
    expectedExplicitState:
      song.trackExplicitness === "explicit"
        ? "explicit"
        : song.trackExplicitness
          ? "clean"
          : "unknown",
    sources: {
      audio: { status: "missing", url: null },
      metadata: {
        status: "identified",
        url: song.trackViewUrl ? officialUrl(song.trackViewUrl) : source,
      },
      artwork: {
        status: song.artworkUrl100 ? "identified" : "missing",
        url: song.artworkUrl100
          ? officialUrl(song.artworkUrl100, true).replace(/100x100/g, "600x600")
          : null,
      },
      lyrics: { status: "missing", url: null },
    },
  };
}

// Metadata describes intended identity; it never supplies a full recording or
// establishes an audio/lyrics capability. Apple previews are deliberately ignored.
export function appleReleaseManifest(response, { collectionId, sourceUrl }) {
  const intended = externalId.parse(Number(collectionId));
  const source = officialUrl(sourceUrl);
  const requested = new URL(source).searchParams.get("id");
  if (requested && requested !== String(intended))
    throw Error("Release identity does not match the lookup");
  const results = z
    .object({ results: z.array(z.unknown()).max(10000) })
    .parse(response).results;
  const releases = results.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      item.wrapperType === "collection" &&
      item.collectionId === intended,
  );
  if (releases.length !== 1)
    throw Error("The intended release edition is missing or ambiguous");
  const release = collectionSchema.parse(releases[0]);
  const songs = results
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        item.kind === "song" &&
        item.collectionId === intended,
    )
    .map((item) => songSchema.parse(item))
    .sort(
      (a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber,
    );
  const seen = new Set(),
    positions = new Set();
  for (const song of songs) {
    if (seen.has(song.trackId))
      throw Error("Duplicate recording identity in release metadata");
    const position = `${song.discNumber}:${song.trackNumber}`;
    if (positions.has(position))
      throw Error("Conflicting release position in metadata");
    seen.add(song.trackId);
    positions.add(position);
  }
  const warnings = [];
  if (songs.length !== release.trackCount)
    warnings.push("The source count and returned audio members differ");
  const discs = new Map();
  for (const song of songs) {
    const numbers = discs.get(song.discNumber) || [];
    numbers.push(song.trackNumber);
    discs.set(song.discNumber, numbers);
  }
  const expectedDiscs = Math.max(
    1,
    ...songs.map((song) => song.discCount || song.discNumber),
  );
  if (discs.size !== expectedDiscs) warnings.push("A source disc is missing");
  for (const [disc, numbers] of discs)
    if (numbers.some((number, index) => number !== index + 1))
      warnings.push(`Disc ${disc} has missing positions`);
  return {
    sourceKey: `apple-release:${intended}`,
    sourceCollectionId: String(intended),
    title: release.collectionName,
    artist: release.artistName,
    expectedTrackCount: release.trackCount,
    metadataSource: source,
    complete: warnings.length === 0 && songs.length > 0,
    warnings,
    tracks: songs.map((song) =>
      appleRecordingCandidate(
        { ...song, kind: "song" },
        { sourceUrl: source, releaseTitle: release.collectionName },
      ),
    ),
  };
}
