// Capture the spot as separate transparent layers (for the making-of's exploded view).
//   NODE_PATH=$(npm root -g) node tools/layers.mjs [t]
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = parseFloat(process.argv[2] || "10.6");
const LAYERS = {
  bg: ["#bg", "#vignette"],
  map: ["#cam-a"],
  type: ["#type", "#behind"],
  woman: ["#cam-b"],
  light: ["#fx", "#near", "#ticker"],
};
const ALL = [...new Set(Object.values(LAYERS).flat()), "#bug"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render");
await page.evaluate(async (t) => { await window.MV.ready; await window.MV.renderAsync(t); }, t);
for (const [name, show] of Object.entries(LAYERS)) {
  await page.evaluate(([all, show]) => {
    // opacity, not visibility: render() sets visibility on children, which would override a hidden parent
    for (const sel of all) document.querySelector(sel).style.opacity = show.includes(sel) ? 1 : 0;
    document.getElementById("stage").style.background = "transparent";
    document.getElementById("grain").style.visibility = "hidden";
    document.body.style.background = document.documentElement.style.background = "transparent";
  }, [ALL, show]);
  await page.screenshot({ path: path.join(root, "assets", "making", `layer_${name}.png`), omitBackground: true });
}
await browser.close();
console.log("layers written for t =", t);
