import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { usePanGesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { dismissPlayer } from "../../data/playerGesture";
import { useMotion } from "../../design/Motion";
import { back } from "../Shell";

const leavePlayer = (destination?: string) =>
  destination ? router.dismissTo(destination as never) : back();

export function usePlayerSurface(height: number, color: string) {
  const { reduced } = useMotion();
  const y = useSharedValue(height),
    start = useSharedValue(0),
    opacity = useSharedValue(reduced ? 0 : 1),
    closing = useSharedValue(false),
    tint = useSharedValue(color);
  const opened = useRef(false);
  useEffect(() => {
    tint.set(withTiming(color, { duration: reduced ? 120 : 240 }));
  }, [color, reduced, tint]);
  useEffect(() => {
    if (!opened.current) {
      y.set(reduced ? 0 : height);
      if (reduced) opacity.set(withTiming(1, { duration: 120 }));
      else
        y.set(
          withTiming(0, {
            duration: 440,
            easing: Easing.bezier(0.2, 0.65, 0.3, 1),
          }),
        );
      opened.current = true;
    }
  }, [height, reduced, y, opacity]);
  const dismiss = useCallback(
    (velocity = 0, destination?: string) => {
      "worklet";
      if (closing.get()) return;
      closing.set(true);
      const done = (finished?: boolean) => {
        "worklet";
        if (finished) scheduleOnRN(leavePlayer, destination);
      };
      if (reduced) opacity.set(withTiming(0, { duration: 100 }, done));
      else
        y.set(
          withTiming(
            height,
            {
              duration: Math.max(
                240,
                Math.min(
                  360,
                  360 *
                    Math.sqrt(Math.max(0, height - y.get()) / height) *
                    (velocity > 1400 ? 0.9 : 1),
                ),
              ),
              easing: Easing.bezier(0.2, 0.65, 0.3, 1),
            },
            done,
          ),
        );
    },
    [closing, reduced, opacity, y, height],
  );
  const close = useCallback(() => dismiss(), [dismiss]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        close();
        return true;
      });
      return () => listener.remove();
    }, [close]),
  );
  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    failOffsetX: [-18, 18],
    maxPointers: 1,
    onActivate: () => {
      "worklet";
      cancelAnimation(y);
      cancelAnimation(opacity);
      start.set(y.get());
      closing.set(false);
    },
    onUpdate: (event) => {
      "worklet";
      y.set(Math.min(height, Math.max(0, start.get() + event.translationY)));
    },
    onDeactivate: (event) => {
      "worklet";
      if (!event.canceled && dismissPlayer(y.get(), event.velocityY, height))
        dismiss(event.velocityY);
      else {
        closing.set(false);
        y.set(
          reduced
            ? 0
            : withSpring(0, {
                stiffness: 180,
                damping: 27,
                mass: 1,
                overshootClamping: true,
                velocity: event.velocityY,
              }),
        );
        opacity.set(withTiming(1, { duration: 100 }));
      }
    },
  });
  const style = useAnimatedStyle(() => ({
    backgroundColor: tint.get(),
    opacity: reduced
      ? opacity.get() * (1 - Math.min(0.25, y.get() / height))
      : 1,
    transform: [{ translateY: reduced ? 0 : y.get() }],
  }));
  return { pan, style, close, returnTo: (path: string) => dismiss(0, path) };
}
