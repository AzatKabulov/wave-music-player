import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const configure = require("../app.config.js");
const config = require("../app.json").expo;

test("online mobile builds require a public HTTPS API and keep Android test identity", () => {
  const previous = { ...process.env };
  try {
    process.env.EXPO_PUBLIC_ONLINE_TEST = "1";
    process.env.EXPO_PUBLIC_PERSONAL_TEST = "0";
    for (const url of [
      "",
      "http://api.example.org",
      "https://localhost",
      "https://192.168.0.4",
      "https://[::1]",
      "https://api.local",
      "https://name:secret@api.example.org",
      "https://api.example.org?secret=value",
    ]) {
      process.env.EXPO_PUBLIC_API_URL = url;
      assert.throws(() => configure({ config }), /HTTPS/);
    }
    process.env.EXPO_PUBLIC_API_URL = "https://musify-test.onrender.com";
    const result = configure({ config });
    assert.equal(result.android.package, "com.local.musifytest");
    const properties = result.plugins.find(
      (p) => Array.isArray(p) && p[0] === "expo-build-properties",
    );
    assert.equal(properties[1].android.usesCleartextTraffic, false);
    process.env.EXPO_PUBLIC_PERSONAL_TEST = "1";
    assert.throws(() => configure({ config }), /cannot be combined/);
  } finally {
    for (const key of [
      "EXPO_PUBLIC_ONLINE_TEST",
      "EXPO_PUBLIC_PERSONAL_TEST",
      "EXPO_PUBLIC_API_URL",
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
