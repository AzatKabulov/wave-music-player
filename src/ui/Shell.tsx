import { router, usePathname } from "expo-router";
import {
  AudioLines,
  ChevronLeft,
  Home,
  Library,
  Pause,
  Play,
  Plus,
  Search,
  SkipForward,
  User,
  X,
} from "lucide-react-native";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMusic } from "../data/MusicProvider";
import { Artwork } from "../design/Artwork";
import { Button, IconButton, Label } from "../design/Primitives";
import { theme as t } from "../design/theme";
export const go = (path: string) => router.push(path as never);
const destinations = [
  { path: "/home", name: "Home", icon: Home },
  { path: "/search", name: "Search", icon: Search },
  { path: "/library", name: "Library", icon: Library },
];
export function Shell({
  children,
  title,
  eyebrow,
  back,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  back?: boolean;
}) {
  const m = useMusic(),
    path = usePathname(),
    wide = useWindowDimensions().width >= t.space[960];
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={s.root}>
        {wide ? (
          <View style={s.sidebar}>
            <View style={s.brand}>
              <AudioLines color={t.color.accent} size={t.icon.lg} />
              <Label type="xl">saz</Label>
            </View>
            <Label type="xs" color="text-muted">
              YOUR EVERYDAY SOUNDTRACK
            </Label>
            <View style={s.sideNav}>
              {destinations.map((d) => (
                <Button
                  key={d.path}
                  title={d.name}
                  icon={d.icon}
                  variant={path === d.path ? "secondary" : "quiet"}
                  onPress={() => go(d.path)}
                  style={s.sideButton}
                />
              ))}
            </View>
            <Button
              title="New playlist"
              icon={Plus}
              variant="quiet"
              onPress={() => go("/create")}
            />
            <View style={s.divider} />
            <Label type="xs" color="text-muted">
              MADE BY YOU
            </Label>
            {(m.snapshot?.playlists || []).map((p) => (
              <Button
                key={p.id}
                title={p.title}
                variant="quiet"
                onPress={() => go(`/playlist/${p.id}`)}
                style={s.sideButton}
              />
            ))}
            <View style={s.grow} />
            <Button
              title={m.snapshot?.profile?.displayName || "Sign in"}
              icon={User}
              variant="quiet"
              onPress={() => go("/settings")}
            />
          </View>
        ) : null}
        <View style={s.main}>
          <View
            style={[
              s.header,
              {
                paddingHorizontal: wide
                  ? t.layout.desktopPadding
                  : t.layout.phonePadding,
              },
            ]}
          >
            <View style={s.row}>
              {back ? (
                <IconButton
                  icon={ChevronLeft}
                  label="Go back"
                  onPress={() =>
                    router.canGoBack() ? router.back() : go("/home")
                  }
                />
              ) : (
                <AudioLines color={t.color.accent} size={t.icon.lg} />
              )}
              <View style={s.grow}>
                {eyebrow ? (
                  <Label type="xs" color="text-muted">
                    {eyebrow}
                  </Label>
                ) : null}
                <Label type={back ? "lg" : "xl"} accessibilityRole="header">
                  {title}
                </Label>
              </View>
              <IconButton
                icon={User}
                label="Open settings"
                onPress={() => go("/settings")}
              />
            </View>
          </View>
          {m.error ? (
            <View style={s.alert} accessibilityRole="alert">
              <Label color="danger" style={s.grow}>
                {m.error}
              </Label>
              <IconButton
                icon={X}
                label="Dismiss error"
                onPress={() => m.setError("")}
              />
            </View>
          ) : null}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.content,
              {
                paddingHorizontal: wide
                  ? t.layout.desktopPadding
                  : t.layout.phonePadding,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {m.notice ? (
            <View style={s.notice} accessibilityRole="alert">
              <Label type="sm">{m.notice}</Label>
            </View>
          ) : null}
          {m.track && path !== "/player" ? (
            <View style={s.mini}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open player for ${m.track.title}`}
                onPress={() => go("/player")}
                style={[s.row, s.grow]}
              >
                <Artwork palette={m.track.palette} size={t.space[48]} />
                <View style={s.grow}>
                  <Label numberOfLines={1}>{m.track.title}</Label>
                  <Label type="sm" color="text-muted" numberOfLines={1}>
                    {m.track.artist}
                  </Label>
                </View>
              </Pressable>
              <IconButton
                icon={m.status.playing ? Pause : Play}
                label={m.status.playing ? "Pause" : "Play"}
                onPress={m.toggle}
              />
              <IconButton
                icon={SkipForward}
                label="Next track"
                onPress={m.next}
              />
            </View>
          ) : null}
          {!wide ? (
            <View style={s.bottom}>
              {destinations.map((d) => (
                <Pressable
                  key={d.path}
                  accessibilityRole="button"
                  accessibilityLabel={d.name}
                  accessibilityState={{ selected: path === d.path }}
                  onPress={() => go(d.path)}
                  style={s.destination}
                >
                  <d.icon
                    color={
                      path === d.path ? t.color.text : t.color["text-muted"]
                    }
                    size={t.icon.base}
                  />
                  <Label
                    type="xs"
                    color={path === d.path ? "text" : "text-muted"}
                  >
                    {d.name}
                  </Label>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
export const ui = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: t.space[12] },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: t.space[8],
  },
  section: { gap: t.space[20], marginBottom: t.space[32] },
  grow: { flex: 1, minWidth: 0 },
  muted: { color: t.color["text-muted"] },
  h: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space[12],
  },
  card: {
    backgroundColor: t.color.surface,
    padding: t.space[20],
    borderRadius: t.radius.lg,
    gap: t.space[16],
  },
  list: { gap: t.space[4] },
  form: {
    gap: t.space[20],
    maxWidth: t.space[480],
    width: "100%",
    alignSelf: "center",
  },
});
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.bg },
  root: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: t.layout.sidebar,
    padding: t.space[24],
    gap: t.space[16],
    borderRightWidth: t.layout.borderWidth,
    borderColor: t.color.border,
  },
  brand: {
    flexDirection: "row",
    gap: t.space[10],
    alignItems: "center",
    paddingVertical: t.space[16],
  },
  sideNav: { gap: t.space[8], marginTop: t.space[32] },
  sideButton: { justifyContent: "flex-start", paddingHorizontal: t.space[12] },
  divider: {
    height: t.layout.borderWidth,
    backgroundColor: t.color.border,
    marginVertical: t.space[16],
  },
  grow: { flex: 1, minWidth: 0 },
  main: { flex: 1, minWidth: 0 },
  header: {
    paddingVertical: t.space[16],
    borderBottomWidth: t.layout.borderWidth,
    borderColor: t.color.surface,
  },
  row: { flexDirection: "row", alignItems: "center", gap: t.space[12] },
  scroll: { flex: 1 },
  content: {
    paddingTop: t.space[24],
    paddingBottom: t.space[40],
    maxWidth: t.layout.contentMax,
    width: "100%",
    alignSelf: "center",
  },
  mini: {
    minHeight: t.layout.miniPlayer,
    backgroundColor: t.color["surface-raised"],
    paddingHorizontal: t.space[12],
    gap: t.space[8],
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: t.layout.borderWidth,
    borderColor: t.color.border,
  },
  bottom: {
    flexDirection: "row",
    minHeight: t.layout.bottomNav,
    backgroundColor: t.color.surface,
  },
  destination: {
    flex: 1,
    minHeight: t.layout.touch,
    alignItems: "center",
    justifyContent: "center",
    gap: t.space[4],
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[12],
    paddingHorizontal: t.space[20],
    backgroundColor: t.color.surface,
  },
  notice: {
    padding: t.space[12],
    backgroundColor: t.color["surface-pressed"],
    alignItems: "center",
  },
});
