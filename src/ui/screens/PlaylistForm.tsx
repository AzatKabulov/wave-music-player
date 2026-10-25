import { randomUUID } from "expo-crypto";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useMusic } from "../../data/MusicProvider";
import { moveEntry } from "../../data/queue";
import { Artwork } from "../../design/Artwork";
import {
  Button,
  IconButton,
  Input,
  Label,
  StateView,
} from "../../design/Primitives";
import { theme as t } from "../../design/theme";
import { Shell, go, ui } from "../Shell";

export function PlaylistForm({
  id,
  trackId,
}: {
  id?: string;
  trackId?: string;
}) {
  const m = useMusic(),
    p = m.snapshot!.playlists.find((p) => p.id === id),
    [title, setTitle] = useState(p?.title || ""),
    [description, setDescription] = useState(p?.description || ""),
    [items, setItems] = useState(p?.items || []),
    [validation, setValidation] = useState(""),
    [confirm, setConfirm] = useState(false),
    [key] = useState(randomUUID);
  const save = async () => {
    if (!title.trim()) {
      setValidation("Start with a name for your playlist.");
      return;
    }
    const value = await m.run(async () => {
      if (p)
        return m.data.editPlaylist(
          p.id,
          p.revision,
          title.trim(),
          description,
          items,
        );
      const created = await m.data.createPlaylist(
        title.trim(),
        description,
        key,
      );
      if (trackId)
        return m.data.editPlaylist(
          created.id,
          created.revision,
          created.title,
          created.description,
          [{ id: randomUUID(), trackId }],
        );
      return created;
    }, "Playlist changes saved.");
    if (value) go(`/playlist/${value.id}`);
  };
  if (id && !p)
    return (
      <Shell title="Edit playlist" back>
        <StateView
          title="You cannot edit this playlist"
          message="Only its owner can make changes."
        />
      </Shell>
    );
  return (
    <Shell title={p ? "Edit playlist" : "Create a playlist"} back>
      <View style={ui.form}>
        <Artwork palette={p?.palette || "sea"} size={t.space[128]} />
        <Input
          i18n
          label="Playlist name"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setValidation("");
          }}
          maxLength={160}
          error={validation}
          placeholder="Name your next listening moment"
        />
        <Input
          i18n
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          multiline
        />
        <Button
          i18n
          title="Save playlist"
          busy={m.pending}
          onPress={() => void save()}
        />
        {p ? (
          <>
            <Label i18n type="lg">
              Track order
            </Label>
            {items.map((item, i) => {
              const track = m.snapshot!.catalog.tracks.find(
                (t) => t.id === item.trackId,
              );
              return (
                <View key={item.id} style={ui.card}>
                  <Label>
                    {i + 1}. {track?.title || "Unavailable track"}
                  </Label>
                  <View style={ui.wrap}>
                    <IconButton
                      icon={ArrowUp}
                      label={`Move item ${i + 1} up`}
                      disabled={i === 0}
                      onPress={() => setItems(moveEntry(items, item.id, -1))}
                    />
                    <IconButton
                      icon={ArrowDown}
                      label={`Move item ${i + 1} down`}
                      disabled={i === items.length - 1}
                      onPress={() => setItems(moveEntry(items, item.id, 1))}
                    />
                    <IconButton
                      icon={Trash2}
                      label={`Remove item ${i + 1}`}
                      onPress={() =>
                        setItems(items.filter((x) => x.id !== item.id))
                      }
                    />
                  </View>
                </View>
              );
            })}
            {!items.length ? (
              <Label i18n color="text-muted">
                This playlist is empty. Add music from track options.
              </Label>
            ) : null}
            {confirm ? (
              <View style={ui.card}>
                <Label>Delete “{p.title}” and its track list?</Label>
                <Button
                  i18n
                  title="Delete this playlist"
                  variant="danger"
                  busy={m.pending}
                  onPress={() =>
                    void m
                      .run(async () => {
                        await m.data.deletePlaylist(p.id, p.revision);
                        return true;
                      })
                      .then((ok) => {
                        if (ok) go("/library");
                      })
                  }
                />
                <Button
                  i18n
                  title="Keep playlist"
                  variant="quiet"
                  onPress={() => setConfirm(false)}
                />
              </View>
            ) : (
              <Button
                i18n
                title="Delete playlist"
                variant="danger"
                onPress={() => setConfirm(true)}
              />
            )}
          </>
        ) : null}
      </View>
    </Shell>
  );
}
