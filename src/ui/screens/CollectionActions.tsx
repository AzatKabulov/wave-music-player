import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  CheckCircle2,
  CirclePlus,
  ListMusic,
  Pencil,
  Play,
  Shuffle,
  UserRound,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import type { Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { Button, Label, StateView } from "../../design/Primitives";
import { useLocale } from "../../i18n/LocaleProvider";
import { back, ui } from "../Shell";
import { Sheet } from "../sheets/Sheet";

export function CollectionActions({
  id,
  kind,
}: {
  id: string;
  kind: "album" | "artist" | "playlist";
}) {
  const m = useMusic();
  const { tx } = useLocale();
  const [failure, setFailure] = useState("");
  const resolve = m.resolve;
  useEffect(() => {
    let active = true;
    void resolve(kind, id).catch((error) => {
      if (active)
        setFailure(
          error instanceof Error
            ? error.message
            : "This collection could not load.",
        );
    });
    return () => {
      active = false;
    };
  }, [resolve, kind, id]);
  const state = m.snapshot!;
  const album =
    kind === "album"
      ? state.catalog.albums.find((item) => item.id === id)
      : undefined;
  const artist =
    kind === "artist"
      ? state.catalog.artists.find((item) => item.id === id)
      : undefined;
  const playlist =
    kind === "playlist"
      ? [...state.playlists, ...state.catalog.playlists].find(
          (item) => item.id === id,
        )
      : undefined;
  const entity = album || artist || playlist;
  const title =
    kind === "album"
      ? "Album options"
      : kind === "artist"
        ? "Artist options"
        : "Playlist options";
  if (!entity)
    return (
      <Sheet title={title}>
        <StateView
          title="This collection is unavailable"
          message={failure || "Try another collection from the catalog."}
        />
      </Sheet>
    );
  const byId = new Map(state.catalog.tracks.map((track) => [track.id, track]));
  const ids =
    album?.trackIds ||
    playlist?.items.map((item) => item.trackId) ||
    state.catalog.tracks
      .filter((track) => track.artistId === id)
      .map((track) => track.id);
  const tracks = ids
    .map((trackId) => byId.get(trackId))
    .filter(
      (track): track is Track =>
        !!track &&
        track.available &&
        (state.preferences.explicitAllowed || !track.explicit),
    );
  const libraryKind =
    kind === "album" ? "albums" : kind === "artist" ? "artists" : "playlists";
  const saved = state.library[libraryKind].includes(id);
  const saveTitle = artist
    ? saved
      ? "Unfollow artist"
      : "Follow artist"
    : album
      ? saved
        ? "Remove album from library"
        : "Save album"
      : saved
        ? "Remove playlist from library"
        : "Save playlist";
  const act = (work: Promise<boolean>) => {
    void work.then((ok) => {
      if (ok) back();
    });
  };
  return (
    <Sheet title={title}>
      <View style={[ui.row, s.summary]}>
        <Artwork
          kind={kind}
          uri={entity.artworkUrl}
          size={64}
          round={!!artist}
        />
        <View style={ui.grow}>
          <Label type="lg" numberOfLines={2}>
            {"name" in entity ? entity.name : entity.title}
          </Label>
          <Label type="sm" color="text-muted">
            {album?.artist ||
              tx(
                artist
                  ? "Artist"
                  : playlist?.owner
                    ? "Your playlist"
                    : "Playlist",
              )}
          </Label>
        </View>
      </View>
      <Button
        i18n
        title="Play"
        icon={Play}
        disabled={!tracks.length || m.pending}
        variant="quiet"
        style={s.action}
        onPress={() => act(m.playTracks(tracks, 0, false, { kind, id }))}
      />
      <Button
        i18n
        title="Shuffle collection"
        icon={Shuffle}
        disabled={!tracks.length || m.pending}
        variant="quiet"
        style={s.action}
        onPress={() => act(m.playTracks(tracks, 0, true, { kind, id }))}
      />
      {!playlist?.owner ? (
        <Button
          i18n
          title={saveTitle}
          icon={saved ? CheckCircle2 : CirclePlus}
          variant="quiet"
          style={s.action}
          onPress={() => {
            void m.save(libraryKind, id, !saved);
            back();
          }}
        />
      ) : null}
      <Button
        i18n
        title="Add to queue"
        icon={ListMusic}
        disabled={!tracks.length || m.pending}
        variant="quiet"
        style={s.action}
        onPress={() => {
          void m.enqueueTracks(tracks).then((ok) => {
            if (ok) {
              m.setNotice("Added to your queue");
              back();
            }
          });
        }}
      />
      {album?.artistId ? (
        <Button
          title={tx("Visit {artist}", { artist: album.artist })}
          icon={UserRound}
          variant="quiet"
          style={s.action}
          onPress={() => router.replace(`/artist/${album.artistId}` as never)}
        />
      ) : null}
      {playlist?.owner ? (
        <Button
          i18n
          title="Edit playlist"
          icon={Pencil}
          variant="quiet"
          style={s.action}
          onPress={() => router.replace(`/edit/${id}` as never)}
        />
      ) : null}
      {m.error || failure ? (
        <Label color="danger" accessibilityRole="alert">
          {tx(m.error || failure)}
        </Label>
      ) : null}
    </Sheet>
  );
}
const s = StyleSheet.create({
  summary: { paddingBottom: 16, gap: 12 },
  action: { justifyContent: "flex-start", paddingHorizontal: 8 },
});
