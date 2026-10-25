import * as Haptics from "expo-haptics";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { deviceStorage } from "../data/storage";

const MotionContext = createContext({
  reduced: false,
  haptics: true,
  setHaptics: (_value: boolean) => {},
});
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);
  const [haptics, updateHaptics] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    void deviceStorage.getItem("musify.haptics").then((value) => {
      if (active && value !== null) updateHaptics(value !== "off");
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  const setHaptics = (value: boolean) => {
    updateHaptics(value);
    void deviceStorage
      .setItem("musify.haptics", value ? "on" : "off")
      .catch(() => {});
  };
  return (
    <MotionContext.Provider value={{ reduced, haptics, setHaptics }}>
      {children}
    </MotionContext.Provider>
  );
}
export const useMotion = () => useContext(MotionContext);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Touch({
  style,
  onPressIn,
  onPressOut,
  onPress,
  haptic = false,
  ...props
}: Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const { reduced, haptics } = useMotion();
  const progress = useSharedValue(0);
  const animated = useAnimatedStyle(
    () => ({
      transform: [{ scale: reduced ? 1 : 1 - progress.value * 0.025 }],
      opacity: 1 - progress.value * 0.16,
    }),
    [reduced],
  );
  return (
    <AnimatedPressable
      {...props}
      style={[style, animated]}
      onPressIn={(event) => {
        progress.value = withTiming(1, { duration: 80 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withTiming(0, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        });
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic && haptics && Platform.OS !== "web")
          void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
    />
  );
}
