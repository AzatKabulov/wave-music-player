import { memo, useCallback, useEffect, useRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { seekPosition } from "../data/playerGesture";
import { useMotion } from "../design/Motion";
import { Label } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { useLocale } from "../i18n/LocaleProvider";

function clock(value: number) {
  "worklet";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
const AnimatedInput = Animated.createAnimatedComponent(TextInput);
const Elapsed = memo(function Elapsed({
  position,
}: {
  position: SharedValue<number>;
}) {
  const props = useAnimatedProps<TextInputProps & { text: string }>(() => {
    const text = clock(position.get());
    return { text, defaultValue: text };
  });
  return (
    <AnimatedInput
      animatedProps={props}
      defaultValue="0:00"
      editable={false}
      caretHidden
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      underlineColorAndroid="transparent"
      style={s.time}
    />
  );
});

export function Seek({
  value,
  max,
  onChange,
  playing = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  playing?: boolean;
}) {
  const { tx } = useLocale();
  const { reduced } = useMotion();
  const position = useSharedValue(value),
    live = useSharedValue(value),
    dragging = useSharedValue(false),
    railWidth = useSharedValue(0),
    pressed = useSharedValue(0);
  const pending = useRef<{ value: number; from: number; until: number } | null>(
    null,
  );
  const mounted = useRef(true);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);
  useEffect(() => {
    live.set(value);
    if (dragging.get()) return;
    if (
      pending.current &&
      Date.now() < pending.current.until &&
      !(
        Math.abs(value - pending.current.value) < 1.2 &&
        (Math.abs(value - pending.current.from) > 0.05 ||
          Math.abs(pending.current.value - pending.current.from) < 0.05)
      )
    )
      return;
    pending.current = null;
    if (!playing || Math.abs(position.get() - value) > 1.2) {
      cancelAnimation(position);
      position.set(Math.min(max, Math.max(0, value)));
    }
    if (playing)
      position.set(
        withTiming(Math.min(max, value + 0.5), {
          duration: 500,
          easing: Easing.linear,
        }),
      );
  }, [value, max, playing, position, live, dragging]);
  const commit = useCallback(
    (next: number) => {
      if (!mounted.current) return;
      pending.current = { value: next, from: value, until: Date.now() + 1500 };
      position.set(next);
      dragging.set(false);
      onChange(next);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        if (pending.current) {
          pending.current = null;
          position.set(live.get());
        }
      }, 1500);
    },
    [onChange, position, dragging, live, value],
  );
  const pan = usePanGesture({
    activeOffsetX: [-2, 2],
    failOffsetY: [-18, 18],
    maxPointers: 1,
    enabled: max > 0,
    onActivate: () => {
      "worklet";
      cancelAnimation(position);
      dragging.set(true);
      pressed.set(withTiming(1, { duration: reduced ? 0 : 80 }));
    },
    onUpdate: (event) => {
      "worklet";
      position.set(seekPosition(event.x - 6, railWidth.get(), max));
    },
    onDeactivate: (event) => {
      "worklet";
      pressed.set(withTiming(0, { duration: reduced ? 0 : 140 }));
      if (event.canceled) {
        dragging.set(false);
        position.set(live.get());
      } else
        scheduleOnRN(commit, seekPosition(event.x - 6, railWidth.get(), max));
    },
  });
  const tap = useTapGesture({
    maxDistance: 12,
    enabled: max > 0,
    onBegin: () => {
      "worklet";
      pressed.set(withTiming(1, { duration: reduced ? 0 : 80 }));
    },
    onDeactivate: (event) => {
      "worklet";
      if (!event.canceled) {
        cancelAnimation(position);
        dragging.set(true);
        const next = seekPosition(event.x - 6, railWidth.get(), max);
        position.set(next);
        scheduleOnRN(commit, next);
      }
    },
    onFinalize: (event) => {
      "worklet";
      if (!event.canceled || !dragging.get())
        pressed.set(withTiming(0, { duration: reduced ? 0 : 140 }));
    },
  });
  const gesture = useExclusiveGestures(pan, tap);
  const fill = useAnimatedStyle(() => ({
    transform: [
      { scaleX: max > 0 ? Math.max(0, Math.min(1, position.get() / max)) : 0 },
      { scaleY: reduced ? 1 : 1 + pressed.get() * 0.5 },
    ],
  }));
  const thumb = useAnimatedStyle(() => ({
    opacity: 1 - pressed.get() * 0.08,
    transform: [
      {
        translateX:
          max > 0
            ? Math.max(0, Math.min(1, position.get() / max)) * railWidth.get()
            : 0,
      },
      { scale: reduced ? 1 : 1 + pressed.get() * 0.5 },
    ],
  }));
  return (
    <View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={s.target}
          onLayout={(event) =>
            railWidth.set(Math.max(0, event.nativeEvent.layout.width - 12))
          }
          accessibilityLabel={tx("Playback position")}
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: Math.floor(max),
            now: Math.floor(value),
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) => {
            const base =
              pending.current && Date.now() < pending.current.until
                ? pending.current.value
                : value;
            commit(
              Math.max(
                0,
                Math.min(
                  max,
                  base +
                    (event.nativeEvent.actionName === "increment" ? 5 : -5),
                ),
              ),
            );
          }}
        >
          <View style={s.rail} pointerEvents="none">
            <Animated.View style={[s.fill, fill]} />
          </View>
          <Animated.View pointerEvents="none" style={[s.thumb, thumb]} />
        </Animated.View>
      </GestureDetector>
      <View style={s.times}>
        <Elapsed position={position} />
        <Label
          type="xs"
          color="text-muted"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {clock(max)}
        </Label>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  target: { height: 48, width: "100%" },
  rail: {
    position: "absolute",
    top: 22,
    left: 6,
    right: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color.border,
  },
  fill: {
    height: 4,
    width: "100%",
    borderRadius: 2,
    backgroundColor: t.color.text,
    transformOrigin: "left",
  },
  thumb: {
    position: "absolute",
    top: 19,
    left: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.color.text,
  },
  times: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 20,
  },
  time: {
    width: 100,
    height: 20,
    padding: 0,
    fontSize: 11,
    color: t.color["text-muted"],
    fontVariant: ["tabular-nums"],
  },
});
