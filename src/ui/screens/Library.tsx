import { ArrowRight, Heart, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import {
  Button,
  Chip,
  IconButton,
  Label,
  StateView,
} from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

import { Cards, Section, s } from "./common";
export function LibraryScreen() {
  const m = useMusic(),
    sn = m.snapshot!,
    [filter, setFilter] = useState("All"),
    [sort, setSort] = useState<"recent" | "title" | "creator">(
      sn.preferences.librarySort,
    );
  const sortItems = <
    T extends { title?: string; name?: string; artist?: string },
  >(
    items: T[],
  ) =>
    sort === "recent"
      ? items
      : [...items].sort((a, b) =>
          (sort === "creator"
            ? a.artist || a.name || ""
            : a.title || a.name || ""
          ).localeCompare(
            sort === "creator"
              ? b.artist || b.name || ""
              : b.title || b.name || "",
          ),
        );
  const playlists = sortItems([
    ...sn.playlists,
    ...sn.catalog.playlists.filter((p) => sn.library.playlists.includes(p.id)),
  ]);
  return (
    <Shell title="Your library" eyebrow="KEEP WHAT MOVES YOU">
      <View style={ui.section}>
        <View style={ui.h}>
          <Label color="text-muted">A collection that sounds like you.</Label>
          <IconButton
            icon={Plus}
            label="Create playlist"
            onPress={() => go("/create")}
          />
        </View>
        <View style={ui.wrap}>
          {["All", "Playlists", "Albums", "Artists"].map((x) => (
            <Chip
              key={x}
              title={x}
              selected={filter === x}
              onPress={() => setFilter(x)}
            />
          ))}
        </View>
        <View style={ui.wrap}>
          <Label type="sm" color="text-muted">
            Sort:
          </Label>
          {(["recent", "title", "creator"] as const).map((x) => (
            <Button
              key={x}
              title={x}
              variant={sort === x ? "secondary" : "quiet"}
              onPress={() => setSort(x)}
            />
          ))}
        </View>
      </View>
      {filter === "All" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open liked tracks"
          onPress={() => go("/liked")}
          style={[ui.card, ui.row, s.liked]}
        >
          <Heart size={t.icon.lg} color={t.color.accent} />
          <View style={ui.grow}>
            <Label type="lg">Liked tracks</Label>
            <Label color="text-muted" type="sm">
              {sn.library.tracks.length} tracks kept close
            </Label>
          </View>
          <ArrowRight color={t.color.text} size={t.icon.sm} />
        </Pressable>
      ) : null}
      {filter === "All" || filter === "Playlists" ? (
        <Section title="Playlists">
          {playlists.length ? (
            <Cards items={playlists} type="playlist" />
          ) : (
            <StateView
              title="Make room for your favourites"
              message="Create a playlist for a place, a person, or a feeling."
              action="Create a playlist"
              onAction={() => go("/create")}
            />
          )}
        </Section>
      ) : null}
      {filter === "All" || filter === "Albums" ? (
        <Section title="Saved albums">
          {sn.library.albums.length ? (
            <Cards
              items={sortItems(
                sn.catalog.albums.filter((a) =>
                  sn.library.albums.includes(a.id),
                ),
              )}
              type="album"
            />
          ) : (
            <Label color="text-muted">
              Save an album from its release page.
            </Label>
          )}
        </Section>
      ) : null}
      {filter === "All" || filter === "Artists" ? (
        <Section title="Following">
          {sn.catalog.artists
            .filter((a) => sn.library.artists.includes(a.id))
            .map((a) => (
              <Button
                key={a.id}
                title={a.name}
                variant="secondary"
                onPress={() => go(`/artist/${a.id}`)}
              />
            ))}
          {!sn.library.artists.length ? (
            <Label color="text-muted">
              Follow an artist to keep them here.
            </Label>
          ) : null}
        </Section>
      ) : null}
    </Shell>
  );
}
