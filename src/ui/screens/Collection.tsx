import { Check, MoreHorizontal, Play, Shuffle } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import type { Album, Artist, Playlist, Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { Button, IconButton, Label, StateView } from "../../design/Primitives";
import { Shell, go, ui } from "../Shell";
import { MusicList } from "../MusicList";
import { Cards, Section, formatTime } from "./common";

export function Collection({
  type,
  id,
}: {
  type: "album" | "playlist" | "artist";
  id: string;
}) {
  const m = useMusic(),
    sn = m.snapshot!,
    c = sn.catalog;
  const entity =
    type === "album"
      ? c.albums.find((x) => x.id === id)
      : type === "artist"
        ? c.artists.find((x) => x.id === id)
        : [...c.playlists, ...sn.playlists].find((x) => x.id === id);
  if (!entity)
    return (
      <Shell title="Collection" back>
        <StateView
          title="This collection is unavailable"
          message="It may have been removed or belong to another listener."
          action="Return to library"
          onAction={() => go("/library")}
        />
      </Shell>
    );
  const title = "name" in entity ? entity.name : entity.title;
  const artist = type === "artist" ? (entity as Artist) : null;
  const album = type === "album" ? (entity as Album) : null;
  const playlist = type === "playlist" ? (entity as Playlist) : null;
  const byId = new Map(c.tracks.map((track) => [track.id, track]));
  const ids = album
    ? album.trackIds
    : playlist
      ? playlist.items.map((item) => item.trackId)
      : c.tracks
          .filter((track) => track.artistId === id)
          .map((track) => track.id);
  const tracks = ids
    .map((trackId) => byId.get(trackId))
    .filter((track): track is Track => !!track);
  const kind =
    type === "album" ? "albums" : type === "artist" ? "artists" : "playlists";
  const saved = sn.library[kind].includes(id);
  const header = (
    <View style={s.header}>
      <View style={s.cover}>
        <Artwork
          palette={entity.palette}
          uri={album?.artworkUrl || playlist?.artworkUrl}
          size={232}
          round={!!artist}
        />
      </View>
      <Label type="display" accessibilityRole="header">
        {title}
      </Label>
      <Label color="text-muted" numberOfLines={artist ? 4 : undefined}>
        {artist
          ? artist.bio
          : album
            ? `${album.artist} · ${album.year}`
            : playlist?.description || "Your collection, your way."}
      </Label>
      <Label type="sm" color="text-muted">
        {playlist?.owner ? "Your playlist · " : ""}
        {tracks.length} tracks ·{" "}
        {formatTime(
          tracks.reduce((sum, track) => sum + track.durationMs, 0) / 1000,
        )}
      </Label>
      <View style={ui.h}>
        <View style={ui.row}>
          {playlist?.owner ? (
            <Button
              i18n
              title="Edit playlist"
              variant="secondary"
              onPress={() => go(`/edit/${id}`)}
            />
          ) : (
            <Button
              i18n
              title={
                saved
                  ? artist
                    ? "Following"
                    : "Saved"
                  : artist
                    ? "Follow"
                    : "Save"
              }
              icon={saved ? Check : undefined}
              variant="secondary"
              onPress={() => void m.save(kind, id, !saved)}
            />
          )}
          <IconButton
            icon={MoreHorizontal}
            label="Collection options"
            onPress={() => {
              if (playlist?.owner) go(`/edit/${id}`);
              else if (album?.artistId) go(`/artist/${album.artistId}`);
              else m.setNotice(`${tracks.length} available tracks`);
            }}
          />
        </View>
        <View style={ui.row}>
          <IconButton
            icon={Shuffle}
            label="Shuffle collection"
            disabled={!tracks.length || m.pending}
            onPress={() =>
              void m.playTracks([...tracks].sort(() => Math.random() - 0.5))
            }
          />
          <Button
            i18n
            title="Play"
            icon={Play}
            disabled={!tracks.length || m.pending}
            onPress={() => void m.playTracks(tracks)}
          />
        </View>
      </View>
      <Label type="lg">{artist ? "Popular tracks" : "Tracks"}</Label>
    </View>
  );
  const footer = artist ? (
    <Section title="Releases">
      <Cards
        items={c.albums.filter((item) => item.artistId === id)}
        type="album"
      />
    </Section>
  ) : album ? (
    <Button
      title={`Visit ${album.artist}`}
      variant="quiet"
      onPress={() => go(`/artist/${album.artistId}`)}
    />
  ) : undefined;
  return (
    <Shell
      title={
        type === "artist" ? "Artist" : type === "album" ? "Album" : "Playlist"
      }
      back
      scroll={false}
    >
      <MusicList tracks={tracks} header={header} footer={footer} />
    </Shell>
  );
}
const s = StyleSheet.create({
  header: { gap: 12, paddingBottom: 16 },
  cover: { alignItems: "center", paddingVertical: 16 },
});
