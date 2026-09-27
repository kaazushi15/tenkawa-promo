// Capture stills: node tools/stills.mjs <outDir> t1 t2 ...
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright"); // honours NODE_PATH for a global install

const [outDir, ...times] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render" + (process.env.CLIP ? "&clip=" + process.env.CLIP : ""));
await page.evaluate(() => window.MV.ready);
for (const t of times) {
  await page.evaluate((t) => window.MV.renderAsync(t), parseFloat(t));
  await page.screenshot({ path: path.join(outDir, `f_${t}.png`) });
}
await browser.close();
