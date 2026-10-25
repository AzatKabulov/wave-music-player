import test from "node:test";
import assert from "node:assert/strict";
import { fetchJson, ConnectionError } from "./fetchJson.ts";

const hangs: typeof fetch = async (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
  });
test("an unresponsive connection terminates with a recoverable timeout", async () => {
  await assert.rejects(
    fetchJson("http://test.local", {}, { timeoutMs: 15, transport: hangs }),
    (error) => error instanceof ConnectionError && error.code === "timeout",
  );
});
test("a cancelled search remains cancellation rather than a network failure", async () => {
  const controller = new AbortController();
  const request = fetchJson(
    "http://test.local",
    { signal: controller.signal },
    { transport: hangs },
  );
  controller.abort();
  await assert.rejects(
    request,
    (error) => error instanceof DOMException && error.name === "AbortError",
  );
});
test("successful JSON and empty responses preserve HTTP status", async () => {
  const full = await fetchJson(
    "http://test.local",
    {},
    { transport: async () => new Response('{"ok":true}', { status: 200 }) },
  );
  assert.deepEqual(full.json, { ok: true });
  assert.equal(full.response.status, 200);
  const empty = await fetchJson(
    "http://test.local",
    {},
    { transport: async () => new Response(null, { status: 204 }) },
  );
  assert.deepEqual(empty.json, {});
});
