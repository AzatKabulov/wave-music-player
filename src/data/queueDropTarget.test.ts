import assert from "node:assert/strict";
import test from "node:test";
import { queueDropTarget } from "./queueDropTarget.ts";
test("dragging uses measured row geometry, including wrapped controls and group gaps", () => {
  const frames = [
    { id: "current", top: 40, height: 76 },
    { id: "next", top: 160, height: 124 },
    { id: "earlier", top: 340, height: 124 },
  ];
  assert.equal(queueDropTarget("next", 45, frames), "next");
  assert.equal(queueDropTarget("next", 140, frames), "earlier");
  assert.equal(queueDropTarget("next", -160, frames), "current");
  assert.equal(queueDropTarget("missing", 100, frames), undefined);
});
