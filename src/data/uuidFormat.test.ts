import test from "node:test";
import assert from "node:assert/strict";
import { uuidFromBytes } from "./uuidFormat.ts";
test("LAN web UUID formatting preserves entropy, version and variant without mutating its input", () => {
  const source = new Uint8Array(16).fill(255);
  assert.equal(uuidFromBytes(source), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.ok(source.every((value) => value === 255));
  assert.throws(() => uuidFromBytes(new Uint8Array(15)));
});
