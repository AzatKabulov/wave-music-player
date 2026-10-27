import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
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
import {
  advanceArtworkWindow,
  type ArtworkWindow,
} from "../../data/artworkWindow";
import { artworkSwipe } from "../../data/playerGesture";
import type { Track } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { useMotion } from "../../design/Motion";
import { useLocale } from "../../i18n/LocaleProvider";

type Item = { id: string; track: Track };
type RetainedCover = { item: Item; coordinate: number };
export type PlayerArtworkHandle = { step: (direction: 1 | -1) => void };
type Props = {
  current: Item;
  previous?: Item;
  next?: Item;
  size: number;
  onSelect: (id: string, expectedCurrentId: string) => void;
  ref?: Ref<PlayerArtworkHandle>;
};
// The owner explicitly prefers a more measured player cadence. Keep one settle;
// an audio acknowledgement must never restart the cover's animation.
const transition = { duration: 420, easing: Easing.bezier(0.2, 0.65, 0.3, 1) };
const settle = {
  stiffness: 180,
  damping: 27,
  mass: 1,
  overshootClamping: true,
};

function Cover({
  item,
  page,
  coordinate,
  position,
  size,
  reduced,
  fade,
}: {
  item: Item;
  page: number;
  coordinate: number;
  position: SharedValue<number>;
  size: number;
  reduced: boolean;
  fade: SharedValue<number>;
}) {
  const travel = size + 24;
  const style = useAnimatedStyle(() => {
    const x = (coordinate - position.get()) * travel;
    return {
      opacity: reduced ? (page === 0 ? fade.get() : 0) : fade.get(),
      transform: [{ translateX: reduced ? page * travel : x }],
    };
  });
  return (
    <Animated.View
      testID={`player-cover-${page}`}
      nativeID={`cover-${item.id}-${coordinate}`}
      style={[s.cover, style]}
    >
      <Artwork
        uri={item.track.artworkUrl}
        palette={item.track.palette}
        size={size}
      />
    </Animated.View>
  );
}

