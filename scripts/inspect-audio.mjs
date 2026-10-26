import { inspectAudio } from "../apps/api/src/media-inspection.mjs";

const [file, duration, expectedSha256] = process.argv.slice(2);
if (!file || !duration) {
  console.error(
    "Usage: node scripts/inspect-audio.mjs <local-file> <expected-duration-ms> [sha256]\nSet MUSIFY_FFMPEG_PATH and MUSIFY_FFPROBE_PATH to verified local executables.",
  );
  process.exitCode = 1;
} else {
  const result = await inspectAudio(file, {
    ffmpegPath: process.env.MUSIFY_FFMPEG_PATH,
    ffprobePath: process.env.MUSIFY_FFPROBE_PATH,
    expectedDurationMs: Number(duration),
    expectedSha256,
  });
  console.log(JSON.stringify(result, null, 2));
}
