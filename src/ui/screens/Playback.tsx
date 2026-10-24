import { randomUUID } from "expo-crypto";
import {
  ArrowDown,
  ArrowUp,
  Heart,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import type { Playlist } from "../../data/types";
import { Artwork } from "../../design/Artwork";
import { Button, IconButton, Label, StateView } from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Seek } from "../Seek";
import { Shell, go, ui } from "../Shell";

import { formatTime, s } from "./common";
export function Player() {
  const m = useMusic(),
    track = m.track,
    w = useWindowDimensions().width;
  const size = Math.min(t.space[320], Math.max(t.space[192], w - t.space[80]));
  const saved = !!track && m.snapshot!.library.tracks.includes(track.id);
  return (
    <Shell title="Now playing" back>
      {track ? (
        <View style={s.player}>
          <Label type="xs" color="text-muted">
            A MOMENT, JUST FOR YOU
          </Label>
          <Artwork palette={track.palette} uri={track.artworkUrl} size={size} />
          <View style={[ui.row, s.playerInfo]}>
            <View style={ui.grow}>
              <Label type="xl" numberOfLines={2}>
                {track.title}
              </Label>
              <Pressable
                accessibilityRole="button"
                onPress={() => go(`/artist/${track.artistId}`)}
              >
                <Label color="text-muted">{track.artist}</Label>
              </Pressable>
            </View>
            <IconButton
              icon={Heart}
              label={saved ? "Unsave current track" : "Save current track"}
              selected={saved}
              onPress={() =>
                void m.run(() => m.data.save("tracks", track.id, !saved))
              }
            />
          </View>
          <View style={s.fullWidth}>
            <Seek
              value={m.status.currentTime}
              max={m.status.duration || track.durationMs / 1000}
              onChange={m.seek}
            />
            <View style={ui.h}>
              <Label type="xs" color="text-muted">
                {formatTime(m.status.currentTime)}
              </Label>
              <Label type="xs" color="text-muted">
                {formatTime(m.status.duration || track.durationMs / 1000)}
              </Label>
            </View>
          </View>
          <View style={[ui.row, s.transport]}>
            <IconButton
              icon={Shuffle}
              label={m.queue.shuffle ? "Disable shuffle" : "Enable shuffle"}
              selected={m.queue.shuffle}
              onPress={() => void m.shuffle()}
            />
            <IconButton
              icon={SkipBack}
              label="Previous track"
              onPress={m.previous}
            />
            <Button
              title={m.status.playing ? "Pause" : "Play"}
              icon={m.status.playing ? Pause : Play}
              onPress={m.toggle}
            />
            <IconButton
              icon={SkipForward}
              label="Next track"
              onPress={m.next}
            />
            <IconButton
              icon={Repeat}
              label={`Repeat: ${m.queue.repeat}`}
              selected={m.queue.repeat !== "none"}
              onPress={() => void m.repeat()}
            />
          </View>
          <View style={[ui.h, s.fullWidth]}>
            <Button
              title="Queue"
              icon={ListMusic}
              variant="quiet"
              onPress={() => go("/queue")}
            />
            <IconButton
              icon={MoreHorizontal}
              label={`Actions for ${track.title}`}
              onPress={() => go(`/actions/${track.id}`)}
            />
          </View>
          <Label type="xs" color="text-muted">
            {m.status.isBuffering
              ? "Loading audio…"
              : m.status.playing
                ? "Playing"
                : "Paused"}{" "}
            ·{" "}
            {m.queue.repeat === "single"
              ? "Repeat one"
              : m.queue.repeat === "all"
                ? "Repeat all"
                : "Repeat off"}
          </Label>
        </View>
      ) : (
        <StateView
          title="Choose your first track"
          message="Start a track from Home, Search, or your library."
          action="Find music"
          onAction={() => go("/search")}
        />
      )}
    </Shell>
  );
}
export function QueueScreen() {
  const m = useMusic(),
    tracks = m.snapshot!.catalog.tracks;
  return (
    <Shell title="Your queue" back>
      <View style={ui.section}>
        <View style={ui.h}>
          <Label type="xl">Up next</Label>
          <Button
            title="Clear requests"
            variant="quiet"
            disabled={m.pending}
            onPress={() => void m.clearExplicit()}
          />
        </View>
        <Label color="text-muted">
          Move tracks with the arrows. Each entry has its own place.
        </Label>
      </View>
      {m.queue.entries.length ? (
        m.queue.entries.map((entry, i) => {
          const track = tracks.find((t) => t.id === entry.trackId);
          return track ? (
            <View key={entry.id} style={[ui.card, s.queueEntry]}>
              <View style={ui.row}>
                <Artwork palette={track.palette} size={t.space[48]} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => m.jumpQueue(entry.id)}
                  style={ui.grow}
                >
                  <Label>{track.title}</Label>
                  <Label type="sm" color="text-muted">
                    {m.activeEntry?.id === entry.id
                      ? "Playing now"
                      : entry.origin === "explicit"
                        ? "Your request"
                        : track.artist}
                  </Label>
                </Pressable>
              </View>
              <View style={ui.wrap}>
                <IconButton
                  icon={ArrowUp}
                  label={`Move ${track.title} up`}
                  disabled={i === 0 || m.pending}
                  onPress={() => void m.moveQueue(entry.id, -1)}
                />
                <IconButton
                  icon={ArrowDown}
                  label={`Move ${track.title} down`}
                  disabled={i === m.queue.entries.length - 1 || m.pending}
                  onPress={() => void m.moveQueue(entry.id, 1)}
                />
                <IconButton
                  icon={Trash2}
                  label={`Remove queue entry ${i + 1}`}
                  disabled={entry.id === m.activeEntry?.id || m.pending}
                  onPress={() => void m.removeQueue(entry.id)}
                />
              </View>
            </View>
          ) : null;
        })
      ) : (
        <StateView
          title="A clear queue"
          message="Pick a track to start, or add something to play next."
        />
      )}
    </Shell>
  );
}
export function Actions({
  id,
  picker = false,
}: {
  id: string;
  picker?: boolean;
}) {
  const m = useMusic(),
    track = m.snapshot!.catalog.tracks.find((t) => t.id === id);
  if (!track)
    return (
      <Shell title="Track" back>
        <StateView
          title="Track unavailable"
          message="Try another track from the catalog."
        />
      </Shell>
    );
  const add = async (p: Playlist) => {
    const saved = await m.run(
      () =>
        m.data.editPlaylist(p.id, p.revision, p.title, p.description, [
          ...p.items,
          { id: randomUUID(), trackId: id },
        ]),
      `Added to ${p.title}`,
    );
    if (saved) go(`/playlist/${p.id}`);
  };
  return (
    <Shell title={picker ? "Choose a playlist" : "Track options"} back>
      <View style={[ui.row, ui.section]}>
        <Artwork
          palette={track.palette}
          uri={track.artworkUrl}
          size={t.space[80]}
        />
        <View style={ui.grow}>
          <Label type="xl">{track.title}</Label>
          <Label color="text-muted">{track.artist}</Label>
        </View>
      </View>
      {picker ? (
        <View style={ui.form}>
          <Button
            title="Create a playlist"
            icon={Plus}
            onPress={() => go(`/create?track=${id}`)}
          />
          {m.snapshot!.playlists.map((p) => (
            <Button
              key={p.id}
              title={`${p.title}${p.items.some((i) => i.trackId === id) ? " · add another copy" : ""}`}
              variant="secondary"
              disabled={m.pending}
              onPress={() => void add(p)}
            />
          ))}
          {!m.snapshot!.playlists.length ? (
            <Label color="text-muted">Your playlists will appear here.</Label>
          ) : null}
        </View>
      ) : (
        <View style={ui.form}>
          <Button
            title="Add to playlist"
            icon={Plus}
            variant="secondary"
            onPress={() => go(`/add/${id}`)}
          />
          <Button
            title="Play next"
            icon={ListMusic}
            disabled={m.pending}
            variant="secondary"
            onPress={() => {
              void m.enqueue(track).then((ok) => {
                if (ok) m.setNotice("Added to your queue");
              });
            }}
          />
          <Button
            title={`Artist · ${track.artist}`}
            variant="quiet"
            onPress={() => go(`/artist/${track.artistId}`)}
          />
          <Button
            title={`Album · ${track.album}`}
            variant="quiet"
            onPress={() => go(`/album/${track.albumId}`)}
          />
        </View>
      )}
    </Shell>
  );
}
