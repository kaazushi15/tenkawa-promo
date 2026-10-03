// Frame-accurate renderer: drives window.render(t) and pipes screenshots to ffmpeg.
// usage (from the project dir): node <skill>/scripts/render.mjs [out.mp4] [fps] [--frames t1,t2,...] [--from s --to s] [--page index.html] [--size 1080x1920]
// needs: npm i playwright (matching the preinstalled browsers) and ffmpeg
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// resolve playwright from the project (npm i playwright) or, failing that, the global install
function loadPlaywright() {
  const tries = [path.join(process.cwd(), 'package.json')];
  try { tries.push(path.join(execSync('npm root -g').toString().trim(), 'noop.js')); } catch {}
  for (const base of tries) { try { return createRequire(base)('playwright'); } catch {} }
  throw new Error('playwright not found: run `npm i playwright` in the project dir');
}
const { chromium } = loadPlaywright();

// run from the project directory (the folder that contains index.html and assets/)
const root = process.cwd();
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0] && !args[0].startsWith('--') ? args[0] : 'out/h3_lp_motion_silent.mp4';
// --page making.html --size 2160x2000 renders other compositions with the same pipeline
const fps = Number(args[1] && !args[1].startsWith('--') ? args[1] : 60);
const stills = opt('--frames', null);
const pageName = opt('--page', 'index.html');
const [VW, VH] = opt('--size', '1080x1920').split('x').map(Number);

// tiny static server (file:// blocks WebGL textures and CSS masks)
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const chromeArgs = (process.env.CHROME_ARGS || '--use-gl=angle --use-angle=swiftshader --disable-gpu-compositing').split(' ').filter(Boolean);
const browser = await chromium.launch({ args: [...chromeArgs, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(base + '/' + pageName + '?render=1');
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const END = await page.evaluate(() => window.END);
const stage = await page.$('#stage');

if (stills) {
  fs.mkdirSync(path.join(root, 'out/stills'), { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await stage.screenshot({ path: path.join(root, `out/stills/${path.basename(pageName, '.html')}_t${t.toFixed(2)}.jpg`), type: process.env.STILL_PNG ? 'png' : 'jpeg', ...(process.env.STILL_PNG ? {} : { quality: 88 }) });
    console.log('still', t);
  }
  await browser.close(); server.close(); process.exit(0);
}

const from = Number(opt('--from', 0)), to = Number(opt('--to', END));
const n = Math.round((to - from) * fps);
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', path.resolve(root, out)], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < n; f++) {
  const t = from + f / fps;
  await page.evaluate(t => window.render(t), t);
  const buf = await stage.screenshot({ type: 'jpeg', quality: 97 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`frame ${f}/${n}  t=${t.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log('done', out);
