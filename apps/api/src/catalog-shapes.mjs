export const releaseMetadata = (row) => ({
  releaseType: row.release_type,
  releaseDate:
    row.release_date instanceof Date
      ? row.release_date.toISOString().slice(0, 10)
      : row.release_date
        ? String(row.release_date).slice(0, 10)
        : null,
  edition: row.edition || null,
  expectedTrackCount: row.expected_track_count,
  completeness: row.completeness,
});
export const recordingMetadata = (row) => ({
  contentKind: row.content_kind,
  explicitState: row.explicit_state,
  version: row.version_label || null,
  discNumber: row.disc_number,
  trackNumber: row.track_number,
});
export const artistMetadata = (row, baseUrl) => ({
  aliases: row.aliases || [],
  bioSource: row.bio_source || null,
  artworkUrl: row.image_asset_id
    ? `${baseUrl}/v1/artwork/${row.image_asset_id}`
    : undefined,
});
// One lookup for snapshot/search/detail. The user role cannot read storage keys.
export async function withArtworkMetadata(client, graph) {
  const assetId = (item) =>
    item.artworkUrl?.match(/\/v1\/artwork\/([a-f0-9-]{36})(?:\?|$)/i)?.[1];
  const ids = [
    ...new Set(Object.values(graph).flat().map(assetId).filter(Boolean)),
  ];
  if (!ids.length) return graph;
  const rows = (
    await client.query(
      "select id,sha256,dominant_color,width,height from music.media_assets where id=any($1::uuid[])",
      [ids],
    )
  ).rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const decorate = (item) => {
    const art = byId.get(assetId(item));
    if (!art) return item;
    return {
      ...item,
      artworkColor: art.dominant_color || undefined,
      artworkUrl: art.sha256
        ? `${item.artworkUrl}?v=${art.sha256}`
        : item.artworkUrl,
    };
  };
  return Object.fromEntries(
    Object.entries(graph).map(([kind, items]) => [kind, items.map(decorate)]),
  );
}
