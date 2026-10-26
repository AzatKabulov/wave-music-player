import { useLocale } from "../../i18n/LocaleProvider";
import { Pause, Play, SkipForward } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useMusic, usePlaybackStatus } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import { IconButton, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { artworkSurface } from "../../data/artworkColor";

export function MiniPlayer() {
  const { tx } = useLocale();
  const m = useMusic();
  const status = usePlaybackStatus();
  const backgroundColor = useMemo(
    () =>
      artworkSurface(
        m.track?.artworkColor,
        t.color["surface-raised"],
        t.color["text-muted"],
      ),
    [m.track?.artworkColor],
  );
  const duration = status.duration || (m.track?.durationMs || 0) / 1000;
  const progress = useSharedValue(status.currentTime);
  useEffect(() => {
    if (!status.playing || status.isBuffering || !status.isLoaded) {
      cancelAnimation(progress);
      progress.set(status.currentTime);
    } else {
      if (Math.abs(progress.get() - status.currentTime) > 1.2)
        progress.set(status.currentTime);
      progress.set(
        withTiming(Math.min(duration, status.currentTime + 0.5), {
          duration: 500,
          easing: Easing.linear,
        }),
      );
    }
  }, [
    status.currentTime,
    status.playing,
    status.isBuffering,
    status.isLoaded,
    duration,
    progress,
  ]);
  const progressStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: duration
          ? Math.max(0, Math.min(1, progress.get() / duration))
          : 0,
      },
    ],
  }));
  if (!m.track) return null;
  return (
    <View style={[s.bar, { backgroundColor }]}>
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
        <Animated.View style={[s.progress, progressStyle]} />
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
  progress: {
    height: 2,
    width: "100%",
    transformOrigin: "left",
    backgroundColor: t.color.text,
  },
});
