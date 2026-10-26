import type { CellRendererProps } from "@react-native/virtualized-lists";
import { queueDropTarget } from "../../data/queueDropTarget";
import { useLocale } from "../../i18n/LocaleProvider";
import { randomUUID } from "../../data/uuid";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListMusic,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
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
import { Touch, useMotion } from "../../design/Motion";
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
import { useLocalSearchParams } from "expo-router";
import { CollectionActions } from "./CollectionActions";

type QueueListItem = { entry: QueueEntry; index: number; heading?: string };

function QueueRow({
  entry,
  index,
  onRemove,
  onDrop,
  onMeasure,
}: {
  entry: QueueEntry;
  index: number;
  onRemove: (entry: QueueEntry, index: number) => void;
  onDrop: (id: string, translationY: number) => void;
  onMeasure: (
    id: string,
    layout: LayoutChangeEvent["nativeEvent"]["layout"],
  ) => void;
}) {
  const { tx } = useLocale();
  const { reduced } = useMotion();
  const narrow = useWindowDimensions().width < 600;
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
      if (!event.canceled) scheduleOnRN(onDrop, entry.id, event.translationY);
      y.value = reduced ? 0 : withSpring(0, { damping: 26, stiffness: 280 });
    },
  });
  const drag = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : y.value }],
    zIndex: y.value === 0 ? 0 : 10,
  }));
  if (!track) return null;
  return (
    <Animated.View
      onLayout={(event) => onMeasure(entry.id, event.nativeEvent.layout)}
      style={[s.queueRow, drag]}
    >
      <Touch
        accessibilityRole="button"
        accessibilityLabel={tx("Play queue entry {index}: {title} {subtitle}", {
          index: index + 1,
          title: track.title,
          subtitle:
            m.activeEntry?.id === entry.id
              ? tx("Playing now")
              : entry.origin === "explicit"
                ? tx("Your request")
                : track.artist,
        })}
        onPress={() => m.jumpQueue(entry.id)}
        style={s.queueOpen}
      >
        <Artwork uri={track.artworkUrl} palette={track.palette} size={48} />
        <View style={ui.grow}>
          <Label
            numberOfLines={2}
            color={m.activeEntry?.id === entry.id ? "accent" : "text"}
          >
            {track.title}{" "}
          </Label>
          <Label type="sm" color="text-muted" numberOfLines={1}>
            {m.activeEntry?.id === entry.id
              ? tx("Playing now")
              : entry.origin === "explicit"
                ? tx("Your request")
                : track.artist}
          </Label>
        </View>
      </Touch>
      <IconButton
        icon={Trash2}
        label={tx("Remove queue entry {index}", { index: index + 1 })}
        disabled={entry.id === m.activeEntry?.id || m.pending}
        onPress={() => onRemove(entry, index)}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          accessible={Platform.OS !== "web"}
          accessibilityRole={Platform.OS === "web" ? undefined : "adjustable"}
          accessibilityLabel={
            Platform.OS === "web"
              ? undefined
              : tx("Reorder {title}", { title: track.title })
          }
          accessibilityValue={{
            min: 1,
            max: m.queue.entries.length,
            now: index + 1,
          }}
          accessibilityActions={[
            { name: "increment", label: tx("Move down") },
            { name: "decrement", label: tx("Move up") },
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
        style={[
          s.moveFallback,
          narrow && { flexBasis: "100%", justifyContent: "flex-end" },
          Platform.OS !== "web" && { display: "none" },
        ]}
      >
        <IconButton
          icon={ArrowUp}
          label={tx("Move {title} up", { title: track.title })}
          disabled={index === 0 || m.pending}
          onPress={() => void m.moveQueue(entry.id, -1)}
        />
        <IconButton
          icon={ArrowDown}
          label={tx("Move {title} down", { title: track.title })}
          disabled={index === m.queue.entries.length - 1 || m.pending}
          onPress={() => void m.moveQueue(entry.id, 1)}
        />
      </View>
    </Animated.View>
  );
}
export function QueueScreen() {
  const m = useMusic();
  const frames = useRef(
    new Map<
      string,
      { top: number; height: number; rowTop?: number; rowHeight?: number }
    >(),
  );
  const Cell = useCallback(
    ({
      children,
      style,
      onLayout,
      onFocusCapture,
      item,
    }: CellRendererProps<QueueListItem>) => (
      <View
        style={style}
        onFocusCapture={onFocusCapture}
        onLayout={(event) => {
          const previous = frames.current.get(item.entry.id);
          frames.current.set(item.entry.id, {
            ...previous,
            top: event.nativeEvent.layout.y,
            height: event.nativeEvent.layout.height,
          });
          onLayout?.(event);
        }}
      >
        {children}
      </View>
    ),
    [],
  );
  const measureRow = (
    id: string,
    layout: LayoutChangeEvent["nativeEvent"]["layout"],
  ) => {
    const previous = frames.current.get(id) || {
      top: 0,
      height: layout.height,
    };
    frames.current.set(id, {
      ...previous,
      rowTop: layout.y,
      rowHeight: layout.height,
    });
  };
  const currentIndex = m.queue.entries.findIndex(
    (entry) => entry.id === (m.activeEntry?.id || m.queue.currentId),
  );
  const group = (entries: QueueEntry[], start: number, heading: string) =>
    entries.map((entry, offset) => ({
      entry,
      index: start + offset,
      heading: offset === 0 ? heading : undefined,
    }));
  const ordered =
    currentIndex < 0
      ? group(m.queue.entries, 0, "Up next")
      : [
          ...group(
            m.queue.entries.slice(currentIndex, currentIndex + 1),
            currentIndex,
            "Playing now",
          ),
          ...group(
            m.queue.entries.slice(currentIndex + 1),
            currentIndex + 1,
            "Up next",
          ),
          ...group(
            m.queue.entries.slice(0, currentIndex),
            0,
            "Earlier in queue",
          ),
        ];
  const drop = (id: string, translationY: number) => {
    const measured = ordered.flatMap((item) => {
      const frame = frames.current.get(item.entry.id);
      return frame
        ? [
            {
              id: item.entry.id,
              top: frame.top + (frame.rowTop || 0),
              height: frame.rowHeight || frame.height,
            },
          ]
        : [];
    });
    const target = queueDropTarget(id, translationY, measured);
    if (target && target !== id) void m.moveQueueTo(id, target);
  };
  const [removed, setRemoved] = useState<{
    entry: QueueEntry;
    beforeId?: string;
    afterId?: string;
  } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 6500);
    return () => clearTimeout(timer);
  }, [removed]);
  const remove = async (entry: QueueEntry, index: number) => {
    const undo = {
      entry,
      beforeId: m.queue.entries[index - 1]?.id,
      afterId: m.queue.entries[index + 1]?.id,
    };
    if (await m.removeQueue(entry.id)) setRemoved(undo);
  };
  return (
    <Shell title="Your queue" back scroll={false}>
      {removed ? (
        <View
          style={[
            ui.h,
            {
              backgroundColor: t.color["surface-raised"],
              borderRadius: 12,
              paddingLeft: 16,
              marginBottom: 12,
            },
          ]}
        >
          <Label i18n accessibilityLiveRegion="polite" style={ui.grow}>
            Removed from queue
          </Label>
          <Button
            i18n
            title="Undo"
            variant="quiet"
            busy={m.pending}
            onPress={() => {
              const value = removed;
              void m
                .restoreQueueEntry(value.entry, value.beforeId, value.afterId)
                .then((ok) => {
                  if (ok) setRemoved(null);
                });
            }}
          />
        </View>
      ) : null}
      <FlatList
        CellRendererComponent={Cell}
        data={ordered}
        keyExtractor={(item) => item.entry.id}
        renderItem={({ item }) => (
          <View>
            {item.heading ? (
              <Label
                i18n
                type="lg"
                accessibilityRole="header"
                style={{ paddingTop: 20, paddingBottom: 8 }}
              >
                {item.heading}
              </Label>
            ) : null}
            <QueueRow
              entry={item.entry}
              index={item.index}
              onDrop={drop}
              onMeasure={measureRow}
              onRemove={(entry, index) => void remove(entry, index)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={ui.section}>
            <View style={ui.h}>
              <Button
                i18n
                title="Clear requests"
                variant="quiet"
                disabled={m.pending}
                onPress={() => void m.clearExplicit()}
              />
            </View>
            <Label i18n type="sm" color="text-muted">
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
  const { collection } = useLocalSearchParams<{ collection?: string }>();
  if (
    !picker &&
    (collection === "album" ||
      collection === "artist" ||
      collection === "playlist")
  )
    return <CollectionActions id={id} kind={collection} />;
  const track = m.snapshot!.catalog.tracks.find((t) => t.id === id);
  if (!track)
    return (
      <Sheet title="Track unavailable">
        <Label i18n>Try another track from the catalog.</Label>
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
            i18n
            label="Find a playlist"
            placeholder="Playlist name"
            value={query}
            onChangeText={setQuery}
          />
          <Button
            i18n
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
            <Label i18n color="text-muted">
              Your playlists will appear here.
            </Label>
          ) : null}
        </View>
      ) : (
        <View style={s.actions}>
          <Button
            i18n
            title="Add to playlist"
            icon={Plus}
            variant="quiet"
            onPress={() => go(`/add/${id}`)}
            style={s.action}
          />
          <Button
            i18n
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
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  moveFallback: { flexDirection: "row" },
});
