import assert from "node:assert/strict";
import test from "node:test";
import {
  endWindowSec,
  sleepOff,
  sleepRemainingMs,
  startSleepAtTrackEnd,
  startSleepMinutes,
  stepSleep,
  type SleepObservation,
} from "./sleepTimer.ts";

const at = (
  now: number,
  entryId: string | null,
  positionSec: number,
  durationSec = 24,
): SleepObservation => ({ now, entryId, positionSec, durationSec });

test("a duration timer holds an absolute deadline and rejects unusable lengths", () => {
  const timer = startSleepMinutes(15, 1_000);
  assert.deepEqual(timer, {
    kind: "duration",
    minutes: 15,
    deadline: 1_000 + 15 * 60_000,
  });
  for (const minutes of [
    0,
    -5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    24 * 60 + 1,
  ])
    assert.deepEqual(startSleepMinutes(minutes, 0), sleepOff);
  assert.deepEqual(startSleepAtTrackEnd(null), sleepOff);
  assert.deepEqual(startSleepAtTrackEnd(""), sleepOff);
});

test("a duration timer fires once at or after its deadline, however late the first look", () => {
  const timer = startSleepMinutes(1, 0);
  assert.equal(stepSleep(timer, null, at(59_999, "a", 3)).fire, false);
  const late = stepSleep(timer, null, at(3_600_000, "a", 3));
  assert.equal(late.fire, true);
  assert.deepEqual(late.timer, sleepOff);
  // Once spent, further observations never fire again.
  assert.equal(stepSleep(late.timer, null, at(3_700_000, "a", 3)).fire, false);
  assert.equal(sleepRemainingMs(timer, at(15_000, "a", 3)), 45_000);
  assert.equal(sleepRemainingMs(timer, at(90_000, "a", 3)), 0);
});

test("an end-of-track timer pauses inside the final window and only for its own song", () => {
  const timer = startSleepAtTrackEnd("a");
  assert.equal(stepSleep(timer, null, at(0, "a", 10)).fire, false);
  assert.equal(
    stepSleep(timer, null, at(0, "a", 24 - endWindowSec - 0.01)).fire,
    false,
  );
  const done = stepSleep(timer, null, at(0, "a", 24 - endWindowSec));
  assert.equal(done.fire, true);
  assert.deepEqual(done.timer, sleepOff);
  // An unloaded song reports no duration, so it cannot be mistaken for the end.
  assert.equal(stepSleep(timer, null, at(0, "a", 0, 0)).fire, false);
  assert.equal(sleepRemainingMs(timer, at(0, "a", 20)), 4_000);
  assert.equal(sleepRemainingMs(timer, at(0, "b", 20)), null);
  assert.equal(sleepRemainingMs(timer, at(0, "a", 0, 0)), null);
});

test("skipping moves an end-of-track timer to the new song instead of stopping", () => {
  const timer = startSleepAtTrackEnd("a");
  const skipped = stepSleep(timer, at(0, "a", 4), at(1, "b", 0));
  assert.equal(skipped.fire, false);
  assert.deepEqual(skipped.timer, { kind: "track", entryId: "b" });
  // Skipping back to a song with no previous look is also a plain re-arm.
  assert.deepEqual(stepSleep(timer, null, at(1, "c", 0)).timer, {
    kind: "track",
    entryId: "c",
  });
});

test("a song that finished between ticks stops at the next song instead of following it", () => {
  const timer = startSleepAtTrackEnd("a");
  const advanced = stepSleep(timer, at(0, "a", 22.5), at(1, "b", 0.1));
  assert.equal(advanced.fire, true);
  assert.deepEqual(advanced.timer, sleepOff);
  // Far from the end it was a manual skip, so the timer follows.
  assert.equal(stepSleep(timer, at(0, "a", 20), at(1, "b", 0.1)).fire, false);
});

test("emptying the queue ends an end-of-track timer without a pause", () => {
  const cleared = stepSleep(
    startSleepAtTrackEnd("a"),
    at(0, "a", 5),
    at(1, null, 0, 0),
  );
  assert.equal(cleared.fire, false);
  assert.deepEqual(cleared.timer, sleepOff);
  assert.equal(stepSleep(sleepOff, null, at(0, "a", 23.9)).fire, false);
});
