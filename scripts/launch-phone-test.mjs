import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const controller = fileURLToPath(
  new URL("./start-phone-test.mjs", import.meta.url),
);
const result = spawnSync(process.execPath, [controller, "--connection-json"], {
  cwd: root,
  encoding: "utf8",
});
if (result.status)
  throw Error(result.stderr || "Could not determine the Wi-Fi address.");
const connection = JSON.parse(result.stdout);
async function ready() {
  try {
    const [api, expo] = await Promise.all([
      fetch(`${connection.api}/health/ready`, {
        signal: AbortSignal.timeout(2000),
      }),
      fetch(`${connection.expo}/`, {
        headers: { Accept: "application/expo+json", "expo-platform": "ios" },
        signal: AbortSignal.timeout(2000),
      }),
    ]);
    return (
      api.ok &&
      expo.ok &&
      (await api.json()).ok === true &&
      (await expo.json()).runtimeVersion === "exposdk:58.0.0"
    );
  } catch {
    return false;
  }
}
if (!(await ready())) {
  const logs = new URL("../apps/api/data/phone-test/", import.meta.url);
  await mkdir(logs, { recursive: true });
  if (process.platform !== "win32")
    throw Error("Use npm run test:phones in a terminal on this platform.");
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  const pidFile = new URL(`started-${process.pid}.pid`, logs);
  const launch = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; $p=Start-Process" +
        ` -FilePath ${quote(process.execPath)} -ArgumentList ${quote(`"${controller}"`)}` +
        ` -WorkingDirectory ${quote(root)} -WindowStyle Hidden` +
        ` -RedirectStandardOutput ${quote(fileURLToPath(new URL("server.log", logs)))}` +
        ` -RedirectStandardError ${quote(fileURLToPath(new URL("server-error.log", logs)))}` +
        ` -PassThru; $p.Id | Set-Content -Encoding ascii -LiteralPath ${quote(fileURLToPath(pidFile))}`,
    ],
    { stdio: "ignore", windowsHide: true },
  );
  const pid = Number(await readFile(pidFile, "utf8").catch(() => ""));
  await unlink(pidFile).catch(() => {});
  if (launch.status || !Number.isInteger(pid) || pid < 1)
    throw Error("Windows could not start Musify. Check the phone-test logs.");
  await writeFile(
    new URL("runtime.json", logs),
    JSON.stringify(
      {
        pid,
        controller,
        startedAt: new Date().toISOString(),
        ...connection,
      },
      null,
      2,
    ),
  );
  let available = false;
  for (let attempt = 0; attempt < 45; attempt++) {
    if (await ready()) {
      available = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!available)
    throw Error(`Services did not become ready. Check ${fileURLToPath(logs)}`);
}
console.log(
  `Musify is running in the background.\niPhone: ${connection.expoGo}\nAndroid APK: ${connection.androidApk}\nConnection check: ${connection.api}/health/ready\nKeep the PC awake and both phones on its Wi-Fi.`,
);
