import { useLocale } from "../../i18n/LocaleProvider";
import {
  ArrowDownUp,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useDeferredValue, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  TextInput,
} from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { libraryFilters, useLibraryView } from "../useLibraryView";
import { orderedLibrary, libraryMatches } from "../../data/libraryState";
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
  const { tx, locale } = useLocale();
  const m = useMusic(),
    sn = m.snapshot!;
  const { filter, setFilter, grid, setGrid } = useLibraryView(sn.profile!.id);
  const [sort, setSort] = useState(sn.preferences.librarySort);
  const [sorting, setSorting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTerm = useDeferredValue(query).trim();
  const albumsById = new Map(sn.catalog.albums.map((item) => [item.id, item]));
  const artistsById = new Map(
    sn.catalog.artists.map((item) => [item.id, item]),
  );
  const playlistsById = new Map(
    sn.catalog.playlists.map((item) => [item.id, item]),
  );
  const ownedIds = new Set(sn.playlists.map((item) => item.id));
  const dates = new Map(
    (sn.libraryEntries || []).map((item) => [
      `${item.kind}:${item.id}`,
      item.addedAt,
    ]),
  );
  const entries = [
    ...sn.playlists.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: `${tx("Playlist")} · ${tx("Tracks: {count}", { count: p.trackCount ?? p.items.length })}`,
      palette: p.palette,
      artworkUrl: p.artworkUrl,
      kind: "Playlists",
      path: `/playlist/${p.id}`,
      creator: sn.profile?.displayName || "",
    })),
    ...sn.library.playlists
      .filter((id) => !ownedIds.has(id))
      .map((id) => playlistsById.get(id))
      .filter((p) => !!p)
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: tx("Playlist"),
        palette: p.palette,
        artworkUrl: p.artworkUrl,
        kind: "Playlists",
        path: `/playlist/${p.id}`,
        creator: "",
      })),
    ...sn.library.albums
      .map((id) => albumsById.get(id))
      .filter((a) => !!a)
      .map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: `${tx("Album")} · ${a.artist}`,
        palette: a.palette,
        artworkUrl: a.artworkUrl,
        kind: "Albums",
        path: `/album/${a.id}`,
        creator: a.artist,
      })),
    ...sn.library.artists
      .map((id) => artistsById.get(id))
      .filter((a) => !!a)
      .map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: tx("Artist"),
        palette: a.palette,
        artworkUrl: a.artworkUrl,
        kind: "Artists",
        path: `/artist/${a.id}`,
        creator: a.name,
      })),
  ]
    .filter(
      (item) =>
        (filter === "All" || item.kind === filter) &&
        libraryMatches(item.title, item.creator, searchTerm, locale),
    )
    .map((item) => ({
      ...item,
      addedAt: dates.get(`${item.kind.toLowerCase()}:${item.id}`),
    }));
  const ordered = orderedLibrary(entries, sort, locale);
  const showLiked =
    filter === "All" &&
    (!searchTerm || libraryMatches(tx("Liked tracks"), "", searchTerm, locale));
  return (
    <Shell
      title="Your library"
      scroll={false}
      trailing={
        <View style={ui.row}>
          <IconButton
            icon={searching ? X : Search}
            label={searching ? "Close library search" : "Search library"}
            onPress={() => {
              setSearching(!searching);
              setQuery("");
            }}
          />
          <IconButton
            icon={Plus}
            label="Create playlist"
            onPress={() => go("/create")}
          />
        </View>
      }
    >
      {searching ? (
        <View
          style={[s.search, searchFocused && { borderColor: t.color.focus }]}
        >
          <Search size={20} color={t.color["text-muted"]} />
          <TextInput
            autoFocus
            accessibilityLabel={tx("Search your library")}
            placeholder={tx("Search your library")}
            placeholderTextColor={t.color["text-muted"]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={s.searchInput}
          />
          {query ? (
            <IconButton
              icon={X}
              label="Clear search"
              onPress={() => setQuery("")}
            />
          ) : null}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filters}
        contentContainerStyle={{ gap: 8 }}
      >
        {libraryFilters.map((value) => (
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
          i18n
          title={
            sort === "recent"
              ? "Recently added"
              : sort === "title"
                ? "Title"
                : "Creator"
          }
          icon={ArrowDownUp}
          variant="quiet"
          disabled={m.pending}
          onPress={() => setSorting(!sorting)}
        />
        <IconButton
          icon={grid ? List : LayoutGrid}
          label={grid ? "Show list" : "Show grid"}
          onPress={() => {
            setGrid(!grid);
          }}
        />
      </View>
      {sorting ? (
        <View style={s.sort}>
          {(["recent", "title", "creator"] as const).map((value) => (
            <Button
              i18n
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
                const previous = sort;
                void m
                  .run(async () => {
                    await m.data.preferences({
                      ...sn.preferences,
                      librarySort: value,
                    });
                    return true;
                  })
                  .then((saved) => {
                    if (!saved) setSort(previous);
                  });
              }}
            />
          ))}
        </View>
      ) : null}
      <FlatList
        key={grid ? "grid" : "list"}
        data={ordered}
        numColumns={grid ? 2 : 1}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        ListHeaderComponent={
          showLiked ? (
            <Touch
              accessibilityRole="button"
              accessibilityLabel={`${tx("Liked tracks")} ${tx("Tracks: {count}", { count: sn.library.tracks.length })}`}
              onPress={() => go("/liked")}
              style={s.row}
            >
              <View style={s.liked}>
                <Heart color={t.color.text} fill={t.color.text} size={26} />
              </View>
              <View style={ui.grow}>
                <Label i18n style={s.title}>
                  Liked tracks{" "}
                </Label>
                <Label type="sm" color="text-muted">
                  {tx("Tracks: {count}", { count: sn.library.tracks.length })}
                </Label>
              </View>
            </Touch>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={tx("Open {title} {subtitle}", {
              title: item.title,
              subtitle: item.subtitle,
            })}
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
          searchTerm && showLiked ? undefined : (
            <StateView
              title={
                searchTerm
                  ? "No matching collections"
                  : filter === "All"
                    ? "Build your library"
                    : tx("No saved {kind}", { kind: tx(filter) })
              }
              message={
                searchTerm
                  ? "Try another title or creator."
                  : "Keep the music you love here, ready for your next listen."
              }
              action={searchTerm ? "Clear search" : "Find music"}
              onAction={() => (searchTerm ? setQuery("") : go("/search"))}
            />
          )
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        initialNumToRender={12}
        windowSize={7}
      />
    </Shell>
  );
}
const s = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: t.color.text,
    fontSize: 16,
    paddingVertical: 12,
    outlineWidth: 0,
  },
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
