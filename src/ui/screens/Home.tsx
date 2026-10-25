import { Heart, Play } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Touch } from "../../design/Motion";
import { Chip, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";
import { Cards, Section, Tracks } from "./common";

export function Home() {
  const m = useMusic();
  const c = m.snapshot!.catalog;
  const [filter, setFilter] = useState("All");
  const genres = [
    ...new Set(c.tracks.map((track) => track.genre).filter(Boolean)),
  ].slice(0, 5);
  const recent = m
    .snapshot!.recents.map((id) => c.tracks.find((track) => track.id === id))
    .filter((track) => !!track)
    .slice(0, 6);
  if (!c.tracks.length)
    return (
      <Shell title="Home">
        <StateView
          title="The music is on its way"
          message="No releases are available yet. Check back soon."
          action="Refresh"
          onAction={() => void m.run(m.refresh)}
        />
      </Shell>
    );
  return (
    <Shell title="Home">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {["All", ...genres].map((genre) => (
          <Chip
            key={genre}
            title={genre}
            selected={filter === genre}
            onPress={() => setFilter(genre)}
          />
        ))}
      </ScrollView>
      {filter !== "All" ? (
        <Section title={filter}>
          <Tracks tracks={c.tracks.filter((track) => track.genre === filter)} />
        </Section>
      ) : (
        <>
          <View style={s.shortcuts}>
            <Touch
              labelIsUI
              accessibilityRole="button"
              accessibilityLabel="Liked Songs"
              onPress={() => go("/liked")}
              style={s.shortcut}
            >
              <View style={s.likedArt}>
                <Heart size={23} color={t.color.text} fill={t.color.text} />
              </View>
              <Label i18n type="sm" numberOfLines={2} style={s.shortcutTitle}>
                Liked Songs
              </Label>
            </Touch>
            {[...m.snapshot!.playlists, ...c.playlists].slice(0, 5).map((p) => (
              <Touch
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${p.title}`}
                onPress={() => go(`/playlist/${p.id}`)}
                style={s.shortcut}
              >
                <Artwork uri={p.artworkUrl} palette={p.palette} size={56} />
                <Label type="sm" numberOfLines={2} style={s.shortcutTitle}>
                  {p.title}
                </Label>
              </Touch>
            ))}
          </View>
          {recent.length ? (
            <Section title="Recently played">
              <View style={ui.list}>
                {recent.slice(0, 3).map((track) => (
                  <Touch
                    key={track.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title} ${track.artist}`}
                    onPress={() =>
                      void m.playTracks(recent, recent.indexOf(track))
                    }
                    style={s.recent}
                  >
                    <Artwork
                      uri={track.artworkUrl}
                      palette={track.palette}
                      size={48}
                    />
                    <View style={ui.grow}>
                      <Label numberOfLines={1} style={s.bold}>
                        {track.title}{" "}
                      </Label>
                      <Label type="sm" color="text-muted" numberOfLines={1}>
                        {track.artist}
                      </Label>
                    </View>
                    <Play color={t.color.text} size={20} />
                  </Touch>
                ))}
              </View>
            </Section>
          ) : null}
          <Section
            title="Made for your next listen"
            action={() => go("/search")}
          >
            <Cards items={c.playlists} type="playlist" />
          </Section>
          <Section title="Albums to explore" action={() => go("/search")}>
            <Cards
              items={[...c.albums].sort(
                (a, b) => Number(!!b.artworkUrl) - Number(!!a.artworkUrl),
              )}
              type="album"
            />
          </Section>
          <Section title="Discover artists">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.artists}
            >
              {c.artists.map((artist) => (
                <Touch
                  key={artist.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${artist.name}`}
                  onPress={() => go(`/artist/${artist.id}`)}
                  style={s.artist}
                >
                  <Artwork palette={artist.palette} size={136} round />
                  <Label numberOfLines={2} style={[s.bold, s.center]}>
                    {artist.name}
                  </Label>
                  <Label i18n type="sm" color="text-muted">
                    Artist
                  </Label>
                </Touch>
              ))}
            </ScrollView>
          </Section>
        </>
      )}
    </Shell>
  );
}
const s = StyleSheet.create({
  filters: { gap: 8, paddingBottom: 20 },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 28,
  },
  shortcut: {
    width: "48%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    backgroundColor: t.color["surface-raised"],
    borderRadius: 5,
  },
  shortcutTitle: { fontWeight: "600", flex: 1, paddingRight: 8 },
  likedArt: {
    height: 56,
    width: 56,
    backgroundColor: t.color["art-berry"],
    alignItems: "center",
    justifyContent: "center",
  },
  recent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
  },
  artists: { gap: 16 },
  artist: { width: 144, alignItems: "center", gap: 8 },
  bold: { fontWeight: "600" },
  center: { textAlign: "center" },
});
