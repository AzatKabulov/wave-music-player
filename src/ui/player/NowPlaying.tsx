import { useLocale } from "../../i18n/LocaleProvider";
import { useEffect, useMemo, useState } from "react";
import { artworkSurface } from "../../data/artworkColor";
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
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useMusic, usePlaybackStatus } from "../../data/MusicProvider";
import { PlayerArtwork } from "./PlayerArtwork";
import { Touch } from "../../design/Motion";
import { Button, IconButton, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { go, ui } from "../Shell";
import { usePlayerSurface } from "./usePlayerSurface";
import { Seek } from "../Seek";

function PlaybackRecovery() {
  const m = useMusic();
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), 12000);
    return () => clearTimeout(timer);
  }, [attempt]);
  if (!stalled) return null;
  return (
    <View style={s.error}>
      <Label i18n type="lg">
        Audio is taking longer
      </Label>
      <Label i18n color="text-muted">
        Check the PC connection, then retry or choose another track.
      </Label>
      <View style={ui.wrap}>
        <Button
          i18n
          title="Retry audio"
          busy={m.pending}
          onPress={() => {
            setStalled(false);
            setAttempt((value) => value + 1);
            void m.retryPlayback();
          }}
        />
        <Button
          i18n
          title="Find music"
          variant="quiet"
          onPress={() => go("/search")}
        />
      </View>
    </View>
  );
}

export function Player() {
  const m = useMusic();
  const { tx } = useLocale();
  const status = usePlaybackStatus();
  const { width, height, fontScale } = useWindowDimensions();
  const atmosphere = useMemo(
    () =>
      artworkSurface(
        m.track?.artworkColor,
        t.color["surface-raised"],
        t.color["text-muted"],
      ),
    [m.track?.artworkColor],
  );
  const surface = usePlayerSurface(height, atmosphere);
  const track = m.track;
  const currentIndex = m.queue.entries.findIndex(
    (entry) => entry.id === m.activeEntry?.id,
  );
  const neighbor = (direction: number) => {
    let index = currentIndex + direction;
    if (index < 0 || index >= m.queue.entries.length) {
      if (m.queue.repeat !== "all" || m.queue.entries.length < 2) return;
      index = (index + m.queue.entries.length) % m.queue.entries.length;
    }
    const entry = m.queue.entries[index];
    const track = m.snapshot?.catalog.tracks.find(
      (track) => track.id === entry?.trackId,
    );
    return entry &&
      track?.available &&
      (m.snapshot?.preferences.explicitAllowed || !track.explicit)
      ? { id: entry.id, track }
      : undefined;
  };
  const saved = !!track && m.snapshot!.library.tracks.includes(track.id);
  const size = Math.min(
    400,
    width - 48,
    Math.max(200, (height * 0.42) / Math.max(1, fontScale * 0.8)),
  );
  return (
    <Animated.View
      testID="player-surface"
      onAccessibilityEscape={surface.close}
      style={[s.root, s.surface, surface.style]}
    >
      <LinearGradient
        colors={["transparent", t.color.bg]}
        locations={[0, 0.85]}
        style={s.root}
      >
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={s.root}>
          <View style={s.root}>
            <GestureDetector gesture={surface.pan}>
              <Animated.View testID="player-drag-area" style={s.dragArea}>
                <View style={s.header}>
                  <IconButton
                    icon={ChevronDown}
                    label="Close player"
                    onPress={surface.close}
                  />
                  <View style={s.context}>
                    <Label
                      i18n
                      type="sm"
                      accessibilityRole="header"
                      style={s.contextTitle}
                    >
                      Now playing
                    </Label>
                    <Label type="xs" color="text-muted" numberOfLines={1}>
                      {track?.album || tx("Your music")}
                    </Label>
                  </View>
                  <IconButton
                    icon={MoreHorizontal}
                    label={
                      track
                        ? tx("Actions for {title}", { title: track.title })
                        : tx("Track options")
                    }
                    disabled={!track}
                    onPress={() => track && go(`/actions/${track.id}`)}
                  />
                </View>
                {track ? (
                  <View style={s.art}>
                    <PlayerArtwork
                      current={{ id: m.activeEntry?.id || track.id, track }}
                      previous={neighbor(-1)}
                      next={neighbor(1)}
                      size={size}
                      onSelect={(id, expected) => {
                        if (m.activeEntry?.id === expected)
                          m.jumpQueue(id, status.playing, expected);
                      }}
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
                      accessibilityLabel={tx("Visit {artist}", {
                        artist: track.artist,
                      })}
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
                    label={
                      saved ? "Unsave current track" : "Save current track"
                    }
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
                    playing={
                      status.playing && status.isLoaded && !status.isBuffering
                    }
                  />
                </View>
                <View style={s.transport}>
                  <IconButton
                    icon={Shuffle}
                    label={
                      m.queue.shuffle ? "Disable shuffle" : "Enable shuffle"
                    }
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
                    accessibilityLabel={tx(status.playing ? "Pause" : "Play")}
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
                    label={tx("Repeat: {mode}", { mode: tx(m.queue.repeat) })}
                    selected={m.queue.repeat !== "none"}
                    onPress={() => void m.repeat()}
                  />
                </View>
                <View style={ui.h}>
                  <Label
                    type="sm"
                    color="text-muted"
                    i18n
                    accessibilityLiveRegion="polite"
                  >
                    {status.isBuffering
                      ? "Loading audio…"
                      : status.playing
                        ? "Playing"
                        : "Paused"}
                  </Label>
                  <Touch
                    labelIsUI
                    accessibilityRole="button"
                    accessibilityLabel="Queue"
                    onPress={() => go("/queue")}
                    style={s.queue}
                  >
                    <ListMusic color={t.color.text} size={22} />
                    <Label i18n type="sm">
                      Queue
                    </Label>
                  </Touch>
                </View>
                {m.error ? (
                  <View accessibilityRole="alert" style={s.error}>
                    <Label i18n color="danger">
                      {m.error}
                    </Label>
                    <Touch
                      labelIsUI
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss error"
                      onPress={() => m.setError("")}
                    >
                      <Label i18n>Dismiss</Label>
                    </Touch>
                  </View>
                ) : null}
                {status.isBuffering || !status.isLoaded ? (
                  <PlaybackRecovery key={m.activeEntry?.id} />
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
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  surface: { overflow: "hidden", borderRadius: 20 },
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
