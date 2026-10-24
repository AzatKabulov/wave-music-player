import { theme as t } from "../design/theme";
import { useEffect, useState } from "react";
export function Seek({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  // Keep rapid keyboard/pointer changes responsive between engine status ticks.
  const [draft, setDraft] = useState<number | null>(null);
  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => setDraft(null), 750);
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <input
      aria-label="Playback position"
      type="range"
      min={0}
      max={Math.max(1, max)}
      step={0.1}
      value={Math.min(draft ?? value, max)}
      onChange={(e) => {
        const next = Number(e.target.value);
        setDraft(next);
        onChange(next);
      }}
      style={{
        width: "100%",
        minHeight: t.layout.touch,
        accentColor: t.color.accent,
        margin: 0,
        cursor: "pointer",
      }}
    />
  );
}
