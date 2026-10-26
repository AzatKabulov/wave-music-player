import { useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle2,
  CirclePlus,
  MoreHorizontal,
  Play,
  Shuffle,
} from "lucide-react-native";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { Album, Artist, Track } from "../../data/types";
import { artworkSurface } from "../../data/artworkColor";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import { IconButton, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { useLocale } from "../../i18n/LocaleProvider";
import { go, ui } from "../Shell";
import { formatTime } from "./common";

export function AlbumHeader({
  album,
  artist,
  tracks,
  saved,
  pending,
  onSave,
  onPlay,
  onShuffle,
  onOptions,
}: {
  album: Album;
  artist?: Artist;
  tracks: Track[];
  saved: boolean;
  pending: boolean;
  onSave: () => void;
  onPlay: () => void;
  onShuffle: () => void;
  onOptions: () => void;
}) {
  const { tx } = useLocale();
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 960 && fontScale < 1.5;
  const coverSize = Math.min(256, Math.max(176, width - 112));
  const background = useMemo(
    () =>
      artworkSurface(
        album.artworkColor,
        t.color["surface-raised"],
        t.color["text-muted"],
      ),
    [album.artworkColor],
  );
  const releaseType =
    album.releaseType === "single"
      ? "Single"
      : album.releaseType === "ep"
        ? "EP"
        : album.releaseType === "compilation"
          ? "Compilation"
          : "Album";
  const partial = album.completeness === "partial" && album.expectedTrackCount;
  return (
    <View style={s.header}>
      <LinearGradient colors={[background, t.color.bg]} style={s.atmosphere}>
        <View style={[s.identity, wide && s.identityWide]}>
          <View style={s.cover}>
            <Artwork
              kind="album"
              uri={album.artworkUrl}
              size={wide ? 224 : coverSize}
            />
          </View>
          <View style={[s.copy, wide && ui.grow]}>
            <Label type="display" accessibilityRole="header">
              {album.title}
            </Label>
            <Touch
              accessibilityRole="button"
              accessibilityLabel={`Visit ${album.artist}`}
              onPress={() => go(`/artist/${album.artistId}`)}
              style={s.artist}
            >
              {artist?.artworkUrl ? (
                <Artwork
                  kind="artist"
                  uri={artist.artworkUrl}
                  size={28}
                  round
                />
              ) : null}
              <Label type="sm" style={s.artistName}>
                {album.artist}
              </Label>
            </Touch>
            <Label type="sm" color="text-muted">
              {tx(releaseType)}
              {album.year ? ` · ${album.year}` : ""}
              {album.edition ? ` · ${album.edition}` : ""}
            </Label>
            <Label type="sm" color="text-muted">
              {tx("Tracks: {count}", { count: tracks.length })} ·{" "}
              {formatTime(
                tracks.reduce((sum, track) => sum + track.durationMs, 0) / 1000,
              )}
            </Label>
            {partial ? (
              <Label type="sm" color="text-muted">
                {tx("{available} of {total} tracks available", {
                  available: tracks.length,
                  total: album.expectedTrackCount!,
                })}
              </Label>
            ) : null}
          </View>
        </View>
      </LinearGradient>
      <View style={s.actions}>
        <View style={ui.row}>
          <IconButton
            icon={saved ? CheckCircle2 : CirclePlus}
            label={saved ? "Saved" : "Save"}
            selected={saved}
            onPress={onSave}
            size="lg"
          />
          <IconButton
            icon={MoreHorizontal}
            label="Collection options"
            onPress={onOptions}
          />
        </View>
        <View style={ui.row}>
          <IconButton
            icon={Shuffle}
            label="Shuffle collection"
            disabled={!tracks.length || pending}
            onPress={onShuffle}
          />
          <Touch
            accessibilityRole="button"
            accessibilityLabel={tx("Play")}
            accessibilityState={{ disabled: !tracks.length || pending }}
            disabled={!tracks.length || pending}
            onPress={onPlay}
            style={[s.play, (!tracks.length || pending) && s.disabled]}
          >
            <Play
              size={28}
              fill={t.color["on-accent"]}
              color={t.color["on-accent"]}
            />
          </Touch>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  header: { paddingBottom: 8 },
  atmosphere: { paddingTop: 16 },
  identity: { gap: 24 },
  identityWide: { flexDirection: "row", alignItems: "flex-end", gap: 28 },
  cover: { alignItems: "center", paddingVertical: 8 },
  copy: { gap: 6, minWidth: 0 },
  artist: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    minHeight: t.layout.touch,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  artistName: { fontWeight: "700", flexShrink: 1 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: t.opacity.disabled },
});
