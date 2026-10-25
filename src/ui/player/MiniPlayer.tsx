import { useLocale } from "../../i18n/LocaleProvider";
import { Pause, Play, SkipForward } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useMusic, usePlaybackStatus } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import { IconButton, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { router } from "expo-router";

export function MiniPlayer() {
  const { tx } = useLocale();
  const m = useMusic();
  const status = usePlaybackStatus();
  if (!m.track) return null;
  const duration = status.duration || m.track.durationMs / 1000;
  return (
    <View style={s.bar}>
      <View style={s.row}>
        <Touch
          accessibilityRole="button"
          accessibilityLabel={tx("Open player for {title} {artist}", {
            title: m.track.title,
            artist: m.track.artist,
          })}
          onPress={() => router.push("/player")}
          style={s.open}
        >
          <Artwork
            palette={m.track.palette}
            uri={m.track.artworkUrl}
            size={44}
          />
          <View style={s.copy}>
            <Label numberOfLines={1} style={s.title}>
              {m.track.title}{" "}
            </Label>
            <Label type="sm" color="text-muted" numberOfLines={1}>
              {m.track.artist}
            </Label>
          </View>
        </Touch>
        <IconButton
          icon={status.playing ? Pause : Play}
          label={status.playing ? "Pause" : "Play"}
          onPress={m.toggle}
        />
        <IconButton icon={SkipForward} label="Next track" onPress={m.next} />
      </View>
      <View style={s.rail}>
        <View
          style={[
            s.progress,
            {
              width: `${duration ? Math.min(100, (status.currentTime / duration) * 100) : 0}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: t.color["surface-raised"],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    minHeight: 62,
  },
  open: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  rail: { height: 2, marginHorizontal: 8, backgroundColor: t.color.border },
  progress: { height: 2, backgroundColor: t.color.text },
});
