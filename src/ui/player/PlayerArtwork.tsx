import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { artworkSwipe } from "../../data/playerGesture";
import type { Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { useMotion } from "../../design/Motion";
import { useLocale } from "../../i18n/LocaleProvider";

type Item = { id: string; track: Track };
type Props = {
  current: Item;
  previous?: Item;
  next?: Item;
  size: number;
  onSelect: (id: string, expectedCurrentId: string) => void;
};
const settle = {
  stiffness: 330,
  damping: 34,
  mass: 0.8,
  overshootClamping: true,
};

function Cover({
  item,
  page,
  offset,
  size,
  reduced,
  fade,
}: {
  item: Item;
  page: number;
  offset: SharedValue<number>;
  size: number;
  reduced: boolean;
  fade: SharedValue<number>;
}) {
  const travel = size + 24;
  const style = useAnimatedStyle(() => {
    const x = page * travel + offset.get();
    return {
      opacity: reduced
        ? page === 0
          ? fade.get()
          : 0
        : 1 - Math.min(0.18, (Math.abs(x) / travel) * 0.18),
      transform: [
        { translateX: reduced ? page * travel : x },
        {
          scale: reduced
            ? 1
            : 1 - Math.min(0.04, (Math.abs(x) / travel) * 0.04),
        },
      ],
    };
  });
  return (
    <Animated.View style={[s.cover, style]}>
      <Artwork
        uri={item.track.artworkUrl}
        palette={item.track.palette}
        size={size}
      />
    </Animated.View>
  );
}

export function PlayerArtwork(props: Props) {
  const { current, previous, next, size } = props;
  const currentId = current.id,
    hasPrevious = !!previous,
    hasNext = !!next;
  const { reduced } = useMotion();
  const { tx } = useLocale();
  const offset = useSharedValue(0),
    origin = useSharedValue(0),
    anchor = useSharedValue(current.id),
    enabled = useSharedValue(true),
    fade = useSharedValue(1);
  const latest = useRef(props),
    old = useRef({ id: current.id, previous: previous?.id, next: next?.id });
  const pending = useRef<{ id: string; direction: number } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  useLayoutEffect(() => {
    if (old.current.id !== current.id) {
      const direction =
        old.current.next === current.id
          ? 1
          : old.current.previous === current.id
            ? -1
            : 0;
      cancelAnimation(offset);
      if (timeout.current) clearTimeout(timeout.current);
      if (reduced || !direction) {
        offset.set(0);
        fade.set(0);
        fade.set(withTiming(1, { duration: 120 }));
      } else {
        const interrupted = pending.current?.id === current.id;
        offset.set((value) =>
          interrupted
            ? value - direction * (size + 24)
            : -direction * (size + 24),
        );
        offset.set(
          withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }),
        );
      }
      pending.current = null;
      enabled.set(true);
    }
    old.current = { id: current.id, previous: previous?.id, next: next?.id };
  }, [
    current.id,
    previous?.id,
    next?.id,
    size,
    reduced,
    offset,
    fade,
    enabled,
  ]);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const commit = useCallback(
    (direction: number, expected: string) => {
      const state = latest.current;
      const target = direction > 0 ? state.next : state.previous;
      if (expected !== state.current.id || !target) {
        offset.set(withSpring(0, settle));
        enabled.set(true);
        return;
      }
      pending.current = { id: target.id, direction };
      state.onSelect(target.id, expected);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        if (pending.current) {
          pending.current = null;
          offset.set(withSpring(0, settle));
          enabled.set(true);
        }
      }, 1200);
    },
    [offset, enabled],
  );
  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-18, 18],
    maxPointers: 1,
    enabled,
    onActivate: () => {
      "worklet";
      cancelAnimation(offset);
      origin.set(offset.get());
      anchor.set(currentId);
    },
    onUpdate: (event) => {
      "worklet";
      const x = origin.get() + event.translationX;
      offset.set(
        x * ((x > 0 && !hasNext) || (x < 0 && !hasPrevious) ? 0.18 : 1),
      );
    },
    onDeactivate: (event) => {
      "worklet";
      const direction =
        event.canceled || anchor.get() !== currentId
          ? 0
          : artworkSwipe(event.translationX, event.velocityX, size);
      if (direction && (direction > 0 ? hasNext : hasPrevious)) {
        enabled.set(false);
        offset.set(
          reduced
            ? 0
            : withTiming(direction * (size + 24), {
                duration: 180,
                easing: Easing.out(Easing.cubic),
              }),
        );
        scheduleOnRN(commit, direction, anchor.get());
      } else
        offset.set(
          reduced ? 0 : withSpring(0, { ...settle, velocity: event.velocityX }),
        );
    },
  });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="player-artwork"
        style={{
          width: size,
          height: size,
          overflow: "hidden",
          borderRadius: 4,
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={current.track.album}
        accessibilityActions={[
          { name: "next", label: tx("Next track") },
          { name: "previous", label: tx("Previous track") },
        ]}
        onAccessibilityAction={(event) =>
          commit(event.nativeEvent.actionName === "next" ? 1 : -1, current.id)
        }
      >
        {next ? (
          <Cover
            key={next.id}
            item={next}
            page={-1}
            offset={offset}
            size={size}
            reduced={reduced}
            fade={fade}
          />
        ) : null}
        <Cover
          key={current.id}
          item={current}
          page={0}
          offset={offset}
          size={size}
          reduced={reduced}
          fade={fade}
        />
        {previous ? (
          <Cover
            key={
              previous.id === next?.id ? `${previous.id}:previous` : previous.id
            }
            item={previous}
            page={1}
            offset={offset}
            size={size}
            reduced={reduced}
            fade={fade}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
const s = StyleSheet.create({
  cover: { position: "absolute", top: 0, left: 0 },
});
