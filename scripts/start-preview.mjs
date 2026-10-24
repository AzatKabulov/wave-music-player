import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const cli = fileURLToPath(
  new URL("../node_modules/expo/bin/cli", import.meta.url),
);
const child = spawn(
  process.execPath,
  [cli, "start", "--web", "--localhost", "--port", "8081"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --dns-result-order=ipv4first`,
      EXPO_NO_TELEMETRY: "1",
    },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
