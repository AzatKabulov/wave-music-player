import { useLocale } from "../i18n/LocaleProvider";
import Slider from "@react-native-community/slider";
import { useState } from "react";
import { theme as t } from "../design/theme";
export function Seek({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(value);
  const { tx } = useLocale();
  return (
    <Slider
      accessibilityLabel={tx("Playback position")}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: Math.floor(max),
        now: Math.floor(dragging ? draft : value),
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        onChange(
          Math.min(
            max,
            Math.max(
              0,
              value + (event.nativeEvent.actionName === "increment" ? 5 : -5),
            ),
          ),
        )
      }
      minimumValue={0}
      maximumValue={Math.max(1, max)}
      value={dragging ? draft : Math.min(value, max)}
      step={0.1}
      minimumTrackTintColor={t.color.text}
      maximumTrackTintColor={t.color.border}
      thumbTintColor={t.color.text}
      onSlidingStart={() => {
        setDraft(value);
        setDragging(true);
      }}
      onValueChange={setDraft}
      onSlidingComplete={(next) => {
        setDragging(false);
        onChange(next);
      }}
      style={{ width: "100%", height: 40 }}
    />
  );
}
