import { randomUUID } from "expo-crypto";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListMusic,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet, View, Platform } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useMusic } from "../../data/MusicProvider";
import type { Playlist, QueueEntry } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import {
  Button,
  IconButton,
  Input,
  Label,
  StateView,
} from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, back, go, ui } from "../Shell";
import { Sheet } from "../sheets/Sheet";

function QueueRow({ entry, index }: { entry: QueueEntry; index: number }) {
  const m = useMusic();
  const track = m.snapshot!.catalog.tracks.find((t) => t.id === entry.trackId);
  const y = useSharedValue(0);
  const move = (delta: number) => {
    if (delta) void m.moveQueue(entry.id, delta);
  };
  const pan = usePanGesture({
    activateAfterLongPress: 150,
    maxPointers: 1,
    enabled: !m.pending,
    onUpdate: (event) => {
      y.value = event.translationY;
    },
    onDeactivate: (event) => {
      if (!event.canceled)
        scheduleOnRN(move, Math.round(event.translationY / 76));
      y.value = withSpring(0, { damping: 26, stiffness: 280 });
    },
  });
  const drag = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    zIndex: y.value === 0 ? 0 : 10,
  }));
  if (!track) return null;
  return (
    <Animated.View style={[s.queueRow, drag]}>
      <Touch
        accessibilityRole="button"
        accessibilityLabel={`Play queue entry ${index + 1}: ${track.title} ${m.activeEntry?.id === entry.id ? "Playing now" : entry.origin === "explicit" ? "Your request" : track.artist}`}
        onPress={() => m.jumpQueue(entry.id)}
        style={s.queueOpen}
      >
        <Artwork uri={track.artworkUrl} palette={track.palette} size={48} />
        <View style={ui.grow}>
          <Label
            numberOfLines={1}
            color={m.activeEntry?.id === entry.id ? "accent" : "text"}
          >
            {track.title}{" "}
          </Label>
          <Label type="sm" color="text-muted" numberOfLines={1}>
            {m.activeEntry?.id === entry.id
              ? "Playing now"
              : entry.origin === "explicit"
                ? "Your request"
                : track.artist}
          </Label>
        </View>
      </Touch>
      <IconButton
        icon={Trash2}
        label={`Remove queue entry ${index + 1}`}
        disabled={entry.id === m.activeEntry?.id || m.pending}
        onPress={() => void m.removeQueue(entry.id)}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          accessible={Platform.OS !== "web"}
          accessibilityRole={Platform.OS === "web" ? undefined : "adjustable"}
          accessibilityLabel={
            Platform.OS === "web" ? undefined : `Reorder ${track.title}`
          }
          accessibilityValue={{
            min: 1,
            max: m.queue.entries.length,
            now: index + 1,
          }}
          accessibilityActions={[
            { name: "increment", label: "Move down" },
            { name: "decrement", label: "Move up" },
          ]}
          onAccessibilityAction={(event) =>
            move(event.nativeEvent.actionName === "increment" ? 1 : -1)
          }
          style={s.handle}
        >
          <GripVertical color={t.color["text-muted"]} size={20} />
        </Animated.View>
      </GestureDetector>
      <View
        style={[s.moveFallback, Platform.OS !== "web" && { display: "none" }]}
      >
        <IconButton
          icon={ArrowUp}
          label={`Move ${track.title} up`}
          disabled={index === 0 || m.pending}
          onPress={() => void m.moveQueue(entry.id, -1)}
        />
        <IconButton
          icon={ArrowDown}
          label={`Move ${track.title} down`}
          disabled={index === m.queue.entries.length - 1 || m.pending}
          onPress={() => void m.moveQueue(entry.id, 1)}
        />
      </View>
    </Animated.View>
  );
}
export function QueueScreen() {
  const m = useMusic();
  return (
    <Shell title="Your queue" back scroll={false}>
      <FlatList
        data={m.queue.entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item, index }) => (
          <QueueRow entry={item} index={index} />
        )}
        ListHeaderComponent={
          <View style={ui.section}>
            <View style={ui.h}>
              <Label type="xl">Up next</Label>
              <Button
                title="Clear requests"
                variant="quiet"
                disabled={m.pending}
                onPress={() => void m.clearExplicit()}
              />
            </View>
            <Label type="sm" color="text-muted">
              Drag the handle to reorder. Move controls are also available.
            </Label>
          </View>
        }
        ListEmptyComponent={
          <StateView
            title="A clear queue"
            message="Pick a track to start, or add something to play next."
          />
        }
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </Shell>
  );
}
export function Actions({
  id,
  picker = false,
}: {
  id: string;
  picker?: boolean;
}) {
  const m = useMusic();
  const [query, setQuery] = useState("");
  const track = m.snapshot!.catalog.tracks.find((t) => t.id === id);
  if (!track)
    return (
      <Sheet title="Track unavailable">
        <Label>Try another track from the catalog.</Label>
      </Sheet>
    );
  const add = async (playlist: Playlist) => {
    const saved = await m.run(
      () =>
        m.data.editPlaylist(
          playlist.id,
          playlist.revision,
          playlist.title,
          playlist.description,
          [...playlist.items, { id: randomUUID(), trackId: id }],
        ),
      `Added to ${playlist.title}`,
    );
    if (saved) go(`/playlist/${playlist.id}`);
  };
  return (
    <Sheet title={picker ? "Choose a playlist" : "Track options"}>
      <View style={[ui.row, s.summary]}>
        <Artwork uri={track.artworkUrl} palette={track.palette} size={64} />
        <View style={ui.grow}>
          <Label type="lg" numberOfLines={2}>
            {track.title}{" "}
          </Label>
          <Label color="text-muted">{track.artist}</Label>
        </View>
      </View>
      {picker ? (
        <View style={s.actions}>
          <Input
            label="Find a playlist"
            placeholder="Playlist name"
            value={query}
            onChangeText={setQuery}
          />
          <Button
            title="Create a playlist"
            icon={Plus}
            onPress={() => go(`/create?track=${id}`)}
          />
          {m
            .snapshot!.playlists.filter((p) =>
              p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map((p) => (
              <Button
                key={p.id}
                title={`${p.title}${p.items.some((item) => item.trackId === id) ? " · add another copy" : ""}`}
                variant="quiet"
                disabled={m.pending}
                onPress={() => void add(p)}
                style={s.action}
              />
            ))}
          {!m.snapshot!.playlists.length ? (
            <Label color="text-muted">Your playlists will appear here.</Label>
          ) : null}
        </View>
      ) : (
        <View style={s.actions}>
          <Button
            title="Add to playlist"
            icon={Plus}
            variant="quiet"
            onPress={() => go(`/add/${id}`)}
            style={s.action}
          />
          <Button
            title="Play next"
            icon={ListMusic}
            disabled={m.pending}
            variant="quiet"
            onPress={() => {
              void m.enqueue(track).then((ok) => {
                if (ok) {
                  m.setNotice("Added to your queue");
                  back();
                }
              });
            }}
            style={s.action}
          />
          <Button
            title={`Artist · ${track.artist}`}
            variant="quiet"
            onPress={() => go(`/artist/${track.artistId}`)}
            style={s.action}
          />
          <Button
            title={`Album · ${track.album}`}
            variant="quiet"
            onPress={() => go(`/album/${track.albumId}`)}
            style={s.action}
          />
        </View>
      )}
      {m.notice ? (
        <Label accessibilityRole="alert" color="success">
          {m.notice}
        </Label>
      ) : null}
      {m.error ? (
        <Label accessibilityRole="alert" color="danger">
          {m.error}
        </Label>
      ) : null}
    </Sheet>
  );
}
const s = StyleSheet.create({
  summary: {
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.color.border,
  },
  actions: { gap: 8 },
  action: { justifyContent: "flex-start", paddingHorizontal: 8 },
  queueRow: {
    minHeight: 76,
    paddingVertical: 6,
    backgroundColor: t.color.bg,
    gap: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  queueOpen: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  handle: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  moveFallback: { flexDirection: "row" },
});
