import { createDatabase } from "../apps/api/src/database.mjs";
import { createApp } from "../apps/api/src/app.mjs";

// Dedicated disposable databases keep repeatable QA away from the preview library.
// Each project keeps the normal local authentication rate limit.
const servers = [];
for (const port of [4101, 4102]) {
  const db = await createDatabase({ mode: "local", memory: true });
  const app = await createApp({
    db,
    mode: "local",
    origin: "http://localhost:8081",
    baseUrl: `http://localhost:${port}`,
  });
  await app.listen({ port, host: "127.0.0.1" });
  servers.push({ app, db });
}
console.log("Disposable QA APIs ready on loopback 4101/4102");
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    for (const { app, db } of servers) {
      await app.close();
      await db.close();
    }
    process.exit(0);
  });
