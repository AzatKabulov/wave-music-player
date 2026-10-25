import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronDown,
  CheckCircle2,
  CirclePlus,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react-native";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useMusic, usePlaybackStatus } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Touch, useMotion } from "../../design/Motion";
import { IconButton, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { back, go, ui } from "../Shell";
import { Seek } from "../Seek";
import { formatTime } from "../screens/common";

export function Player() {
  const m = useMusic();
  const status = usePlaybackStatus();
  const { width, height, fontScale } = useWindowDimensions();
  const { reduced } = useMotion();
  const y = useSharedValue(0);
  const pan = usePanGesture({
    activeOffsetY: 12,
    failOffsetX: [-24, 24],
    maxPointers: 1,
    onUpdate: (event) => {
      y.value = Math.max(0, event.translationY);
    },
    onDeactivate: (event) => {
      if (
        !event.canceled &&
        (event.translationY > 130 || event.velocityY > 900)
      ) {
        y.value = withTiming(
          height,
          { duration: reduced ? 0 : 180 },
          (finished) => {
            if (finished) scheduleOnRN(back);
          },
        );
      } else y.value = withSpring(0, { damping: 26, stiffness: 260 });
    },
  });
  const drag = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : y.value }],
  }));
  const track = m.track;
  const saved = !!track && m.snapshot!.library.tracks.includes(track.id);
  const size = Math.min(
    400,
    width - 48,
    Math.max(200, (height * 0.42) / Math.max(1, fontScale * 0.8)),
  );
  const atmosphere =
    t.color[`art-${track?.palette || "night"}` as keyof typeof t.color] ||
    t.color.surface;
  return (
    <LinearGradient
      colors={[atmosphere, t.color.bg]}
      locations={[0, 0.85]}
      style={s.root}
    >
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={s.root}>
        <Animated.View style={[s.root, drag]}>
          <GestureDetector gesture={pan}>
            <Animated.View style={s.dragArea}>
              <View style={s.header}>
                <IconButton
                  icon={ChevronDown}
                  label="Close player"
                  onPress={back}
                />
                <View style={s.context}>
                  <Label
                    type="sm"
                    accessibilityRole="header"
                    style={s.contextTitle}
                  >
                    Now playing
                  </Label>
                  <Label type="xs" color="text-muted" numberOfLines={1}>
                    {track?.album || "Your music"}
                  </Label>
                </View>
                <IconButton
                  icon={MoreHorizontal}
                  label={track ? `Actions for ${track.title}` : "Track options"}
                  disabled={!track}
                  onPress={() => track && go(`/actions/${track.id}`)}
                />
              </View>
              {track ? (
                <View style={s.art}>
                  <Artwork
                    uri={track.artworkUrl}
                    palette={track.palette}
                    size={size}
                  />
                </View>
              ) : null}
            </Animated.View>
          </GestureDetector>
          {track ? (
            <ScrollView
              contentContainerStyle={s.controls}
              showsVerticalScrollIndicator={false}
            >
              <View style={ui.row}>
                <View style={ui.grow}>
                  <Label type="xl" numberOfLines={2}>
                    {track.title}
                  </Label>
                  <Touch
                    accessibilityRole="button"
                    accessibilityLabel={`Visit ${track.artist}`}
                    onPress={() => go(`/artist/${track.artistId}`)}
                    style={s.artist}
                  >
                    <Label color="text-muted" numberOfLines={2}>
                      {track.artist}
                    </Label>
                  </Touch>
                </View>
                <IconButton
                  icon={saved ? CheckCircle2 : CirclePlus}
                  label={saved ? "Unsave current track" : "Save current track"}
                  selected={saved}
                  onPress={() => void m.save("tracks", track.id, !saved)}
                />
              </View>
              <View>
                <Seek
                  key={m.activeEntry?.id}
                  value={status.currentTime}
                  max={status.duration || track.durationMs / 1000}
                  onChange={m.seek}
                />
                <View style={ui.h}>
                  <Label type="xs" color="text-muted">
                    {formatTime(status.currentTime)}
                  </Label>
                  <Label type="xs" color="text-muted">
                    {formatTime(status.duration || track.durationMs / 1000)}
                  </Label>
                </View>
              </View>
              <View style={s.transport}>
                <IconButton
                  icon={Shuffle}
                  label={m.queue.shuffle ? "Disable shuffle" : "Enable shuffle"}
                  selected={m.queue.shuffle}
                  onPress={() => void m.shuffle()}
                />
                <IconButton
                  icon={SkipBack}
                  size="lg"
                  label="Previous track"
                  onPress={m.previous}
                />
                <Touch
                  haptic
                  accessibilityRole="button"
                  accessibilityLabel={status.playing ? "Pause" : "Play"}
                  onPress={m.toggle}
                  style={s.play}
                >
                  {status.playing ? (
                    <Pause fill={t.color.bg} color={t.color.bg} size={32} />
                  ) : (
                    <Play fill={t.color.bg} color={t.color.bg} size={32} />
                  )}
                </Touch>
                <IconButton
                  icon={SkipForward}
                  size="lg"
                  label="Next track"
                  onPress={m.next}
                />
                <IconButton
                  icon={m.queue.repeat === "single" ? Repeat1 : Repeat}
                  label={`Repeat: ${m.queue.repeat}`}
                  selected={m.queue.repeat !== "none"}
                  onPress={() => void m.repeat()}
                />
              </View>
              <View style={ui.h}>
                <Label
                  type="sm"
                  color="text-muted"
                  accessibilityLiveRegion="polite"
                >
                  {status.isBuffering
                    ? "Loading audio…"
                    : status.playing
                      ? "Playing"
                      : "Paused"}
                </Label>
                <Touch
                  accessibilityRole="button"
                  accessibilityLabel="Queue"
                  onPress={() => go("/queue")}
                  style={s.queue}
                >
                  <ListMusic color={t.color.text} size={22} />
                  <Label type="sm">Queue</Label>
                </Touch>
              </View>
              {m.error ? (
                <View accessibilityRole="alert" style={s.error}>
                  <Label color="danger">{m.error}</Label>
                  <Touch
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss error"
                    onPress={() => m.setError("")}
                  >
                    <Label>Dismiss</Label>
                  </Touch>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <StateView
              title="Choose your first track"
              message="Start a track from Home, Search, or your library."
              action="Find music"
              onAction={() => go("/search")}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  dragArea: { width: "100%", maxWidth: 480, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 64,
  },
  context: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  contextTitle: { fontWeight: "600" },
  art: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 20 },
  controls: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 24,
    paddingTop: 12,
    gap: 18,
    paddingBottom: 28,
  },
  artist: { minHeight: 40, justifyContent: "center" },
  transport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
  play: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.color.text,
    alignItems: "center",
    justifyContent: "center",
  },
  queue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  error: {
    gap: 8,
    backgroundColor: t.color.surface,
    padding: 16,
    borderRadius: 8,
  },
});
