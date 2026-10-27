import test from "node:test";
import assert from "node:assert/strict";
import { createStoredChoice } from "./storedChoice.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const parse = (raw: string | null) =>
  raw === "All" || raw === "Albums" || raw === "Artists" ? raw : undefined;

test("a late read cannot overwrite a newer choice and invalid storage uses the default", async () => {
  const read = deferred<string | null>(),
    shown: string[] = [];
  const storage = {
    getItem: async () => read.promise,
    setItem: async () => {},
  };
  const choice = createStoredChoice<string>({
    storage,
    key: "owner-a",
    fallback: "All",
    parse,
    encode: String,
    onValue: (value) => shown.push(value),
  });
  const loading = choice.load();
  choice.choose("Albums");
  read.resolve("Artists");
  await loading;
  assert.deepEqual(shown, ["Albums"]);
  await choice.idle();
  const invalid: string[] = [];
  const second = createStoredChoice<string>({
    storage: { ...storage, getItem: async () => "unrecognized" },
    key: "owner-b",
    fallback: "All",
    parse,
    encode: String,
    onValue: (value) => invalid.push(value),
  });
  await second.load();
  assert.deepEqual(invalid, ["All"]);
});

test("writes serialize across remounts and a new reader waits for the latest choice", async () => {
  const gate = deferred<void>(),
    writes: string[] = [],
    shown: string[] = [];
  let stored = "All";
  const storage = {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => {
      writes.push(value);
      if (writes.length === 1) await gate.promise;
      stored = value;
    },
  };
  const options = {
    storage,
    key: "same-account",
    fallback: "All",
    parse,
    encode: String,
    onValue: (value: string) => shown.push(value),
  };
  const first = createStoredChoice<string>(options);
  first.choose("Albums");
  first.choose("Artists");
  first.dispose();
  const next = createStoredChoice<string>(options);
  const loading = next.load();
  next.choose("All");
  assert.deepEqual(writes, ["Albums"]);
  gate.resolve();
  await loading;
  await next.idle();
  assert.deepEqual(writes, ["Albums", "All"]);
  assert.equal(stored, "All");
  assert.deepEqual(shown, ["Albums", "Artists", "All"]);
});

test("disposed or superseded reads stay silent and storage failures keep choices usable", async () => {
  const old = deferred<string | null>(),
    values: string[] = [];
  let reads = 0;
  const storage = {
    getItem: async () => (++reads === 1 ? old.promise : "Albums"),
    setItem: async () => {
      throw Error("storage unavailable");
    },
  };
  const choice = createStoredChoice<string>({
    storage,
    key: "account-a",
    fallback: "All",
    parse,
    encode: String,
    onValue: (value) => values.push(value),
  });
  const first = choice.load();
  await Promise.resolve();
  choice.dispose();
  await choice.load();
  old.resolve("Artists");
  await first;
  assert.deepEqual(values, ["Albums"]);
  choice.choose("Artists");
  await choice.idle();
  assert.deepEqual(values, ["Albums", "Artists"]);
  choice.dispose();
  choice.choose("All");
  assert.deepEqual(values, ["Albums", "Artists"]);
});

test("a new choice at an idle-cleanup boundary never opens a competing writer", async () => {
  for (let gap = 0; gap < 16; gap++) {
    const first = deferred<void>(),
      later = deferred<void>();
    let active = 0,
      maximum = 0,
      count = 0;
    const storage = {
      getItem: async () => null,
      setItem: async () => {
        active++;
        maximum = Math.max(maximum, active);
        await (++count === 1 ? first.promise : later.promise);
        active--;
      },
    };
    const choice = createStoredChoice<string>({
      storage,
      key: "same-owner",
      fallback: "All",
      parse,
      encode: String,
      onValue: () => {},
    });
    choice.choose("Albums");
    first.resolve();
    for (let tick = 0; tick < gap; tick++) await Promise.resolve();
    choice.choose("Artists");
    for (let tick = 0; tick < 8; tick++) await Promise.resolve();
    choice.choose("All");
    for (let tick = 0; tick < 8; tick++) await Promise.resolve();
    later.resolve();
    await choice.idle();
    assert.equal(
      maximum,
      1,
      `overlapping writes at completion boundary ${gap}`,
    );
  }
});
