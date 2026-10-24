import type { TextStyle } from "react-native";
import raw from "./tokens.json";

export const theme = {
  color: raw.color,
  space: Object.fromEntries(raw.space.map((value) => [value, value])) as Record<
    number,
    number
  >,
  radius: raw.radius,
  layout: raw.layout,
  opacity: { disabled: 0.45, art: 0.18, veil: 0.8 },
  ratio: {
    square: 1,
    outerDisc: 0.78,
    innerDisc: 0.52,
    label: 0.16,
    arch: 0.6,
  },
  icon: { sm: 18, base: 22, lg: 28, hero: 40 },
  stroke: 1.7,
  type: Object.fromEntries(
    Object.entries(raw.type).map(([key, value]) => [
      key,
      {
        fontSize: value.size,
        lineHeight: value.line,
        fontWeight: String(value.weight) as TextStyle["fontWeight"],
      },
    ]),
  ) as Record<keyof typeof raw.type, TextStyle>,
} as const;
export type ColorRole = keyof typeof theme.color;
export type TypeRole = keyof typeof theme.type;
