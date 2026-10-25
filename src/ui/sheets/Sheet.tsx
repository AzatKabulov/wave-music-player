import { ReactNode, useEffect } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { X } from "lucide-react-native";
import { back, ui } from "../Shell";
import { useMotion } from "../../design/Motion";
import { IconButton, Label } from "../../design/Primitives";
import { theme as t } from "../../design/theme";

export function Sheet({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const pan = usePanGesture({
    activeOffsetY: 10,
    maxPointers: 1,
    onUpdate: (e) => {
      y.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      if (!e.canceled && (e.translationY > 90 || e.velocityY > 900))
        scheduleOnRN(back);
      else y.value = withSpring(0, { damping: 26, stiffness: 260 });
    },
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : y.value }],
  }));
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        back();
        return true;
      },
    );
    return () => subscription.remove();
  }, []);
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        entering={FadeIn.duration(reduced ? 0 : 160)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
          onPress={back}
          style={s.backdrop}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(reduced ? 0 : 240)}
        style={[
          s.panel,
          {
            paddingBottom: Math.max(16, insets.bottom),
            marginTop: insets.top + 24,
          },
          style,
        ]}
        accessibilityViewIsModal
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={s.gripArea}>
            <View style={s.grip} />
          </Animated.View>
        </GestureDetector>
        <View style={[ui.row, s.heading]}>
          <Label i18n type="lg" accessibilityRole="header" style={ui.grow}>
            {title}
          </Label>
          <IconButton icon={X} label="Close sheet" onPress={back} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.64)" },
  panel: {
    maxHeight: "90%",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: t.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  gripArea: { height: 28, alignItems: "center", justifyContent: "center" },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color["text-muted"],
  },
  heading: { paddingLeft: 24, paddingRight: 8, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
});
