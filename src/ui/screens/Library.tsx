import {
  ArrowDownUp,
  Heart,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { deviceStorage } from "../../data/storage";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import {
  Button,
  Chip,
  IconButton,
  Label,
  StateView,
} from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

export function LibraryScreen() {
  const m = useMusic(),
    sn = m.snapshot!;
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState(sn.preferences.librarySort);
  const [sorting, setSorting] = useState(false);
  const [grid, setGrid] = useState(false);
  useEffect(() => {
    void deviceStorage
      .getItem("musify.library.grid")
      .then((value) => setGrid(value === "1"));
  }, []);
  const entries = [
    ...sn.playlists.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: `Playlist · ${p.items.length} tracks`,
      palette: p.palette,
      artworkUrl: p.artworkUrl,
      kind: "Playlists",
      path: `/playlist/${p.id}`,
      creator: sn.profile?.displayName || "",
    })),
    ...sn.library.playlists
      .map((id) => sn.catalog.playlists.find((p) => p.id === id))
      .filter((p) => !!p)
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: "Playlist",
        palette: p.palette,
        artworkUrl: p.artworkUrl,
        kind: "Playlists",
        path: `/playlist/${p.id}`,
        creator: "",
      })),
    ...sn.library.albums
      .map((id) => sn.catalog.albums.find((a) => a.id === id))
      .filter((a) => !!a)
      .map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: `Album · ${a.artist}`,
        palette: a.palette,
        artworkUrl: a.artworkUrl,
        kind: "Albums",
        path: `/album/${a.id}`,
        creator: a.artist,
      })),
    ...sn.library.artists
      .map((id) => sn.catalog.artists.find((a) => a.id === id))
      .filter((a) => !!a)
      .map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: "Artist",
        palette: a.palette,
        artworkUrl: undefined,
        kind: "Artists",
        path: `/artist/${a.id}`,
        creator: a.name,
      })),
  ].filter((item) => filter === "All" || item.kind === filter);
  if (sort !== "recent")
    entries.sort((a, b) =>
      (sort === "title" ? a.title : a.creator).localeCompare(
        sort === "title" ? b.title : b.creator,
      ),
    );
  return (
    <Shell
      title="Your library"
      scroll={false}
      trailing={
        <IconButton
          icon={Plus}
          label="Create playlist"
          onPress={() => go("/create")}
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filters}
        contentContainerStyle={{ gap: 8 }}
      >
        {["All", "Playlists", "Albums", "Artists"].map((value) => (
          <Chip
            key={value}
            title={value}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </ScrollView>
      <View style={ui.h}>
        <Button
          title={
            sort === "recent"
              ? "Recently added"
              : sort === "title"
                ? "Title"
                : "Creator"
          }
          icon={ArrowDownUp}
          variant="quiet"
          onPress={() => setSorting(!sorting)}
        />
        <IconButton
          icon={grid ? List : LayoutGrid}
          label={grid ? "Show list" : "Show grid"}
          onPress={() => {
            setGrid(!grid);
            void deviceStorage.setItem("musify.library.grid", grid ? "0" : "1");
          }}
        />
      </View>
      {sorting ? (
        <View style={s.sort}>
          {(["recent", "title", "creator"] as const).map((value) => (
            <Button
              key={value}
              title={
                value === "recent"
                  ? "Recently added"
                  : value === "title"
                    ? "Title"
                    : "Creator"
              }
              variant={sort === value ? "secondary" : "quiet"}
              onPress={() => {
                setSort(value);
                setSorting(false);
                void m.run(() =>
                  m.data.preferences({ ...sn.preferences, librarySort: value }),
                );
              }}
            />
          ))}
        </View>
      ) : null}
      <FlatList
        key={grid ? "grid" : "list"}
        data={entries}
        numColumns={grid ? 2 : 1}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        ListHeaderComponent={
          filter === "All" ? (
            <Touch
              accessibilityRole="button"
              accessibilityLabel={`Liked tracks ${sn.library.tracks.length} tracks`}
              onPress={() => go("/liked")}
              style={s.row}
            >
              <View style={s.liked}>
                <Heart color={t.color.text} fill={t.color.text} size={26} />
              </View>
              <View style={ui.grow}>
                <Label style={s.title}>Liked tracks </Label>
                <Label type="sm" color="text-muted">
                  {sn.library.tracks.length} tracks
                </Label>
              </View>
            </Touch>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title} ${item.subtitle}`}
            onPress={() => go(item.path)}
            style={grid ? s.gridItem : s.row}
          >
            <Artwork
              palette={item.palette}
              uri={item.artworkUrl}
              size={grid ? 136 : 56}
              round={item.kind === "Artists"}
            />
            <View style={grid ? undefined : ui.grow}>
              <Label numberOfLines={2} style={s.title}>
                {item.title}{" "}
              </Label>
              <Label type="sm" color="text-muted" numberOfLines={2}>
                {item.subtitle}
              </Label>
            </View>
          </Touch>
        )}
        ListEmptyComponent={
          <StateView
            title={
              filter === "All"
                ? "Build your library"
                : `No saved ${filter.toLowerCase()}`
            }
            message="Keep the music you love here, ready for your next listen."
            action="Find music"
            onAction={() => go("/search")}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        initialNumToRender={12}
        windowSize={7}
      />
    </Shell>
  );
}
const s = StyleSheet.create({
  filters: { flexGrow: 0, maxHeight: 56, marginBottom: 8 },
  sort: {
    padding: 8,
    backgroundColor: t.color.surface,
    borderRadius: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 76,
    paddingVertical: 6,
  },
  liked: {
    width: 56,
    height: 56,
    backgroundColor: t.color["art-berry"],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  gridItem: { flex: 1, padding: 8, gap: 8 },
  title: { fontWeight: "600" },
});
