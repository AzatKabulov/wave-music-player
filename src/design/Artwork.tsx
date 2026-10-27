import { useState } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { ListMusic, Music2, UserRound } from "lucide-react-native";
import { sizedArtwork } from "../data/artworkSource";
import { useMotion } from "./Motion";
import { theme as t } from "./theme";
export const palettes = [
  "clay",
  "sea",
  "night",
  "sand",
  "berry",
  "forest",
] as const;
export type Palette = (typeof palettes)[number];
export function Artwork({
  size = t.space[160],
  round,
  style,
  uri,
  kind,
}: {
  palette?: string;
  size?: number;
  round?: boolean;
  style?: ViewStyle;
  uri?: string;
  kind?: "album" | "playlist" | "artist";
}) {
  const { reduced } = useMotion();
  const { scale } = useWindowDimensions();
  const source = sizedArtwork(uri, size, scale);
  const [failedUri, setFailedUri] = useState<string>();
  const Glyph =
    round || kind === "artist"
      ? UserRound
      : kind === "playlist"
        ? ListMusic
        : Music2;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.frame,
        {
          width: size,
          height: size,
          borderRadius: round ? t.radius.pill : t.radius.sm,
        },
        style,
      ]}
    >
      {uri && failedUri !== uri ? (
        <Image
          source={{ uri: source }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={source}
          transition={reduced ? 0 : 120}
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailedUri(uri)}
          accessible={false}
          accessibilityLabel=""
          draggable={false}
        />
      ) : (
        <Glyph
          size={Math.max(18, Math.min(64, size * 0.26))}
          color={t.color["text-muted"]}
          strokeWidth={1.3}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: t.color["surface-raised"],
  },
});