export function PlayerArtwork(props: Props) {
  const { current, previous, next, size, ref } = props;
  const { reduced } = useMotion();
  const { tx } = useLocale();
  const [retained, setRetained] = useState<RetainedCover[]>([]);
  const [window, setWindow] = useState<ArtworkWindow>({
    id: current.id,
    previous: previous?.id,
    next: next?.id,
    coordinate: 0,
  });
  let model = window;
  if (
    window.id !== current.id ||
    window.previous !== previous?.id ||
    window.next !== next?.id
  ) {
    model = advanceArtworkWindow(window, current.id, previous?.id, next?.id);
    setWindow(model);
  }
  const coordinate = model.coordinate;
  const currentId = current.id,
    hasPrevious = !!previous,
    hasNext = !!next;
  const position = useSharedValue(0),
    origin = useSharedValue(0),
    anchor = useSharedValue(current.id),
    enabled = useSharedValue(true),
    dragging = useSharedValue(false),
    fade = useSharedValue(1);
  const latest = useRef({ props, coordinate }),
    old = useRef({ id: current.id, coordinate });
  const pending = useRef<{ id: string; crossfade?: boolean } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useLayoutEffect(() => {
    latest.current = { props, coordinate };
    if (old.current.id !== current.id) {
      const ownTransition = pending.current?.id === current.id;
      const crossfade = ownTransition && pending.current?.crossfade;
      if (timeout.current) clearTimeout(timeout.current);
      pending.current = null;
      enabled.set(true);
      if (reduced || crossfade || old.current.coordinate === coordinate) {
        cancelAnimation(position);
        position.set(coordinate);
        fade.set(0);
        fade.set(withTiming(1, { duration: 140 }));
      } else if (!ownTransition) {
        setRetained([]);
        position.set(withTiming(coordinate, transition));
      }
      // Acknowledgement moves the window, not the covers or their velocity.
    }
    old.current = { id: current.id, coordinate };
  }, [props, coordinate, current.id, reduced, position, fade, enabled]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timeout.current) clearTimeout(timeout.current);
      if (retentionTimer.current) clearTimeout(retentionTimer.current);
    };
  }, []);

  const commit = useCallback(
    (direction: 1 | -1, expected: string, fromGesture = false) => {
      if (!alive.current) return;
      const { props: state, coordinate: base } = latest.current;
      const target = direction > 0 ? state.next : state.previous;
      if (expected !== state.current.id || !target || pending.current) {
        if (!pending.current) {
          position.set(reduced ? base : withSpring(base, settle));
          enabled.set(true);
        }
        return;
      }
      const destination = base + direction;
      // Retain outgoing covers through overlapping presses. Normally only the
      // three neighbors render. Bound an extreme input burst with a crossfade.
      const crossfade = retained.length >= 12;
      pending.current = { id: target.id, crossfade };
      const outgoing: RetainedCover[] = [
        { item: state.current, coordinate: base },
      ];
      if (state.next) outgoing.push({ item: state.next, coordinate: base + 1 });
      if (state.previous)
        outgoing.push({ item: state.previous, coordinate: base - 1 });
      setRetained((old) =>
        crossfade
          ? []
          : [
              ...new Map(
                [...old, ...outgoing].map((cover) => [
                  `${cover.item.id}:${cover.coordinate}`,
                  cover,
                ]),
              ).values(),
            ],
      );
      if (retentionTimer.current) clearTimeout(retentionTimer.current);
      const releaseCovers = () => {
        if (!alive.current) return;
        if (
          dragging.get() ||
          pending.current ||
          Math.abs(position.get() - latest.current.coordinate) > 0.002
        ) {
          retentionTimer.current = setTimeout(releaseCovers, 120);
        } else setRetained([]);
      };
      retentionTimer.current = setTimeout(
        releaseCovers,
        transition.duration + 100,
      );
      enabled.set(false);
      setWindow((value) => ({
        ...value,
        pending: { id: target.id, direction },
      }));
      if (crossfade) {
        cancelAnimation(position);
        fade.set(0);
      } else if (!fromGesture)
        position.set(
          reduced ? destination : withTiming(destination, transition),
        );
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        if (pending.current?.id !== target.id) return;
        pending.current = null;
        setWindow((value) => ({ ...value, pending: undefined }));
        position.set(reduced ? base : withSpring(base, settle));
        fade.set(withTiming(1, { duration: 140 }));
        enabled.set(true);
      }, 1600);
      state.onSelect(target.id, expected);
    },
    [position, enabled, reduced, retained, fade, dragging],
  );
  useImperativeHandle(
    ref,
    () => ({
      step: (direction) => commit(direction, latest.current.props.current.id),
    }),
    [commit],
  );

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-18, 18],
    maxPointers: 1,
    enabled,
    onActivate: () => {
      "worklet";
      cancelAnimation(position);
      dragging.set(true);
      origin.set(position.get());
      anchor.set(currentId);
    },
    onUpdate: (event) => {
      "worklet";
      const movement = -event.translationX / (size + 24);
      const resisted =
        (movement > 0 && !hasNext) || (movement < 0 && !hasPrevious);
      position.set(
        Math.max(
          coordinate - (hasPrevious ? 1 : 0.15),
          Math.min(
            coordinate + (hasNext ? 1 : 0.15),
            origin.get() + movement * (resisted ? 0.18 : 1),
          ),
        ),
      );
    },
    onDeactivate: (event) => {
      "worklet";
      dragging.set(false);
      const direction =
        event.canceled || anchor.get() !== currentId
          ? 0
          : artworkSwipe(event.translationX, event.velocityX, size);
      if (direction && (direction > 0 ? hasNext : hasPrevious)) {
        enabled.set(false);
        position.set(
          reduced
            ? coordinate + direction
            : withTiming(coordinate + direction, transition),
        );
        scheduleOnRN(commit, direction, anchor.get(), true);
      } else
        position.set(
          reduced
            ? coordinate
            : withSpring(coordinate, {
                ...settle,
                velocity: -event.velocityX / (size + 24),
              }),
        );
    },
  });
  const neighbors: RetainedCover[] = [{ item: current, coordinate }];
  if (next) neighbors.push({ item: next, coordinate: coordinate + 1 });
  if (previous) neighbors.push({ item: previous, coordinate: coordinate - 1 });
  const covers = [
    ...new Map(
      [...retained, ...neighbors].map((cover) => [
        `${cover.item.id}:${cover.coordinate}`,
        cover,
      ]),
    ).values(),
  ];
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
        {covers.map((cover) => (
          <Cover
            key={`${cover.item.id}:${cover.coordinate}`}
            item={cover.item}
            page={cover.coordinate - coordinate}
            coordinate={cover.coordinate}
            position={position}
            size={size}
            reduced={reduced}
            fade={fade}
          />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
const s = StyleSheet.create({
  cover: { position: "absolute", top: 0, left: 0 },
});
