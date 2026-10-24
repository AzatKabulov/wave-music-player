import { createApp } from "./app.mjs";
import { createDatabase } from "./database.mjs";
const mode = process.env.APP_MODE || "local",
  port = Number(process.env.PORT || 4100),
  origin = process.env.APP_ORIGIN || "http://localhost:8081";
if (mode === "local" && process.env.HOST && process.env.HOST !== "127.0.0.1")
  throw Error("Local demo mode binds to IPv4 loopback only.");
if (
  mode === "supabase" &&
  (!process.env.API_PUBLIC_URL?.startsWith("https://") ||
    !origin.startsWith("https://"))
)
  throw Error("Production API and app origins require HTTPS.");
const db = await createDatabase({ mode });
const app = await createApp({
  db,
  mode,
  origin,
  baseUrl: process.env.API_PUBLIC_URL || `http://127.0.0.1:${port}`,
});
await app.listen({
  port,
  host: mode === "local" ? "127.0.0.1" : process.env.HOST || "0.0.0.0",
});
process.stdout.write(
  `Saz API ready at ${mode === "local" ? "http://127.0.0.1:" : ""}${port} (${mode})\n`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await app.close();
    await db.close();
    process.exit(0);
  });
