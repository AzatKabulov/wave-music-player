import { Tabs } from "expo-router";
import { theme } from "../../design/theme";
export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.color.bg },
        lazy: true,
        animation: "none",
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
