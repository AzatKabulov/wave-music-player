import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MusicProvider } from "../data/MusicProvider";
import { MotionProvider, useMotion } from "../design/Motion";
import { NavigationFrame } from "../ui/Shell";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { theme } from "../design/theme";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <MotionProvider>
            <MusicProvider>
              <StatusBar style="light" />
              <NavigationFrame>
                <AppStack />
              </NavigationFrame>
            </MusicProvider>
          </MotionProvider>
        </GestureHandlerRootView>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
function AppStack() {
  const { reduced } = useMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg },
        animation: reduced ? "fade" : "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen
        name="player"
        options={{
          presentation: "fullScreenModal",
          animation: reduced ? "fade" : "slide_from_bottom",
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="actions/[id]"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="add/[id]"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
