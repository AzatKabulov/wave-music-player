export function queueDropTarget(
  id: string,
  translation: number,
  frames: { id: string; top: number; height: number }[],
) {
  const origin = frames.find((frame) => frame.id === id);
  if (!origin || !Number.isFinite(translation)) return;
  const center = origin.top + origin.height / 2 + translation;
  return frames.reduce(
    (closest, frame) =>
      Math.abs(frame.top + frame.height / 2 - center) <
      Math.abs(closest.top + closest.height / 2 - center)
        ? frame
        : closest,
    origin,
  ).id;
}
