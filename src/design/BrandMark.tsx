import Svg, { Path } from "react-native-svg";
import { View } from "react-native";
import { theme as t } from "./theme";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          fill={t.color.accent}
          d="M4 3H15L21 9L18 12L13 7H4Z M21 9V15L15 21H9L3 15V10H7V13L11 17H13L17 13V9Z"
        />
      </Svg>
    </View>
  );
}
