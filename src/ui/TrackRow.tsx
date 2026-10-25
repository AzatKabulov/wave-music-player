import { useLocale } from "../i18n/LocaleProvider";
import { AudioLines, Heart, MoreHorizontal } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useMusic } from "../data/MusicProvider";
import type { Track } from "../data/types";
import { Touch } from "../design/Motion";
import { Artwork } from "../design/Artwork";
import { IconButton, Label } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { go, ui } from "./Shell";
export function TrackRow({
  track,
  context,
  index = 0,
  subtitle = true,
}: {
  track: Track;
  context?: Track[];
  index?: number;
  subtitle?: boolean;
}) {
  const { tx } = useLocale();
  const m = useMusic(),
    active = m.track?.id === track.id,
    blocked =
      !track.available ||
      (!m.snapshot?.preferences.explicitAllowed && track.explicit),
    saved = m.snapshot?.library.tracks.includes(track.id);
  return (
    <View style={[s.row, blocked && { opacity: t.opacity.disabled }]}>
      <Touch
        accessibilityRole="button"
        accessibilityLabel={`${tx("Play")} ${track.title}${track.explicit ? " · E" : ""} ${subtitle ? (blocked ? tx("Unavailable for playback") : track.artist) : ""}`}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={() => void m.playTracks(context || [track], index)}
        style={[ui.row, ui.grow, s.play]}
      >
        <Artwork
          palette={track.palette}
          uri={track.artworkUrl}
          size={t.space[48]}
        />
        <View style={ui.grow}>
          <Label numberOfLines={1} color={active ? "accent" : "text"}>
            {track.title}
            {track.explicit ? " · E" : ""}{" "}
          </Label>
          {subtitle ? (
            <Label type="sm" color="text-muted" numberOfLines={1}>
              {blocked ? tx("Unavailable for playback") : track.artist}
            </Label>
          ) : null}
        </View>
        {active ? <AudioLines size={t.icon.sm} color={t.color.accent} /> : null}
      </Touch>
      <IconButton
        icon={Heart}
        label={tx(saved ? "Unsave {title}" : "Save {title}", {
          title: track.title,
        })}
        selected={saved}
        onPress={() => void m.save("tracks", track.id, !saved)}
      />
      <IconButton
        icon={MoreHorizontal}
        label={tx("Actions for {title}", { title: track.title })}
        onPress={() => go(`/actions/${track.id}`)}
      />
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    minHeight: t.layout.trackRow,
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[2],
  },
  play: { minHeight: t.layout.touch, paddingVertical: t.space[8] },
});
