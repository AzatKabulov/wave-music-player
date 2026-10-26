import { useLocale } from "../i18n/LocaleProvider";
import { theme as t } from "../design/theme";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatTime } from "./screens/common";

export function Seek({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  playing?: boolean;
}) {
  const { tx } = useLocale();
  const [draft, setDraft] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{
    value: number;
    from: number;
  } | null>(null);
  const interacting = useRef(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), 1500);
    return () => clearTimeout(timer);
  }, [pending]);
  const acknowledged =
    !!pending &&
    Math.abs(value - pending.value) < 1.2 &&
    (Math.abs(value - pending.from) > 0.05 ||
      Math.abs(pending.value - pending.from) < 0.05);
  const current = Math.max(
    0,
    Math.min(
      max,
      dragging
        ? (draft ?? value)
        : pending && !acknowledged
          ? pending.value
          : value,
    ),
  );
  const commit = (next: number) => {
    interacting.current = false;
    setDragging(false);
    setDraft(null);
    setPending({ value: next, from: value });
    onChange(next);
  };
  const style: CSSProperties & { "--seek-progress": string } = {
    width: "100%",
    minHeight: t.layout.touch,
    margin: 0,
    cursor: "pointer",
    background: "transparent",
    "--seek-progress": `${max ? (current / max) * 100 : 0}%`,
  };
  return (
    <div>
      <style>{`.musify-seek{appearance:none;-webkit-appearance:none;outline-offset:3px}.musify-seek::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(to right,${t.color.text} var(--seek-progress),${t.color.border} var(--seek-progress))}.musify-seek::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-4px;border-radius:50%;background:${t.color.text};transition:transform 100ms ease-out}.musify-seek:active::-webkit-slider-thumb{transform:scale(1.5)}.musify-seek::-moz-range-track{height:4px;border-radius:2px;background:${t.color.border}}.musify-seek::-moz-range-progress{height:4px;background:${t.color.text}}.musify-seek::-moz-range-thumb{border:0;width:12px;height:12px;border-radius:50%;background:${t.color.text}}.musify-seek:focus-visible{outline:2px solid ${t.color.focus}}@media(prefers-reduced-motion:reduce){.musify-seek::-webkit-slider-thumb{transition:none}.musify-seek:active::-webkit-slider-thumb{transform:none}}`}</style>
      <input
        className="musify-seek"
        aria-label={tx("Playback position")}
        aria-valuetext={formatTime(current)}
        type="range"
        min={0}
        max={Math.max(1, max)}
        step={0.1}
        value={current}
        style={style}
        onPointerDown={(event) => {
          interacting.current = true;
          setDraft(Number(event.currentTarget.value));
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (interacting.current) setDraft(next);
          else commit(next);
        }}
        onPointerUp={(event) => {
          if (interacting.current) commit(Number(event.currentTarget.value));
        }}
        onPointerCancel={() => {
          interacting.current = false;
          setDragging(false);
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(event.key)
          ) {
            interacting.current = true;
            setDraft(Number(event.currentTarget.value));
            setDragging(true);
          }
        }}
        onKeyUp={(event) => {
          if (interacting.current) commit(Number(event.currentTarget.value));
        }}
        onBlur={(event) => {
          if (interacting.current) commit(Number(event.currentTarget.value));
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: t.color["text-muted"],
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          lineHeight: "20px",
        }}
      >
        <span>{formatTime(current)}</span>
        <span>{formatTime(max)}</span>
      </div>
    </div>
  );
}
