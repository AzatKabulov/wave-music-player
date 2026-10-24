import { createApp } from "./app.mjs";
import { createDatabase } from "./database.mjs";
import { listenerConfig } from "./listener.mjs";
const { mode, host, port, origin, baseUrl, personalTest } = listenerConfig();
const db = await createDatabase({ mode, personalTest });
const app = await createApp({
  db,
  mode,
  origin,
  baseUrl,
  personalTest,
});
await app.listen({
  port,
  host,
});
process.stdout.write(
  `Musify API ready at ${baseUrl} (${personalTest ? "private Wi-Fi test" : mode})\n`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await app.close();
    await db.close();
    process.exit(0);
  });
