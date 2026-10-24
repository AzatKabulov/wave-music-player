import { StyleSheet, View, type ViewStyle } from "react-native";
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
  palette = "clay",
  size = t.space[160],
  round,
  style,
}: {
  palette?: string;
  size?: number;
  round?: boolean;
  style?: ViewStyle;
}) {
  const color =
    t.color[
      `art-${palettes.includes(palette as Palette) ? (palette as Palette) : "clay"}`
    ];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: round ? t.radius.pill : t.radius.sm,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.band,
          {
            width: size * t.ratio.arch,
            height: size,
            transform: [{ rotate: "30deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.disc,
          { width: size * t.ratio.outerDisc, height: size * t.ratio.outerDisc },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: size * t.ratio.innerDisc,
              height: size * t.ratio.innerDisc,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { width: size * t.ratio.label, height: size * t.ratio.label },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  band: {
    position: "absolute",
    backgroundColor: t.color["art-light"],
    opacity: t.opacity.art,
    left: t.space[0],
  },
  disc: {
    borderRadius: t.radius.pill,
    backgroundColor: t.color["art-ink"],
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    borderRadius: t.radius.pill,
    borderWidth: t.layout.borderWidth,
    borderColor: t.color["art-light"],
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { borderRadius: t.radius.pill, backgroundColor: t.color["art-light"] },
});
