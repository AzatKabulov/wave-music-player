import { useLocale } from "../i18n/LocaleProvider";
import {
  AudioLines,
  CheckCircle2,
  CirclePlus,
  MoreHorizontal,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { useMusic } from "../data/MusicProvider";
import type { Track, PlaybackSource } from "../data/types";
import { Touch } from "../design/Motion";
import { Artwork } from "../design/Artwork";
import { IconButton, Label } from "../design/Primitives";
import { theme as t } from "../design/theme";
import { go, ui } from "./Shell";
export function TrackRow({
  track,
  context,
  source,
  index = 0,
  subtitle = true,
  numbered = false,
}: {
  track: Track;
  context?: Track[];
  source?: PlaybackSource | null;
  index?: number;
  subtitle?: boolean;
  numbered?: boolean;
}) {
  const m = useMusic();
  const { playTracks, save } = m;
  const saved = !!m.snapshot?.library.tracks.includes(track.id);
  // Context can grow after detail/search hydration. Keep event handlers current
  // without passing the whole mutable collection through the visual row.
  const selection = useRef({ track, context, source, index, playTracks });
  useLayoutEffect(() => {
    selection.current = { track, context, source, index, playTracks };
  }, [track, context, source, index, playTracks]);
  const onPlay = useCallback(() => {
    const current = selection.current;
    void current.playTracks(
      current.context || [current.track],
      current.index,
      false,
      current.source,
    );
  }, []);
  const onSave = useCallback(
    () => void save("tracks", track.id, !saved),
    [save, track.id, saved],
  );
  return (
    <TrackRowView
      track={track}
      index={index}
      subtitle={subtitle}
      numbered={numbered}
      active={m.track?.id === track.id}
      blocked={
        !track.available ||
        (!m.snapshot?.preferences.explicitAllowed && track.explicit)
      }
      saved={saved}
      onPlay={onPlay}
      onSave={onSave}
    />
  );
}
const TrackRowView = memo(function TrackRowView({
  track,
  index,
  subtitle,
  numbered,
  active,
  blocked,
  saved,
  onPlay,
  onSave,
}: {
  track: Track;
  index: number;
  subtitle: boolean;
  numbered: boolean;
  active: boolean;
  blocked: boolean;
  saved: boolean;
  onPlay: () => void;
  onSave: () => void;
}) {
  const { tx } = useLocale();
  return (
    <View style={[s.row, blocked && { opacity: t.opacity.disabled }]}>
      {numbered ? (
        <View
          style={s.number}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {active ? (
            <AudioLines size={t.icon.sm} color={t.color.accent} />
          ) : (
            <Label color="text-muted">{track.trackNumber || index + 1}</Label>
          )}
        </View>
      ) : null}
      <Touch
        accessibilityRole="button"
        accessibilityLabel={`${tx("Play")} ${track.title}${track.explicit ? " · E" : ""} ${subtitle ? (blocked ? tx("Unavailable for playback") : track.artist) : ""}`}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={onPlay}
        style={[ui.row, ui.grow, s.play]}
      >
        {!numbered ? (
          <Artwork
            palette={track.palette}
            uri={track.artworkUrl}
            size={t.space[48]}
          />
        ) : null}
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
        {active && !numbered ? (
          <AudioLines size={t.icon.sm} color={t.color.accent} />
        ) : null}
      </Touch>
      <IconButton
        icon={saved ? CheckCircle2 : CirclePlus}
        label={tx(saved ? "Unsave {title}" : "Save {title}", {
          title: track.title,
        })}
        selected={saved}
        onPress={onSave}
      />
      <IconButton
        icon={MoreHorizontal}
        label={tx("Actions for {title}", { title: track.title })}
        onPress={() => go(`/actions/${track.id}`)}
      />
    </View>
  );
});
const s = StyleSheet.create({
  number: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  row: {
    minHeight: t.layout.trackRow,
    flexDirection: "row",
    alignItems: "center",
    gap: t.space[2],
  },
  play: { minHeight: t.layout.touch, paddingVertical: t.space[8] },
});
