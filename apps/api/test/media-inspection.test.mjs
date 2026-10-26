import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { inspectAudio } from "../src/media-inspection.mjs";

test("audio staging rejects HTML, wrong duration, video, bad hashes and failed full decodes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "musify-media-"));
  const file = join(dir, "song.mp3");
  let decodeCalls = 0;
  let probe = {
    streams: [
      {
        codec_type: "audio",
        codec_name: "mp3",
        sample_rate: "44100",
        channels: 2,
      },
    ],
    format: { duration: "180", bit_rate: "128000" },
  };
  let decode = "out_time_us=180000000\nprogress=end\n";
  const run = async (tool, args) => {
    assert.equal(args.includes("-protocol_whitelist"), true);
    if (tool === "ffprobe") return { stdout: JSON.stringify(probe) };
    decodeCalls++;
    if (decode === "error") throw Error("decoder rejected a damaged frame");
    return { stdout: decode };
  };
  const options = {
    ffprobePath: "ffprobe",
    ffmpegPath: "ffmpeg",
    expectedDurationMs: 180000,
    run,
  };
  try {
    await writeFile(file, "<html>A download error, not music</html>".repeat(3));
    await assert.rejects(inspectAudio(file, options), /container/i);
    assert.equal(decodeCalls, 0);
    await writeFile(
      file,
      Buffer.concat([Buffer.from("ID3"), Buffer.alloc(200)]),
    );
    await assert.rejects(
      inspectAudio(file, { ...options, expectedSha256: "0".repeat(64) }),
      /checksum/i,
    );
    const valid = await inspectAudio(file, options);
    assert.equal(valid.validationState, "validated");
    assert.equal(valid.measuredDurationMs, 180000);
    assert.equal(valid.mimeType, "audio/mpeg");
    assert.equal(valid.rendition.kind, "source");
    await assert.rejects(
      inspectAudio(file, { ...options, expectedDurationMs: 30000 }),
      /duration/i,
    );
    probe.streams.push({ codec_type: "video", codec_name: "h264" });
    await assert.rejects(inspectAudio(file, options), /video/i);
    probe.streams.pop();
    decode = "out_time_us=30000000\nprogress=end\n";
    await assert.rejects(inspectAudio(file, options), /decoded duration/i);
    decode = "error";
    await assert.rejects(inspectAudio(file, options), /decode/i);
  } finally {
    assert.equal(dirname(dir), tmpdir());
    await rm(dir, { recursive: true, force: true });
  }
});
