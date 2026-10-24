import { isIPv4 } from "node:net";
import { networkInterfaces } from "node:os";

export function listenerConfig(
  env = process.env,
  addresses = Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((x) => x.address),
) {
  const mode = env.APP_MODE || "local";
  if (!["local", "supabase"].includes(mode))
    throw Error("APP_MODE must be local or supabase.");
  const personalHost = env.MUSIFY_PERSONAL_TEST_HOST;
  if (personalHost && mode !== "local")
    throw Error("Personal testing cannot use production mode.");
  if (personalHost) {
    const [a, b] = personalHost.split(".").map(Number);
    if (
      !isIPv4(personalHost) ||
      !addresses.includes(personalHost) ||
      !(
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      )
    )
      throw Error("Choose a private IPv4 address assigned to this PC.");
    if (env.HOST && env.HOST !== personalHost)
      throw Error("HOST conflicts with the personal test interface.");
  } else if (mode === "local" && env.HOST && env.HOST !== "127.0.0.1") {
    throw Error("Local demo mode binds to IPv4 loopback only.");
  }
  const host =
    personalHost || (mode === "local" ? "127.0.0.1" : env.HOST || "0.0.0.0");
  const port = Number(env.PORT || (personalHost ? 4103 : 4100));
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Choose a valid TCP port.");
  const origin =
    env.APP_ORIGIN ||
    (personalHost ? `http://${personalHost}:8082` : "http://localhost:8081");
  const baseUrl = env.API_PUBLIC_URL || `http://${host}:${port}`;
  if (personalHost && baseUrl !== `http://${host}:${port}`)
    throw Error("Personal media must stay on the selected private interface.");
  if (
    mode === "supabase" &&
    (new URL(baseUrl).protocol !== "https:" ||
      new URL(origin).protocol !== "https:")
  )
    throw Error("Production API and app origins require HTTPS.");
  return {
    mode,
    host,
    port,
    origin,
    baseUrl,
    personalTest: Boolean(personalHost),
  };
}
