import { ArrowRight } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Album, Playlist, Track } from "../../data/types";
import { Touch } from "../../design/Motion";
import { Artwork } from "../../design/Artwork";
import { IconButton, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { go, ui } from "../Shell";
import { TrackRow } from "../TrackRow";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  kicker?: string;
  action?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={ui.section}>
      <View style={ui.h}>
        <View style={ui.grow}>
          <Label i18n type="xl" accessibilityRole="header">
            {title}
          </Label>
        </View>
        {action ? (
          <IconButton
            icon={ArrowRight}
            label={`Explore ${title}`}
            onPress={action}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}
export function Cards({
  items,
  type,
}: {
  items: (Album | Playlist)[];
  type: "album" | "playlist";
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.cards}
    >
      {items.map((item) => (
        <Touch
          key={item.id}
          accessibilityRole="button"
          onPress={() => go(`/${type}/${item.id}`)}
          style={s.card}
        >
          <Artwork kind={type} palette={item.palette} uri={item.artworkUrl} />
          <Label numberOfLines={2} style={s.semibold}>
            {item.title}
          </Label>
          <Label type="sm" color="text-muted" numberOfLines={2}>
            {"artist" in item ? item.artist : item.description}
          </Label>
        </Touch>
      ))}
    </ScrollView>
  );
}
export function Tracks({ tracks }: { tracks: Track[] }) {
  return tracks.length ? (
    <View style={ui.list}>
      {tracks.map((track, index) => (
        <TrackRow
          key={`${track.id}-${index}`}
          track={track}
          context={tracks}
          index={index}
        />
      ))}
    </View>
  ) : (
    <StateView
      title="Your next listen starts here"
      message="Find a track you like, then bring it here."
      action="Find music"
      onAction={() => go("/search")}
    />
  );
}
export const formatTime = (seconds: number) =>
  `${Math.floor((Number.isFinite(seconds) ? seconds : 0) / 60)}:${String(Math.floor((Number.isFinite(seconds) ? seconds : 0) % 60)).padStart(2, "0")}`;
export const s = StyleSheet.create({
  filters: { marginBottom: t.space[24] },
  cards: { gap: t.space[16], paddingBottom: t.space[8] },
  card: { width: t.space[160], gap: t.space[8] },
  semibold: { fontWeight: "600" },
  center: { textAlign: "center" },
  hero: {
    backgroundColor: t.color["art-clay"],
    borderRadius: t.radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: t.space[280],
    marginBottom: t.space[24],
  },
  heroCopy: {
    flex: 1,
    minWidth: t.space[192],
    padding: t.space[24],
    gap: t.space[12],
    zIndex: 1,
  },
  heroEyebrow: { color: t.color.text },
  heroTitle: { color: t.color.text },
  heroDescription: { color: t.color.text },
  heroLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[12],
    marginTop: t.space[16],
  },
  heroArt: { alignSelf: "center", marginRight: t.space[24] },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.space[8],
    marginBottom: t.space[40],
  },
  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[12],
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sm,
    overflow: "hidden",
    minWidth: t.space[160],
    flexBasis: "45%",
    flexGrow: 1,
    paddingRight: t.space[12],
  },
  heartTile: {
    width: t.space[56],
    height: t.space[56],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color["surface-raised"],
  },
  artistCard: { width: t.space[128], gap: t.space[12], alignItems: "center" },
  footnote: {
    flexDirection: "row",
    gap: t.space[8],
    paddingVertical: t.space[24],
    alignItems: "center",
  },
  browse: { flexDirection: "row", flexWrap: "wrap", gap: t.space[12] },
  browseTile: {
    flexBasis: "45%",
    flexGrow: 1,
    minWidth: t.space[128],
    minHeight: t.space[128],
    padding: t.space[20],
    borderRadius: t.radius.md,
    justifyContent: "space-between",
    gap: t.space[16],
  },
  liked: { marginBottom: t.space[32] },
  collectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.space[24],
    alignItems: "center",
    marginBottom: t.space[40],
  },
  collectionCopy: { flexGrow: 1, flexBasis: t.space[280], gap: t.space[16] },
  player: {
    maxWidth: t.space[480],
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    gap: t.space[20],
  },
  playerInfo: { width: "100%", marginTop: t.space[8] },
  fullWidth: { width: "100%" },
  transport: {
    justifyContent: "space-between",
    width: "100%",
    gap: t.space[2],
  },
  queueEntry: { marginBottom: t.space[12] },
});
