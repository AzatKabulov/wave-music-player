import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { listenerConfig } from "../apps/api/src/listener.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const candidates = Object.values(networkInterfaces())
  .flat()
  .filter(
    (x) =>
      x &&
      x.family === "IPv4" &&
      !x.internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address),
  );
const host =
  process.env.MUSIFY_PERSONAL_TEST_HOST ||
  (candidates.length === 1 ? candidates[0].address : null);
if (!host)
  throw Error("Set MUSIFY_PERSONAL_TEST_HOST to your PC's Wi-Fi IPv4 address.");
const config = listenerConfig({ MUSIFY_PERSONAL_TEST_HOST: host });
const env = {
  ...process.env,
  APP_MODE: "local",
  HOST: host,
  PORT: String(config.port),
  APP_ORIGIN: config.origin,
  API_PUBLIC_URL: config.baseUrl,
  MUSIFY_PERSONAL_TEST_HOST: host,
  EXPO_PUBLIC_API_URL: config.baseUrl,
  EXPO_PUBLIC_PERSONAL_TEST: "1",
  EXPO_NO_TELEMETRY: "1",
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --dns-result-order=ipv4first`,
};
console.log(
  `Musify personal test\niPhone Expo Go: exp://${host}:8082\nConnection check: ${config.baseUrl}/health/ready\nKeep both phones on this PC's trusted Wi-Fi. The personal test uses a separate database.`,
);
const children = [
  spawn(process.execPath, ["apps/api/src/start.mjs"], {
    cwd: root,
    env,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    ["node_modules/expo/bin/cli", "start", "--go", "--lan", "--port", "8082"],
    { cwd: root, env, stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => stop());
