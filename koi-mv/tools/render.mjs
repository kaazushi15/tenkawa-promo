// Export the MV to MP4: frames are seeked deterministically, the soundtrack is bounced
// with an OfflineAudioContext, then ffmpeg muxes both.
//   NODE_PATH=$(npm root -g) node tools/render.mjs [out.mp4]   (needs playwright + ffmpeg)
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const { chromium } = createRequire(import.meta.url)("playwright"); // honours NODE_PATH for a global install
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || path.join(root, "dist", "koi-no-tabi.mp4"));
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 30;
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render");
const dur = await page.evaluate(async () => { await window.MV.ready; return window.MV.DUR; });

// soundtrack → 16-bit WAV
const pcm = await page.evaluate(async () => {
  const buf = await window.KoiAudio.renderOffline(window.MV.CUES);
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
  const i16 = new Int16Array(n * 2);
  for (let i = 0; i < n; i++) {
    i16[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767;
    i16[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767;
  }
  let bin = "";
  const u8 = new Uint8Array(i16.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { rate: buf.sampleRate, b64: btoa(bin) };
});
const data = Buffer.from(pcm.b64, "base64");
const wav = Buffer.alloc(44);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + data.length, 4); wav.write("WAVE", 8);
wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(pcm.rate, 24); wav.writeUInt32LE(pcm.rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(data.length, 40);
const wavPath = path.join(os.tmpdir(), `koi-mv-${process.pid}.wav`);
fs.writeFileSync(wavPath, Buffer.concat([wav, data]));

// picture → ffmpeg over a pipe
const ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-i", wavPath, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-shortest", out], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(dur * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.MV.render(t), i / FPS);
  const png = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 30 === 0) process.stdout.write(`\rframe ${i}/${frames}`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (c) => (c ? j(new Error("ffmpeg exited " + c)) : r())));
await browser.close();
fs.rmSync(wavPath, { force: true });
console.log(`\nwrote ${out}`);
