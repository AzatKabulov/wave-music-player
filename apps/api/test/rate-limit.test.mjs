import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.mjs";
import { createDatabase } from "../src/database.mjs";

test("normal APIs retain authentication throttling and expose no QA reset route", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db });
  try {
    assert.equal(
      (await app.inject({ method: "POST", url: "/__qa/reset-auth-window" }))
        .statusCode,
      404,
    );
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "invalid" },
      });
      assert.equal(response.statusCode, 422, response.body);
    }
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/auth/login",
          payload: { email: "invalid" },
        })
      ).statusCode,
      429,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
