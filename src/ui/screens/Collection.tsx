import { useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Check, MoreHorizontal, Play, Shuffle } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import type { Album, Artist, Playlist, Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import {
  Button,
  IconButton,
  Label,
  StateView,
  Skeleton,
} from "../../design/Primitives";
import { Shell, go, ui } from "../Shell";
import { MusicList } from "../MusicList";
import { Cards, Section, formatTime } from "./common";
import { AlbumHeader } from "./AlbumHeader";

export function Collection({
  type,
  id,
}: {
  type: "album" | "playlist" | "artist";
  id: string;
}) {
  const { tx } = useLocale();
  const [resource, setResource] = useState({ key: "", error: "" });
  const [retry, setRetry] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const m = useMusic(),
    sn = m.snapshot!,
    c = sn.catalog;
  const resolve = m.resolve;
  const resourceKey = `${type}:${id}:${retry}`;
  const loading = resource.key !== resourceKey;
  const error = loading ? "" : resource.error;
  useEffect(() => {
    let active = true;
    void resolve(type, id)
      .then(() => {
        if (active) setResource({ key: resourceKey, error: "" });
      })
      .catch((error) => {
        if (active)
          setResource({
            key: resourceKey,
            error:
              error instanceof Error
                ? error.message
                : "This collection could not load.",
          });
      });
    return () => {
      active = false;
    };
  }, [resolve, type, id, resourceKey]);
  const entity =
    type === "album"
      ? c.albums.find((x) => x.id === id)
      : type === "artist"
        ? c.artists.find((x) => x.id === id)
        : [...c.playlists, ...sn.playlists].find((x) => x.id === id);
  if (!entity)
    return (
      <Shell title="Collection" back>
        {loading ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={232} />
            <Skeleton />
            <Skeleton />
          </View>
        ) : error ? (
          <StateView
            title="This collection could not load"
            message={error}
            action="Try again"
            onAction={() => setRetry((value) => value + 1)}
          />
        ) : (
          <StateView
            title="This collection is unavailable"
            message="It may have been removed or belong to another listener."
            action="Return to library"
            onAction={() => go("/library")}
          />
        )}
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
  const header = album ? (
    <AlbumHeader
      album={album}
      artist={c.artists.find((person) => person.id === album.artistId)}
      tracks={tracks}
      saved={saved}
      pending={m.pending}
      onSave={() => void m.save("albums", id, !saved)}
      onPlay={() => void m.playTracks(tracks)}
      onShuffle={() => void m.playTracks(tracks, 0, true)}
      onOptions={() => go(`/actions/${id}?collection=album`)}
    />
  ) : (
    <View style={s.header}>
      <View style={s.cover}>
        <Artwork
          kind={type}
          palette={entity.palette}
          uri={artist?.artworkUrl || playlist?.artworkUrl}
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
          : playlist?.description || tx("Your collection, your way.")}
      </Label>
      <Label type="sm" color="text-muted">
        {playlist?.owner ? `${tx("Your playlist")} · ` : ""}
        {tx("Tracks: {count}", { count: tracks.length })} ·{" "}
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
            onPress={() => go(`/actions/${id}?collection=${type}`)}
          />
        </View>
        <View style={ui.row}>
          <IconButton
            icon={Shuffle}
            label="Shuffle collection"
            disabled={!tracks.length || m.pending}
            onPress={() => void m.playTracks(tracks, 0, true)}
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
      {error ? (
        <StateView
          title="This collection could not load"
          message={error}
          action="Try again"
          onAction={() => setRetry((value) => value + 1)}
        />
      ) : null}
      <Label i18n type="lg">
        {artist ? "Popular tracks" : "Tracks"}
      </Label>
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
    <View style={{ gap: 16 }}>
      {album.releaseDate ? (
        <Label type="sm" color="text-muted">
          {album.releaseDate}
        </Label>
      ) : null}
      <Button
        title={tx("More from {artist}", { artist: album.artist })}
        variant="quiet"
        onPress={() => go(`/artist/${album.artistId}`)}
      />
    </View>
  ) : undefined;
  return (
    <Shell
      title={
        type === "artist"
          ? "Artist"
          : type === "album"
            ? collapsed
              ? title
              : "Album"
            : "Playlist"
      }
      back
      scroll={false}
      trailing={
        album && collapsed ? (
          <IconButton
            icon={Play}
            label="Play album"
            filled
            disabled={!tracks.length || m.pending}
            onPress={() => void m.playTracks(tracks)}
          />
        ) : undefined
      }
    >
      <MusicList
        tracks={tracks}
        header={header}
        footer={footer}
        albumRows={!!album}
        onScrollOffset={
          album ? (offset) => setCollapsed(offset > 320) : undefined
        }
      />
    </Shell>
  );
}
const s = StyleSheet.create({
  header: { gap: 12, paddingBottom: 16 },
  cover: { alignItems: "center", paddingVertical: 16 },
});
