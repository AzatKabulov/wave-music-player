import { useLocale } from "../../i18n/LocaleProvider";
import { Clock3, Music2, Search, X } from "lucide-react-native";
import { useDeferredValue, useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { useCatalogSearch } from "../../data/useCatalogSearch";
import type { SearchKind } from "../../data/types";
import { deviceStorage } from "../../data/storage";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import {
  Button,
  Chip,
  IconButton,
  Label,
  StateView,
  Skeleton,
} from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";
import { TrackRow } from "../TrackRow";
import { Cards, Section } from "./common";

export function SearchScreen() {
  const { tx } = useLocale();
  const m = useMusic(),
    c = m.snapshot!.catalog;
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All");
  const [category, setCategory] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const deferred = useDeferredValue(query);
  const q = deferred.trim().normalize("NFKC").toLocaleLowerCase();
  const searchKind = (
    {
      All: "all",
      Tracks: "track",
      Albums: "album",
      Artists: "artist",
      Playlists: "playlist",
    } as Record<string, SearchKind>
  )[kind];
  const remote = useCatalogSearch(q, searchKind);
  const historyKey = `musify.search.${m.snapshot!.profile!.id}`;
  useEffect(() => {
    let active = true;
    void deviceStorage.getItem(historyKey).then((value) => {
      if (active) {
        try {
          const parsed = JSON.parse(value || "[]");
          if (Array.isArray(parsed))
            setRecent(
              parsed.filter((item) => typeof item === "string").slice(0, 6),
            );
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, [historyKey]);
  const remember = (value = query) => {
    if (!value.trim()) return;
    const next = [
      value.trim(),
      ...recent.filter((item) => item !== value.trim()),
    ].slice(0, 6);
    setRecent(next);
    void deviceStorage.setItem(historyKey, JSON.stringify(next));
  };
  const matches = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase().includes(q);
  const tracks = q
    ? remote.page?.data.flatMap((result) =>
        result.kind === "track" ? [result.item] : [],
      ) || []
    : c.tracks.filter(
        (track) =>
          matches(`${track.title} ${track.artist} ${track.album}`) &&
          (!category || track.genre === category),
      );
  const albums = q
    ? remote.page?.data.flatMap((result) =>
        result.kind === "album" ? [result.item] : [],
      ) || []
    : c.albums.filter((album) => matches(`${album.title} ${album.artist}`));
  const artists = q
    ? remote.page?.data.flatMap((result) =>
        result.kind === "artist" ? [result.item] : [],
      ) || []
    : c.artists.filter((artist) => matches(artist.name));
  const playlists = q
    ? remote.page?.data.flatMap((result) =>
        result.kind === "playlist" ? [result.item] : [],
      ) || []
    : [...c.playlists, ...m.snapshot!.playlists].filter((playlist) =>
        matches(playlist.title),
      );
  const active = !!q || !!category;
  const shownTracks = kind === "All" || kind === "Tracks" ? tracks : [];
  const otherCount =
    (kind === "All" || kind === "Albums" ? albums.length : 0) +
    (kind === "All" || kind === "Artists" ? artists.length : 0) +
    (kind === "All" || kind === "Playlists" ? playlists.length : 0);
  const genres = [
    ...new Set(c.tracks.map((track) => track.genre).filter(Boolean)),
  ];
  const colors = [
    t.color["art-forest"],
    t.color["art-night"],
    t.color["art-clay"],
    t.color["art-berry"],
    t.color["art-sea"],
    t.color["art-sand"],
  ];
  return (
    <Shell title="Search" scroll={false}>
      <View style={s.search}>
        <Search size={23} color={t.color.bg} />
        <TextInput
          accessibilityLabel={tx("Search music")}
          placeholder={tx("What do you want to listen to?")}
          placeholderTextColor="#494950"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setCategory("");
          }}
          onSubmitEditing={() => remember()}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={120}
          style={s.input}
        />
        {query ? (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={tx("Clear search")}
            onPress={() => {
              setQuery("");
              setCategory("");
            }}
            style={s.clear}
          >
            <X size={22} color={t.color.bg} />
          </Touch>
        ) : null}
      </View>
      {active ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filters}
            style={s.filterScroll}
          >
            {["All", "Tracks", "Albums", "Artists", "Playlists"].map(
              (value) => (
                <Chip
                  key={value}
                  title={value}
                  selected={kind === value}
                  onPress={() => setKind(value)}
                />
              ),
            )}
          </ScrollView>
          <FlatList
            data={shownTracks}
            keyExtractor={(track) => track.id}
            renderItem={({ item, index }) => (
              <TrackRow track={item} context={shownTracks} index={index} />
            )}
            ListHeaderComponent={
              shownTracks.length ? (
                <Label i18n type="lg" style={s.resultTitle}>
                  {category || "Tracks"}
                </Label>
              ) : undefined
            }
            ListEmptyComponent={
              q && remote.busy && !remote.page ? (
                <View style={{ gap: 12 }}>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </View>
              ) : !remote.error && !shownTracks.length && !otherCount ? (
                <StateView
                  title="Nothing matched this time"
                  message={tx(
                    "Try a shorter name or a different spelling for “{query}”.",
                    { query: query || category },
                  )}
                />
              ) : undefined
            }
            ListFooterComponent={
              <View style={s.other}>
                {(kind === "All" || kind === "Albums") && albums.length ? (
                  <Section title="Albums">
                    <Cards items={albums} type="album" />
                  </Section>
                ) : null}
                {(kind === "All" || kind === "Artists") && artists.length ? (
                  <Section title="Artists">
                    {artists.map((artist) => (
                      <Touch
                        key={artist.id}
                        accessibilityRole="button"
                        accessibilityLabel={artist.name}
                        onPress={() => {
                          remember();
                          go(`/artist/${artist.id}`);
                        }}
                        style={s.recent}
                      >
                        <Artwork palette={artist.palette} size={48} round />
                        <View>
                          <Label>{artist.name}</Label>
                          <Label i18n type="sm" color="text-muted">
                            Artist
                          </Label>
                        </View>
                      </Touch>
                    ))}
                  </Section>
                ) : null}
                {(kind === "All" || kind === "Playlists") &&
                playlists.length ? (
                  <Section title="Playlists">
                    <Cards items={playlists} type="playlist" />
                  </Section>
                ) : null}
                {remote.error && q ? (
                  <StateView
                    title="Search could not load"
                    message={remote.error}
                    action="Try again"
                    onAction={
                      remote.page ? () => void remote.loadMore() : remote.retry
                    }
                  />
                ) : null}
                {q && remote.page?.nextCursor && !remote.error ? (
                  <Button
                    i18n
                    title="Load more"
                    variant="secondary"
                    busy={remote.busy}
                    onPress={() => void remote.loadMore()}
                  />
                ) : null}
              </View>
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={7}
          />
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {recent.length ? (
            <Section title="Recent searches">
              {recent.map((value) => (
                <View key={value} style={ui.row}>
                  <Touch
                    accessibilityRole="button"
                    accessibilityLabel={tx("Search {query}", { query: value })}
                    onPress={() => setQuery(value)}
                    style={[s.recent, ui.grow]}
                  >
                    <Clock3 size={22} color={t.color["text-muted"]} />
                    <Label numberOfLines={1} style={ui.grow}>
                      {value}
                    </Label>
                  </Touch>
                  <IconButton
                    icon={X}
                    label={tx("Remove search {query}", { query: value })}
                    onPress={() => {
                      const next = recent.filter((item) => item !== value);
                      setRecent(next);
                      void deviceStorage.setItem(
                        historyKey,
                        JSON.stringify(next),
                      );
                    }}
                  />
                </View>
              ))}
            </Section>
          ) : null}
          <Section title="Browse your music">
            <View style={s.browse}>
              {genres.map((genre, index) => (
                <Touch
                  key={genre}
                  accessibilityRole="button"
                  accessibilityLabel={tx("Browse {genre}", { genre })}
                  onPress={() => {
                    setCategory(genre);
                    setKind("Tracks");
                  }}
                  style={[
                    s.tile,
                    { backgroundColor: colors[index % colors.length] },
                  ]}
                >
                  <Label i18n type="lg" style={s.tileTitle}>
                    {genre}
                  </Label>
                  <Music2 size={42} color={t.color.text} style={s.tileIcon} />
                </Touch>
              ))}
            </View>
          </Section>
          <Section title="Start somewhere new">
            <Cards items={c.albums} type="album" />
          </Section>
        </ScrollView>
      )}
    </Shell>
  );
}
const s = StyleSheet.create({
  search: {
    backgroundColor: t.color.text,
    minHeight: 52,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: t.color.bg,
    minHeight: 52,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 10,
  },
  clear: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { gap: 8, paddingBottom: 16 },
  filterScroll: { flexGrow: 0 },
  resultTitle: { marginBottom: 12 },
  other: { paddingTop: 20, paddingBottom: 20 },
  recent: {
    minHeight: 60,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  browse: { gap: 12, flexDirection: "row", flexWrap: "wrap" },
  tile: {
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 112,
    padding: 16,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  tileTitle: { color: t.color.text, fontWeight: "700" },
  tileIcon: { alignSelf: "flex-end", transform: [{ rotate: "15deg" }] },
});
