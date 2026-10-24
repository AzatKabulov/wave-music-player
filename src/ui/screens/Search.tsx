import { Music2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { Button, Chip, Input, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

import { Cards, Section, Tracks, s } from "./common";
export function SearchScreen() {
  const m = useMusic(),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("All"),
    [category, setCategory] = useState("");
  const c = m.snapshot!.catalog;
  const q = query.trim().normalize("NFKC").toLocaleLowerCase();
  const matches = (text: string) =>
    text.normalize("NFKC").toLocaleLowerCase().includes(q);
  const tracks = c.tracks.filter(
    (x) =>
      matches(`${x.title} ${x.artist} ${x.album}`) &&
      (!category || x.genre === category),
  );
  const albums = c.albums.filter((x) => matches(`${x.title} ${x.artist}`));
  const artists = c.artists.filter((x) => matches(x.name));
  const playlists = [...c.playlists, ...m.snapshot!.playlists].filter((x) =>
    matches(x.title),
  );
  const any = tracks.length + albums.length + artists.length + playlists.length;
  return (
    <Shell title="Search" eyebrow="FOLLOW YOUR CURIOSITY">
      <View style={ui.section}>
        <Input
          label="Search music"
          placeholder="Tracks, artists, albums…"
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            setCategory("");
          }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {q || category ? (
          <>
            <View style={ui.wrap}>
              {["All", "Tracks", "Albums", "Artists", "Playlists"].map((k) => (
                <Chip
                  key={k}
                  title={k}
                  selected={k === kind}
                  onPress={() => setKind(k)}
                />
              ))}
            </View>
            {category ? (
              <Button
                title={`Clear ${category} filter`}
                variant="quiet"
                onPress={() => setCategory("")}
              />
            ) : null}
          </>
        ) : null}
      </View>
      {!q && !category ? (
        <>
          <Section title="Find your mood">
            <View style={s.browse}>
              {["Ambient", "Electronic", "Instrumental", "Jazz"].map(
                (genre, i) => (
                  <Pressable
                    key={genre}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${genre}`}
                    onPress={() => setCategory(genre)}
                    style={[
                      s.browseTile,
                      {
                        backgroundColor: [
                          t.color["art-forest"],
                          t.color["art-night"],
                          t.color["art-clay"],
                          t.color["art-berry"],
                        ][i],
                      },
                    ]}
                  >
                    <Label type="lg" style={{ color: t.color.text }}>
                      {genre}
                    </Label>
                    <Music2 size={t.icon.hero} color={t.color["art-light"]} />
                  </Pressable>
                ),
              )}
            </View>
          </Section>
          <Section title="Start somewhere new">
            <Cards items={c.albums.slice(2)} type="album" />
          </Section>
        </>
      ) : !any ? (
        <StateView
          title="No matches yet"
          message={`Try another spelling or a shorter search for “${query}”.`}
        />
      ) : (
        <>
          {kind === "All" || kind === "Tracks" ? (
            <Section title={category || "Tracks"}>
              <Tracks tracks={tracks} />
            </Section>
          ) : null}
          {(kind === "All" || kind === "Albums") && albums.length ? (
            <Section title="Albums">
              <Cards items={albums} type="album" />
            </Section>
          ) : null}
          {(kind === "All" || kind === "Artists") && artists.length ? (
            <Section title="Artists">
              {artists.map((a) => (
                <Button
                  key={a.id}
                  title={a.name}
                  variant="secondary"
                  onPress={() => go(`/artist/${a.id}`)}
                />
              ))}
            </Section>
          ) : null}
          {(kind === "All" || kind === "Playlists") && playlists.length ? (
            <Section title="Playlists">
              <Cards items={playlists} type="playlist" />
            </Section>
          ) : null}
        </>
      )}
    </Shell>
  );
}
