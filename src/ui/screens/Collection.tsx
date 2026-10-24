import { Check, Play, Plus } from "lucide-react-native";
import { View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import type { Album, Artist, Playlist, Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { Button, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

import { Cards, Section, Tracks, formatTime, s } from "./common";
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
  const title = "name" in entity ? entity.name : entity.title,
    artist = type === "artist" ? (entity as Artist) : null,
    album = type === "album" ? (entity as Album) : null,
    playlist = type === "playlist" ? (entity as Playlist) : null;
  const tracks = album
    ? album.trackIds
        .map((id) => c.tracks.find((t) => t.id === id))
        .filter((x): x is Track => !!x)
    : playlist
      ? playlist.items
          .map((i) => c.tracks.find((t) => t.id === i.trackId))
          .filter((x): x is Track => !!x)
      : c.tracks.filter((t) => t.artistId === id);
  const saved =
      sn.library[
        type === "album"
          ? "albums"
          : type === "artist"
            ? "artists"
            : "playlists"
      ].includes(id),
    kind =
      type === "album" ? "albums" : type === "artist" ? "artists" : "playlists";
  return (
    <Shell
      title={
        type === "artist" ? "Artist" : type === "album" ? "Album" : "Playlist"
      }
      back
    >
      <View style={s.collectionHeader}>
        <Artwork
          palette={entity.palette}
          size={t.space[192]}
          round={type === "artist"}
        />
        <View style={s.collectionCopy}>
          <Label type="xs" color="text-muted">
            {playlist?.owner ? "YOUR PLAYLIST" : type.toUpperCase()}
          </Label>
          <Label type="display" accessibilityRole="header">
            {title}
          </Label>
          <Label color="text-muted">
            {artist
              ? artist.bio
              : album
                ? `${album.artist} · ${album.year}`
                : playlist?.description}
          </Label>
          <Label type="sm" color="text-muted">
            {tracks.length} tracks ·{" "}
            {formatTime(
              tracks.reduce((sum, x) => sum + x.durationMs, 0) / 1000,
            )}
          </Label>
          <View style={ui.wrap}>
            <Button
              title="Play"
              icon={Play}
              disabled={!tracks.length || m.pending}
              onPress={() => void m.playTracks(tracks)}
            />
            {!playlist?.owner ? (
              <Button
                title={
                  saved
                    ? artist
                      ? "Following"
                      : "Saved"
                    : artist
                      ? "Follow"
                      : "Save"
                }
                icon={saved ? Check : Plus}
                variant="secondary"
                onPress={() => void m.run(() => m.data.save(kind, id, !saved))}
              />
            ) : (
              <Button
                title="Edit playlist"
                variant="secondary"
                onPress={() => go(`/edit/${id}`)}
              />
            )}
          </View>
        </View>
      </View>
      <Section title={artist ? "Popular tracks" : "Tracks"}>
        <Tracks tracks={tracks} />
      </Section>
      {artist ? (
        <Section title="Releases">
          <Cards
            items={c.albums.filter((x) => x.artistId === id)}
            type="album"
          />
        </Section>
      ) : null}
      {album ? (
        <Button
          title={`Visit ${album.artist}`}
          variant="quiet"
          onPress={() => go(`/artist/${album.artistId}`)}
        />
      ) : null}
    </Shell>
  );
}
