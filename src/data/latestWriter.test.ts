import test from "node:test";
import assert from "node:assert/strict";
import { createLatestWriter } from "./latestWriter.ts";

test("a slow checkpoint retains only the newest pending position", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const values: number[] = [];
  const writer = createLatestWriter<number>(async (value) => {
    values.push(value);
    if (value === 1) await held;
  });
  writer.submit(1);
  writer.submit(2);
  writer.submit(3);
  assert.deepEqual(values, [1]);
  release();
  await writer.idle();
  assert.deepEqual(values, [1, 3]);
});

test("clearing an account discards queued writes and idle waits for the in-flight write", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const values: number[] = [];
  const writer = createLatestWriter<number>(async (value) => {
    values.push(value);
    await held;
  });
  writer.submit(1);
  writer.submit(2);
  writer.clear();
  release();
  await writer.idle();
  assert.deepEqual(values, [1]);
  writer.submit(3);
  await writer.idle();
  assert.deepEqual(values, [1, 3]);
});

test("failed checkpoints do not poison future writes", async () => {
  const values: number[] = [],
    failures: number[] = [];
  const writer = createLatestWriter<number>(
    async (value) => {
      values.push(value);
      if (value === 1) throw Error("offline");
    },
    (_error, value) => {
      failures.push(value);
    },
  );
  writer.submit(1);
  writer.submit(2);
  await writer.idle();
  writer.submit(3);
  await writer.idle();
  assert.deepEqual(values, [1, 2, 3]);
  assert.deepEqual(failures, [1]);
});
