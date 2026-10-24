import { test } from "node:test";
import assert from "node:assert/strict";
import { listenerConfig } from "../src/listener.mjs";

const addresses = ["192.168.0.4"];

test("the ordinary local server remains loopback-only", () => {
  assert.equal(listenerConfig({}, addresses).host, "127.0.0.1");
  assert.throws(() => listenerConfig({ HOST: "0.0.0.0" }, addresses));
  assert.throws(() => listenerConfig({ HOST: "192.168.0.4" }, addresses));
});

test("personal testing binds only an explicitly selected private local interface", () => {
  const config = listenerConfig(
    { MUSIFY_PERSONAL_TEST_HOST: "192.168.0.4" },
    addresses,
  );
  assert.equal(config.host, "192.168.0.4");
  assert.equal(config.port, 4103);
  assert.equal(config.personalTest, true);
  assert.equal(config.baseUrl, "http://192.168.0.4:4103");
  assert.equal(config.origin, "http://192.168.0.4:8082");
  for (const host of [
    "0.0.0.0",
    "127.0.0.1",
    "8.8.8.8",
    "192.168.0.5",
    "192.168.0.999",
    "example.com",
  ])
    assert.throws(() =>
      listenerConfig({ MUSIFY_PERSONAL_TEST_HOST: host }, addresses),
    );
});

test("personal test and production configuration cannot be mixed", () => {
  assert.throws(() =>
    listenerConfig(
      { APP_MODE: "supabase", MUSIFY_PERSONAL_TEST_HOST: "192.168.0.4" },
      addresses,
    ),
  );
  assert.throws(() =>
    listenerConfig(
      {
        APP_MODE: "supabase",
        APP_ORIGIN: "http://example.com",
        API_PUBLIC_URL: "https://api.example.com",
      },
      addresses,
    ),
  );
  assert.throws(() =>
    listenerConfig(
      {
        MUSIFY_PERSONAL_TEST_HOST: "192.168.0.4",
        API_PUBLIC_URL: "https://example.com",
      },
      addresses,
    ),
  );
});
