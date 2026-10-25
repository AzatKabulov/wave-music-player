import React from "react";
import { FlatList, View } from "react-native";
import type { Track } from "../data/types";
import { StateView } from "../design/Primitives";
import { go } from "./Shell";
import { TrackRow } from "./TrackRow";

export function MusicList({
  tracks,
  header,
  footer,
  emptyTitle = "Your next listen starts here",
  emptyMessage = "Find a track you like, then bring it here.",
}: {
  tracks: Track[];
  header?: React.ReactElement;
  footer?: React.ReactElement;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  return (
    <FlatList
      data={tracks}
      keyExtractor={(track, index) => `${track.id}:${index}`}
      renderItem={({ item, index }) => (
        <TrackRow track={item} context={tracks} index={index} />
      )}
      ListHeaderComponent={header}
      ListFooterComponent={
        footer ? <View style={{ paddingTop: 24 }}>{footer}</View> : undefined
      }
      ListEmptyComponent={
        <StateView
          title={emptyTitle}
          message={emptyMessage}
          action="Find music"
          onAction={() => go("/search")}
        />
      }
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      windowSize={7}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
