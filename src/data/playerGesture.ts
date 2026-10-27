export function artworkSwipe(
  distance: number,
  velocity: number,
  width: number,
) {
  "worklet";
  const threshold = Math.max(56, Math.min(96, width * 0.23));
  if (Math.abs(distance) >= threshold) return distance > 0 ? 1 : -1;
  if (
    Math.abs(distance) >= 36 &&
    Math.abs(velocity) >= 800 &&
    distance * velocity > 0
  )
    return distance > 0 ? 1 : -1;
  return 0;
}
export function dismissPlayer(
  distance: number,
  velocity: number,
  height: number,
) {
  "worklet";
  return (
    distance >= 8 &&
    distance + Math.max(0, velocity) * 0.15 >=
      Math.max(90, Math.min(140, height * 0.16))
  );
}
export function seekPosition(x: number, width: number, duration: number) {
  "worklet";
  if (!Number.isFinite(x) || width <= 0 || duration <= 0) return 0;
  return Math.max(0, Math.min(duration, (x / width) * duration));
}
