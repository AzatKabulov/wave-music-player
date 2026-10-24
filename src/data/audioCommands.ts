import type { QueueState } from "./types";

// Expo's playlist is an imperative native object; loop is its documented setter.
export function setRepeat(
  player: { loop: QueueState["repeat"] },
  mode: QueueState["repeat"],
) {
  player.loop = mode;
}
