import React from "react";
import { FlatList, View } from "react-native";
import type { Track } from "../data/types";
import { Label, StateView } from "../design/Primitives";
import { useLocale } from "../i18n/LocaleProvider";
import { go } from "./Shell";
import { TrackRow } from "./TrackRow";

export function MusicList({
  tracks,
  header,
  footer,
  albumRows = false,
  onScrollOffset,
  emptyTitle = "Your next listen starts here",
  emptyMessage = "Find a track you like, then bring it here.",
}: {
  tracks: Track[];
  header?: React.ReactElement;
  footer?: React.ReactElement;
  albumRows?: boolean;
  onScrollOffset?: (offset: number) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const { tx } = useLocale();
  const discs =
    albumRows && new Set(tracks.map((track) => track.discNumber || 1)).size > 1;
  return (
    <FlatList
      data={tracks}
      keyExtractor={(track, index) => `${track.id}:${index}`}
      renderItem={({ item, index }) => (
        <View>
          {discs &&
          (index === 0 || item.discNumber !== tracks[index - 1].discNumber) ? (
            <Label
              type="lg"
              accessibilityRole="header"
              style={{ paddingTop: 24, paddingBottom: 8 }}
            >
              {tx("Disc {number}", { number: item.discNumber || 1 })}
            </Label>
          ) : null}
          <TrackRow
            track={item}
            context={tracks}
            index={index}
            numbered={albumRows}
          />
        </View>
      )}
      onScroll={
        onScrollOffset
          ? (event) => onScrollOffset(event.nativeEvent.contentOffset.y)
          : undefined
      }
      scrollEventThrottle={64}
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
