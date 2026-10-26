import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const execute = promisify(execFile);
const toolOptions = { timeout: 60000, maxBuffer: 1048576, windowsHide: true };

// Offline operator tooling only. Never pass remote URLs to an external decoder.
export async function inspectAudio(
  file,
  {
    ffmpegPath,
    ffprobePath,
    expectedDurationMs,
    expectedSha256,
    maxBytes = 32 * 1024 * 1024,
    run = execute,
  },
) {
  if (!ffmpegPath || !ffprobePath)
    throw Error("Explicit audio tools are required");
  if (
    !Number.isFinite(expectedDurationMs) ||
    expectedDurationMs <= 0 ||
    expectedDurationMs > 7200000
  )
    throw Error("An intended recording duration is required");
  const path = resolve(file);
  const info = await stat(path);
  if (!info.isFile() || info.size < 44 || info.size > maxBytes)
    throw Error("Invalid audio file size");
  const bytes = await readFile(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sha256)
    throw Error("Audio checksum mismatch");
  const mp4 = bytes.toString("ascii", 4, 8) === "ftyp";
  const mp3 =
    bytes.toString("ascii", 0, 3) === "ID3" ||
    (bytes[0] === 255 && (bytes[1] & 224) === 224);
  const wav =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WAVE";
  if (!mp4 && !mp3 && !wav)
    throw Error("Unsupported or mislabeled audio container");
  let probe;
  try {
    probe = JSON.parse(
      (
        await run(
          ffprobePath,
          [
            "-v",
            "error",
            "-protocol_whitelist",
            "file,pipe",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            path,
          ],
          toolOptions,
        )
      ).stdout,
    );
  } catch {
    throw Error("Audio container inspection failed");
  }
  const streams = probe.streams || [];
  const audio = streams.filter((stream) => stream.codec_type === "audio");
  if (
    streams.some(
      (stream) =>
        stream.codec_type === "video" && !stream.disposition?.attached_pic,
    )
  )
    throw Error("Video is not a music audio recording");
  if (audio.length !== 1) throw Error("One audio stream is required");
  const stream = audio[0];
  const codec = stream.codec_name;
  if (!(mp4 ? ["aac"] : mp3 ? ["mp3"] : ["pcm_s16le"]).includes(codec))
    throw Error("Audio codec does not match its container or native rendition");
  const durationMs = Math.round(
    Number(probe.format?.duration || stream.duration) * 1000,
  );
  const tolerance = Math.max(2500, Math.min(5000, expectedDurationMs * 0.02));
  if (
    !Number.isFinite(durationMs) ||
    Math.abs(durationMs - expectedDurationMs) > tolerance
  )
    throw Error("Audio duration does not match the intended recording");
  const sampleRate = Number(stream.sample_rate),
    channels = Number(stream.channels);
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    ![1, 2].includes(channels)
  )
    throw Error("Unsupported audio sample rate or channel count");
  let decoded;
  try {
    decoded = await run(
      ffmpegPath,
      [
        "-hide_banner",
        "-nostdin",
        "-v",
        "error",
        "-xerror",
        "-err_detect",
        "explode",
        "-protocol_whitelist",
        "file,pipe",
        "-threads",
        "1",
        "-i",
        path,
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-progress",
        "pipe:1",
        "-f",
        "null",
        "-",
      ],
      toolOptions,
    );
  } catch {
    throw Error("Full audio decode failed");
  }
  const times = [...decoded.stdout.matchAll(/out_time_us=(\d+)/g)];
  const measuredDurationMs = Math.round(Number(times.at(-1)?.[1]) / 1000);
  if (
    !/progress=end/.test(decoded.stdout) ||
    !Number.isFinite(measuredDurationMs) ||
    measuredDurationMs <= 0 ||
    Math.abs(measuredDurationMs - durationMs) > tolerance ||
    Math.abs(measuredDurationMs - expectedDurationMs) > tolerance
  )
    throw Error("Decoded duration does not cover the intended recording");
  const mimeType = mp4 ? "audio/mp4" : mp3 ? "audio/mpeg" : "audio/wav";
  return {
    sha256,
    byteSize: bytes.length,
    mimeType,
    codec,
    sampleRate,
    channels,
    measuredDurationMs,
    validationState: "validated",
    decoder: "ffmpeg",
    rendition: {
      kind: "source",
      container: mp4 ? "m4a" : mp3 ? "mp3" : "wav",
      bitrate: Number(probe.format?.bit_rate) || null,
    },
  };
}
