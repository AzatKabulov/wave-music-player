import { uuidFromBytes } from "./uuidFormat";
export function randomUUID() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return uuidFromBytes(bytes);
}
