import test from "node:test";
import assert from "node:assert/strict";
import { createPlaybackTiming } from "./playbackTiming.ts";

const entry = "10000000-0000-4000-8000-000000000001";
const track = "20000000-0000-4000-8000-000000000001";

test("playback stages use one relative monotonic clock and identify an injected request delay", () => {
  let time = 1000;
  const timing = createPlaybackTiming({ enabled: true, now: () => time });
  const id = timing.start("playSelection");
  time += 5;
  timing.mark(id, "commandStarted");
  timing.mark(id, "requestStarted");
  time += 400;
  timing.mark(id, "serverAcknowledged");
  time += 30;
  timing.mark(id, "grantReady");
  timing.bind(id, entry, track);
  timing.mark(id, "installStarted");
  time += 3;
  timing.mark(id, "installed");
  timing.observe(id, entry, true, 0);
  time += 500;
  timing.observe(id, entry, true, 0.5);
  const value = timing.snapshot()[0];
  assert.equal(value.marks.tap, 0);
  assert.equal(
    value.marks.serverAcknowledged! - value.marks.requestStarted!,
    400,
  );
  assert.equal(value.marks.playbackObserved, 938);
  assert.equal(value.entryId, entry);
  // Repeated status ticks never change the first observation.
  time += 500;
  timing.observe(id, entry, true, 1);
  assert.equal(timing.snapshot()[0].marks.playbackObserved, 938);
});

test("buffering, paused, mismatched and non-advancing status cannot imply playback", () => {
  const timing = createPlaybackTiming({ enabled: true, now: () => 10 });
  const id = timing.start("playSelection");
  timing.bind(id, entry, track);
  timing.mark(id, "installed");
  timing.observe(id, track, true, 10);
  timing.observe(id, entry, false, 0);
  timing.observe(id, entry, true, 0);
  timing.observe(id, entry, true, 0);
  assert.equal(timing.snapshot()[0].marks.playbackObserved, undefined);
  timing.observe(id, entry, true, 0.5);
  assert.equal(timing.snapshot()[0].marks.playbackObserved, 0);
});

test("diagnostics are bounded, copied, ID-only and disabled without clock/storage work", () => {
  let clockCalls = 0;
  const disabled = createPlaybackTiming({
    enabled: false,
    now: () => ++clockCalls,
  });
  disabled.mark(disabled.start("playSelection"), "failed");
  assert.equal(clockCalls, 0);
  assert.deepEqual(disabled.snapshot(), []);
  const timing = createPlaybackTiming({
    enabled: true,
    limit: 2,
    now: () => 5,
  });
  const old = timing.start("queueEdit");
  timing.start("playSelection");
  const id = timing.start("queueEdit");
  timing.bind(id, "https://secret-token.example/entry", "bearer token");
  timing.mark(old, "failed");
  const rows = timing.snapshot();
  assert.equal(rows.length, 2);
  assert.ok(!JSON.stringify(rows).includes("secret"));
  assert.equal(rows[1].entryId, undefined);
  rows[1].marks.tap = 123;
  assert.equal(timing.snapshot()[1].marks.tap, 0);
  timing.clear();
  timing.mark(id, "installed");
  assert.deepEqual(timing.snapshot(), []);
});
