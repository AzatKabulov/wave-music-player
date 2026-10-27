// A sleep timer is a plain value stepped by observations of playback. The duration
// variant stores an absolute deadline, so an app that was throttled or suspended and
// wakes late still stops on its first look instead of waiting for a tick it missed.
export type SleepTimer =
  | { kind: "off" }
  | { kind: "duration"; minutes: number; deadline: number }
  | { kind: "track"; entryId: string };

export type SleepObservation = {
  now: number;
  entryId: string | null;
  positionSec: number;
  durationSec: number;
};

export const sleepOff: SleepTimer = { kind: "off" };
export const sleepMinutes = [5, 10, 15, 30, 45, 60] as const;

// Pause this close to the end of a song so the next one never audibly starts.
export const endWindowSec = 0.5;
// If the active entry changed and the previous look was this close to the end, the song
// finished by itself before a tick caught it: stop rather than follow the next song.
const advanceWindowSec = 2.5;

export function startSleepMinutes(minutes: number, now: number): SleepTimer {
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60
    ? { kind: "duration", minutes, deadline: now + minutes * 60_000 }
    : sleepOff;
}

export function startSleepAtTrackEnd(entryId: string | null | undefined) {
  return entryId ? ({ kind: "track", entryId } as SleepTimer) : sleepOff;
}

const left = (observation: SleepObservation) =>
  observation.durationSec > 0
    ? Math.max(0, observation.durationSec - observation.positionSec)
    : null;

export function stepSleep(
  timer: SleepTimer,
  previous: SleepObservation | null,
  current: SleepObservation,
): { timer: SleepTimer; fire: boolean } {
  if (timer.kind === "off") return { timer, fire: false };
  if (timer.kind === "duration")
    return current.now >= timer.deadline
      ? { timer: sleepOff, fire: true }
      : { timer, fire: false };
  if (current.entryId === timer.entryId) {
    const remaining = left(current);
    return remaining !== null && remaining <= endWindowSec
      ? { timer: sleepOff, fire: true }
      : { timer, fire: false };
  }
  const remaining = previous?.entryId === timer.entryId ? left(previous) : null;
  if (remaining !== null && remaining <= advanceWindowSec)
    return { timer: sleepOff, fire: true };
  // A manual skip moves the timer to the song now playing; an emptied queue ends it.
  return {
    timer: current.entryId ? startSleepAtTrackEnd(current.entryId) : sleepOff,
    fire: false,
  };
}

// Milliseconds until the timer fires, or null when unknown (nothing armed, or the
// armed song is not the one currently loaded).
export function sleepRemainingMs(
  timer: SleepTimer,
  current: SleepObservation,
): number | null {
  if (timer.kind === "duration")
    return Math.max(0, timer.deadline - current.now);
  if (timer.kind === "track" && current.entryId === timer.entryId) {
    const remaining = left(current);
    return remaining === null ? null : remaining * 1000;
  }
  return null;
}
