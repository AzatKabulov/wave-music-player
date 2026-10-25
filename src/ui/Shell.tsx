import { router, usePathname } from "expo-router";
import {
  ChevronLeft,
  Home,
  Library,
  Plus,
  Search,
  User,
  X,
} from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useMusic } from "../data/MusicProvider";
import { BrandMark } from "../design/BrandMark";
import { Touch } from "../design/Motion";
import { Button, IconButton, Label } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { useLocale } from "../i18n/LocaleProvider";
import { MiniPlayer } from "./player/MiniPlayer";

export const go = (path: string) => router.push(path as never);
export const back = () =>
  router.canGoBack() ? router.back() : router.replace("/home");
const destinations = [
  { path: "/home", name: "Home", icon: Home },
  { path: "/search", name: "Search", icon: Search },
  { path: "/library", name: "Library", icon: Library },
];

export function NavigationFrame({ children }: { children: React.ReactNode }) {
  const { tx } = useLocale();
  const m = useMusic();
  const path = usePathname();
  const wide = useWindowDimensions().width >= 960;
  const insets = useSafeAreaInsets();
  const immersive =
    path === "/player" ||
    path.startsWith("/actions/") ||
    path.startsWith("/add/");
  const visible = !!m.snapshot?.profile && !immersive;
  return (
    <View style={s.root}>
      {wide && visible ? (
        <SafeAreaView edges={["top", "bottom"]} style={s.sidebar}>
          <View style={ui.row}>
            <BrandMark size={32} />
            <Label type="xl">musify</Label>
          </View>
          <View style={s.sideNav}>
            {destinations.map((d) => (
              <Button
                key={d.path}
                title={tx(d.name)}
                icon={d.icon}
                variant={path === d.path ? "secondary" : "quiet"}
                onPress={() => router.navigate(d.path as never)}
                style={s.sideButton}
              />
            ))}
          </View>
          <Button
            i18n
            title="New playlist"
            icon={Plus}
            variant="quiet"
            onPress={() => go("/create")}
            style={s.sideButton}
          />
          <Label i18n type="sm" color="text-muted">
            Your playlists
          </Label>
          <ScrollView showsVerticalScrollIndicator={false}>
            {m.snapshot?.playlists.map((p) => (
              <Button
                key={p.id}
                title={p.title}
                variant="quiet"
                onPress={() => go(`/playlist/${p.id}`)}
                style={s.sideButton}
              />
            ))}
          </ScrollView>
          <Button
            title={m.snapshot?.profile?.displayName || "Profile"}
            icon={User}
            variant="quiet"
            onPress={() => go("/settings")}
          />
        </SafeAreaView>
      ) : null}
      <View style={s.main}>
        {children}
        {visible ? (
          <View style={[s.chrome, { paddingBottom: insets.bottom }]}>
            <MiniPlayer />
            {!wide ? (
              <View style={s.bottom} accessibilityRole="tablist">
                {destinations.map((d) => {
                  const selected = path === d.path;
                  return (
                    <Touch
                      key={d.path}
                      accessibilityRole="tab"
                      accessibilityLabel={tx(d.name)}
                      accessibilityState={{ selected }}
                      onPress={() => router.navigate(d.path as never)}
                      style={s.destination}
                    >
                      <d.icon
                        size={25}
                        color={selected ? t.color.text : t.color["text-muted"]}
                        strokeWidth={selected ? 2.4 : 1.7}
                      />
                      <Label type="xs" color={selected ? "text" : "text-muted"}>
                        {tx(d.name)}
                      </Label>
                    </Touch>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function Shell({
  children,
  title,
  back: showBack,
  header = true,
  scroll = true,
  trailing,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  back?: boolean;
  header?: boolean;
  scroll?: boolean;
  trailing?: React.ReactNode;
}) {
  const { tx } = useLocale();
  const m = useMusic();
  const wide = useWindowDimensions().width >= 960;
  const contentStyle = [s.content, { paddingHorizontal: wide ? 32 : 16 }];
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={s.main}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {header ? (
          <View style={[s.header, { paddingHorizontal: wide ? 32 : 16 }]}>
            {showBack ? (
              <IconButton icon={ChevronLeft} label="Go back" onPress={back} />
            ) : null}
            <Label
              type={showBack ? "lg" : "xl"}
              accessibilityRole="header"
              style={ui.grow}
            >
              {tx(title)}
            </Label>
            {trailing ||
              (!showBack && m.snapshot?.profile ? (
                <Touch
                  labelIsUI
                  accessibilityRole="button"
                  accessibilityLabel="Open settings"
                  onPress={() => go("/settings")}
                  style={s.avatar}
                >
                  <Label style={s.avatarText}>
                    {m.snapshot.profile.displayName.slice(0, 1).toUpperCase()}
                  </Label>
                </Touch>
              ) : null)}
          </View>
        ) : null}
        {m.error ? (
          <View style={s.alert} accessibilityRole="alert">
            <Label color="danger" style={ui.grow}>
              {m.error}
            </Label>
            <IconButton
              icon={X}
              label="Dismiss error"
              onPress={() => m.setError("")}
            />
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={contentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[...contentStyle, s.main, { paddingBottom: 0 }]}>
            {children}
          </View>
        )}
        {m.notice ? (
          <View style={s.notice} accessibilityRole="alert">
            <Label type="sm" style={ui.grow}>
              {m.notice}
            </Label>
            <IconButton
              icon={X}
              label="Dismiss notification"
              onPress={() => m.setNotice("")}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const ui = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  section: { gap: 16, marginBottom: 28 },
  grow: { flex: 1, minWidth: 0 },
  muted: { color: t.color["text-muted"] },
  h: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: t.color.surface,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  list: { gap: 2 },
  form: { gap: 20, maxWidth: 480, width: "100%", alignSelf: "center" },
});
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: t.color.bg },
  main: { flex: 1, minWidth: 0 },
  safe: { flex: 1, backgroundColor: t.color.bg },
  sidebar: {
    width: 248,
    padding: 24,
    gap: 20,
    backgroundColor: t.color.surface,
  },
  sideNav: { gap: 6, marginTop: 28 },
  sideButton: { justifyContent: "flex-start", paddingHorizontal: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 64,
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.color.accent,
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  avatarText: { color: t.color["on-accent"], fontWeight: "700", fontSize: 18 },
  scroll: { flex: 1 },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  chrome: { backgroundColor: t.color.bg },
  bottom: { flexDirection: "row", minHeight: 64 },
  destination: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    paddingLeft: 12,
    backgroundColor: t.color.surface,
    borderRadius: 8,
  },
  notice: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    paddingLeft: 16,
    backgroundColor: t.color["surface-raised"],
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
