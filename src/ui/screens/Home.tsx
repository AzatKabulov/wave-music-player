import { ArrowRight, Headphones, Heart } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { Artwork } from "../../design/Artwork";
import { Chip, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

import { Cards, Section, Tracks, s } from "./common";
export function Home() {
  const m = useMusic(),
    c = m.snapshot!.catalog,
    [filter, setFilter] = useState("For you"),
    wide = useWindowDimensions().width >= t.space[640],
    featured =
      c.playlists.find((p) => p.title === "The long way home") ||
      c.playlists[0];
  if (!c.tracks.length)
    return (
      <Shell title="Keep your own rhythm">
        <StateView
          title="The music is on its way"
          message="No releases are available yet. Check back soon."
          action="Refresh"
          onAction={() => void m.run(m.refresh)}
        />
      </Shell>
    );
  return (
    <Shell
      title="Keep your own rhythm"
      eyebrow="OWARYN / YOUR EVERYDAY LISTENING"
    >
      <View style={[ui.wrap, s.filters]}>
        {["For you", "Instrumental", "Electronic", "Ambient"].map((f) => (
          <Chip
            key={f}
            title={f}
            selected={f === filter}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>
      {filter === "For you" ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              go(featured ? `/playlist/${featured.id}` : "/search")
            }
            style={s.hero}
          >
            <View style={s.heroCopy}>
              <Label type="xs" style={s.heroEyebrow}>
                THE DAILY SELECTION
              </Label>
              <Label type="display" style={s.heroTitle}>
                {featured?.title === "The long way home" ? (
                  <>Take the{"\n"}long way home.</>
                ) : (
                  featured?.title || "Make room for music."
                )}
              </Label>
              <Label style={s.heroDescription}>
                A little less rush.{"\n"}A little more music.
              </Label>
              <View style={s.heroLink}>
                <Label style={s.heroTitle}>Explore the mix</Label>
                <ArrowRight size={t.icon.sm} color={t.color["art-light"]} />
              </View>
            </View>
            {wide ? (
              <Artwork palette="clay" size={t.space[192]} style={s.heroArt} />
            ) : null}
          </Pressable>
          <View style={s.shortcuts}>
            {c.playlists.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${p.title}`}
                onPress={() => go(`/playlist/${p.id}`)}
                style={s.shortcut}
              >
                <Artwork palette={p.palette} size={t.space[56]} />
                <Label type="sm" numberOfLines={2} style={ui.grow}>
                  {p.title}
                </Label>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Your liked tracks"
              onPress={() => go("/liked")}
              style={s.shortcut}
            >
              <View style={s.heartTile}>
                <Heart size={t.icon.base} color={t.color.accent} />
              </View>
              <Label type="sm">Your liked tracks</Label>
            </Pressable>
          </View>
          <Section
            title="Something worth hearing"
            kicker="RELEASES TO SPEND TIME WITH"
            action={() => go("/search")}
          >
            <Cards items={c.albums} type="album" />
          </Section>
          <Section title="For the way today feels">
            <Cards items={c.playlists} type="playlist" />
          </Section>
          <Section title="Find another favourite">
            <ScrollView horizontal contentContainerStyle={s.cards}>
              {c.artists.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${a.name}`}
                  onPress={() => go(`/artist/${a.id}`)}
                  style={s.artistCard}
                >
                  <Artwork palette={a.palette} size={t.space[112]} round />
                  <Label type="sm" numberOfLines={2} style={s.center}>
                    {a.name}
                  </Label>
                </Pressable>
              ))}
            </ScrollView>
          </Section>
          <View style={s.footnote}>
            <Headphones size={t.icon.sm} color={t.color["text-muted"]} />
            <Label type="xs" color="text-muted">
              An independent listening space. Original demo recordings.
            </Label>
          </View>
        </>
      ) : (
        <Section title={filter}>
          <Tracks tracks={c.tracks.filter((x) => x.genre === filter)} />
        </Section>
      )}
    </Shell>
  );
}
