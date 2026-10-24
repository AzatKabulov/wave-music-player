import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { parseRange } from "./common.mjs";

export function registerPersonalDownload(
  app,
  { enabled = false, apkFile } = {},
) {
  if (!enabled) return;
  app.route({
    method: ["GET", "HEAD"],
    url: "/test/android.apk",
    handler: async (req, reply) => {
      const file = await stat(apkFile).catch(() => null);
      if (!file?.isFile())
        return reply.code(404).send({ error: "APK unavailable" });
      const range = parseRange(req.headers.range, file.size);
      reply.header("Accept-Ranges", "bytes");
      if (!range)
        return reply
          .code(416)
          .header("Content-Range", `bytes */${file.size}`)
          .send();
      reply
        .type("application/vnd.android.package-archive")
        .header("Content-Disposition", 'attachment; filename="Musify.apk"')
        .header("Content-Length", String(range.end - range.start + 1));
      if (range.partial)
        reply
          .code(206)
          .header(
            "Content-Range",
            `bytes ${range.start}-${range.end}/${file.size}`,
          );
      if (req.method === "HEAD") return reply.send();
      return reply.send(
        createReadStream(apkFile, { start: range.start, end: range.end }),
      );
    },
  });
}
