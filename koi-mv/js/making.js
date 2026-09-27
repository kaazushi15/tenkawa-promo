/* HOW IT'S MADE — a 15 s making-of for 恋する乙女のラブソング, in the MV's own style.
 * The production pipeline is a transit line: the camera rides from station to station
 * and each stop demonstrates one step with the real production files.
 * Like mv.js, everything is a pure function of time: render(t). */
(() => {
  "use strict";

  const DUR = 15, BEAT = 60 / 128, MUSIC_IN = 1.875;
  const STEP_T = [1.4, 3.0, 4.6, 6.2, 7.8, 9.4, 11.0], STEP_LEN = 1.6, OUT_T = 12.6;
  const RECAP = STEP_T.map((_, i) => 12.72 + i * 0.06);
  const STEPS = [
    { jp: "原画", en: "KEY VISUAL", tools: [["キービジュアル 1枚", "jp"]], cap: "ぜんぶ、この1枚から。" },
    { jp: "緑背景", en: "GREEN PLATE", tools: [["Seedream"]], cap: "キャラだけを、緑の上に描き直す" },
    { jp: "動かす", en: "ANIMATE", tools: [["Kling 3.0"]], cap: "緑の上で、15秒うごいてもらう" },
    { jp: "切り抜く", en: "KEY OUT", tools: [["Python"], ["ffmpeg"]], cap: "緑だけを消して、透明に" },
    { jp: "組み立て", en: "COMPOSE", tools: [["HTML"], ["CSS"], ["JavaScript"]], cap: "背景・路線図・文字・キャラを重ねる" },
    { jp: "音", en: "SOUND", tools: [["Web Audio API"]], cap: "音も、コードで鳴らす" },
    { jp: "書き出し", en: "EXPORT", tools: [["Playwright"], ["ffmpeg"]], cap: "1コマずつ撮って、450枚をMP4に" },
  ];
  const TOOL_LINE = ["キービジュアル 1枚", "Seedream", "Kling 3.0", "Python + ffmpeg", "HTML / CSS / JS", "Web Audio API", "Playwright + ffmpeg"];
  // the soundtrack is the MV's; `making` swaps the MV's foley for these cues
  const CUES = { catch: 8.15, making: { steps: STEP_T, recap: RECAP, out: OUT_T } };

  // ---------------------------------------------------------------- helpers
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  function h(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function s(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const img = (src, parent, cls = "") => { const e = h("img", cls, parent); e.src = src; e.alt = ""; return e; };
  const at = (e, x, y, w, hh) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w) e.style.width = w + "px"; if (hh) e.style.height = hh + "px"; return e; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    lin: (p) => p,
    out: (p) => 1 - (1 - p) ** 3,
    outQ: (p) => 1 - (1 - p) ** 5,
    in: (p) => p ** 3,
    io: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    back: (p) => 1 + 2.9 * (p - 1) ** 3 + 1.9 * (p - 1) ** 2,
  };
  const seg = (t, a, b, e = E.lin) => e(clamp((t - a) / (b - a)));
  const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const WHITE = "#fdfdf8", PINK = "#fb6c78", LIME = "#62c20c";
  const A = (f) => "assets/making/" + f;

  const stage = $("stage"), world = $("world"), wsvg = $("world-svg"), demo = $("demo"), info = $("info"), hud = $("hud");
  const typo = window.KoiTypo({ h, E, clamp, lerp, rng, BEAT, musicIn: MUSIC_IN, layer: $("type") });
  const { lyric, beatPulse, barPulse } = typo;
  const EN = "'Nunito', sans-serif";

  // ---------------------------------------------------------------- the line
  // world coordinates: station i sits at (i * GAP, 0); #world is scaled and moved as a camera
  const GAP = 600;
  const line = s("path", { d: `M-500 0 H${6 * GAP + 500}`, fill: "none", stroke: WHITE, "stroke-width": 16, "stroke-linecap": "round" }, wsvg);
  const LINE_LEN = 7 * GAP;
  line.style.strokeDasharray = LINE_LEN;
  for (let x = -420; x < 6 * GAP + 420; x += 150) s("path", { d: `M${x - 5} -8 L${x + 5} 0 L${x - 5} 8`, fill: "none", stroke: LIME, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, wsvg);
  const stations = STEPS.map((st, i) => {
    const g = s("g", {}, wsvg);
    const ripple = s("circle", { cx: i * GAP, cy: 0, r: 20, fill: "none", stroke: WHITE, "stroke-width": 6, opacity: 0 }, g);
    const node = s("g", {}, g);
    s("circle", { cx: i * GAP, cy: 0, r: 21, fill: WHITE }, node);
    const core = s("circle", { cx: i * GAP, cy: 0, r: 9, fill: LIME }, node);
    s("path", { d: `M${i * GAP} 21 V34`, stroke: WHITE, "stroke-width": 5 }, node);
    const box = h("div", "station", world);
    h("b", "", box, st.jp); h("i", "", box, st.en);
    at(box, i * GAP, 34);
    return { g, ripple, node, core, box, x: i * GAP };
  });
  const marker = s("use", { href: "#i-heart", width: 46, height: 46, fill: PINK }, wsvg);

  // camera: overview → dive into station 1 → ride the line → pull back out
  const pos = (t) => STEP_T.slice(1).reduce((p, t0) => p + seg(t, t0 - 0.16, t0 + 0.2, E.io), 0);
  function camera(t) {
    const OV = { x: 330, y: 610, k: 0.42 }, END = { x: 330, y: 905, k: 0.42 };
    const ride = { x: 360 - GAP * pos(t), y: 930, k: 1 };
    const zi = seg(t, 1.2, 1.55, E.io), zo = seg(t, 12.52, 13.02, E.io);
    const mix = (a, b, q) => ({ x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), k: lerp(a.k, b.k, q) });
    // while zooming, keep the zoom centred on the station in view
    const into = { x: lerp(OV.x, ride.x, zi), y: lerp(OV.y, ride.y, zi), k: lerp(OV.k, 1, zi) };
    return zo > 0 ? mix(ride, END, zo) : into;
  }

  // ---------------------------------------------------------------- per-step headings
  STEPS.forEach((st, i) => {
    const t0 = STEP_T[i], out = t0 + STEP_LEN - 0.14;
    lyric({ lines: ["0" + (i + 1)], x: 100, y: 118, lh: 0, size: 196, font: EN, cls: "outline", style: "slam", t0: t0 + 0.02, stagger: 0.05, dur: 0.24, out: [out], outStyle: "up", outDur: 0.16 });
    lyric({ lines: [st.jp], x: 108, y: 336, lh: 0, size: 96, spacing: 0.04, style: "pop", t0: t0 + 0.1, stagger: 0.05, dur: 0.26, out: [out + 0.02], outStyle: "up", outDur: 0.16 });
    lyric({ lines: [st.en], x: 114, y: 452, lh: 0, size: 26, font: EN, spacing: 0.26, style: "type", t0: t0 + 0.18, stagger: 0.016, out: [out + 0.02], outStyle: "fade", outStagger: 0, outDur: 0.12 });
    lyric({ lines: [st.cap], x: 112, y: 636, lh: 0, size: 34, spacing: 0.03, style: "rise", t0: t0 + 0.34, stagger: 0.016, dur: 0.24, out: [out + 0.03], outStyle: "up", outStagger: 0.003, outDur: 0.15 });
    const row = at(h("div", "chiprow", info), 110, 534);
    st.chips = st.tools.map(([name, kind], j) => h("div", "chip" + (kind ? " " + kind : "") + (j === 0 ? " pink" : ""), row, name));
  });

  // ---------------------------------------------------------------- demos
  const panels = STEP_T.map(() => h("div", "panel", demo));
  // 01 key visual: the single image everything starts from
  const d1 = panels[0];
  const refCard = at(h("div", "card", d1), 740, 150, 1040, 585); img(A("ref.jpg"), refCard);
  const scan = at(h("div", "scan", d1), 740, 150, 1040, 8);
  const crops = [[0, 0, "Top", "Left"], [1, 0, "Top", "Right"], [0, 1, "Bottom", "Left"], [1, 1, "Bottom", "Right"]].map(([cx, cy, v, hz]) => {
    const c = at(h("div", "crop", d1), 740 - 30 + cx * (1040 + 14), 150 - 30 + cy * (585 + 14));
    c.style["border" + v + "Width"] = "8px"; c.style["border" + hz + "Width"] = "8px";
    return c;
  });
  const d1svg = s("svg", { width: 1920, height: 1080 }, d1); d1svg.style.position = "absolute";
  const ring1 = s("circle", { cx: 1262, cy: 442, r: 252, fill: "none", stroke: PINK, "stroke-width": 10, "stroke-linecap": "round", transform: "rotate(-90 1262 442)" }, d1svg);
  const RING1 = 2 * Math.PI * 252; ring1.style.strokeDasharray = RING1;
  const d1pill = at(h("div", "pill en", d1, "KEY VISUAL"), 760, 116);

  // 02 green plate: the girl redrawn alone on flat green
  const d2 = panels[1];
  const beforeCard = at(h("div", "card", d2), 700, 330, 440, 248); img(A("ref.jpg"), beforeCard);
  const afterCard = at(h("div", "card", d2), 1240, 245, 600, 338);
  img(A("ref.jpg"), afterCard); const plate = img(A("plate.jpg"), afterCard);
  const d2svg = s("svg", { width: 1920, height: 1080 }, d2); d2svg.style.position = "absolute";
  const arrow = s("path", { d: "M1160 454 H1222 M1204 436 L1224 454 L1204 472", fill: "none", stroke: PINK, "stroke-width": 12, "stroke-linecap": "round", "stroke-linejoin": "round" }, d2svg);
  const ARROW = arrow.getTotalLength(); arrow.style.strokeDasharray = ARROW;
  const d2chip = at(h("div", "pill en", d2, "Seedream"), 1118, 380);
  const sr = rng(4);
  const sparks = Array.from({ length: 9 }, (_, i) => {
    const g = s("g", {}, d2svg);
    if (i % 2) s("path", { d: "M-14 0H14M0 -14V14", stroke: WHITE, "stroke-width": 6, "stroke-linecap": "round" }, g);
    else s("use", { href: "#i-heart", x: -14, y: -14, width: 28, height: 28, fill: PINK }, g);
    return { g, x: 1240 + sr() * 600, y: 230 + sr() * 360, d: sr() * 0.2 };
  });

  // 03 animate: a prompt goes in, a moving take comes out
  const d3 = panels[2];
  const PROMPT = "左を向いたまま歩く\nハートがふわっと浮かぶ\nジャンプしてキャッチ";
  const bubble = at(h("div", "bubble", d3), 760, 96);
  const bubbleText = h("span", "", bubble); const bcaret = h("span", "caret", bubble);
  const d3pill = at(h("div", "pill en", d3, "Kling 3.0"), 1180, 84);
  const film = at(h("div", "film", d3), 700, 430, 1120, 330);
  at(h("div", "holes", film), 0, 8); at(h("div", "holes", film), 0, 290);
  const track = h("div", "track", film);
  for (let i = 0; i < 8; i++) at(img(A(`film_${i}.jpg`), track), i * 430, 0);
  const d3badge = at(h("div", "pill en", d3, "15s  1080p"), 1640, 404);

  // 04 key out: green on the right of the line, transparent on the left
  const d4 = panels[3];
  const keyCard = at(h("div", "card", d4), 760, 140, 1000, 562);
  h("div", "checker", keyCard); img(A("key_cut.png"), keyCard);
  const green = img(A("key_green.jpg"), keyCard);
  const kscan = at(h("div", "scan", d4), 760, 140, 8, 562);
  const pBefore = at(h("div", "pill white", d4, "元の映像"), 1620, 112);
  const pAfter = at(h("div", "pill", d4, "切り抜き後"), 780, 112);
  const maskCard = at(h("div", "card", d4), 1500, 640, 300, 169); img(A("key_mask.png"), maskCard);
  const pMask = at(h("div", "pill", d4, "マスク"), 1520, 616);

  // 05 compose: the MV's real layers pulled apart, then pressed back into one frame
  const d5 = panels[4];
  const s3 = at(h("div", "scene3d", d5), 740, 110, 1040, 740);
  const stack = h("div", "stack", s3);
  const LAYERS = [["bg", "背景"], ["routes", "路線図"], ["type", "文字"], ["girl", "キャラ"], ["lyrics", "リリック"]];
  const planes = LAYERS.map(([f, label]) => {
    const p = h("div", "plane", stack);
    img(A(`layer_${f}.png`), p); h("div", "frame", p);
    return { p, pill: h("div", "pill", p, label) };
  });
  const code = at(h("div", "code", d5), 110, 700);
  const CODE = ["function render(t) {", "  cam.x = camX(t);", "  girl.seek(clipTime(t));", "  lyrics.draw(t);", "}"];
  const codeLines = CODE.map(() => h("div", "", code));
  const byChip = at(h("div", "pill en by", code, "Claude Code"), 0, 0);
  byChip.style.left = "auto";

  // 06 sound: the actual arrangement as a piano roll, scrolling under a playhead
  const d6 = panels[5];
  const roll = at(h("div", "roll", d6), 740, 140, 1080, 470);
  const LANES = ["DRUMS", "BASS", "KEYS", "BELL"];
  LANES.forEach((n, i) => { const l = at(h("div", "lane", roll), 0, 22 + i * 110); h("b", "", l, n); });
  const rtrack = h("div", "track", roll);
  const PPS = 330, HEAD = 400;
  const PROG = ["G", "G", "G", "A", "Fm", "Bm", "G", "A", "Bm", "G", "Em", "Asus", "G", "A", "D", "D"];
  const ROOT = { G: 7, A: 9, Fm: 6, Bm: 11, Em: 4, Asus: 9, D: 2 };
  const notes = [];
  const note = (t, lane, y, w, hgt) => { const n = at(h("div", "note", rtrack), 150 + t * PPS, 22 + lane * 110 + y, w, hgt); notes.push({ n, t }); };
  for (let b = 4; b < 26; b++) { const t = b * BEAT; note(t, 0, b % 2 ? 18 : 58, 26, 26); note(t + BEAT / 2, 0, 44, 12, 12); }
  for (let hb = 1; hb < 13; hb++) {
    const t = hb * 2 * BEAT, r = ROOT[PROG[hb]];
    for (let e = 0; e < 4; e++) note(t + e * BEAT / 2, 1, 76 - r * 5 - (e % 2) * 12, 50, 14);
    for (const off of [0, 0.75, 1.5]) for (let k = 0; k < 3; k++) note(t + off * BEAT, 2, 70 - (r + k * 4) % 12 * 5, off === 1.5 ? 80 : 44, 12);
  }
  STEP_T.forEach((t, i) => note(t + 0.05, 3, 70 - i * 9, 36, 18));
  RECAP.forEach((t, i) => note(t, 3, 70 - i * 9, 20, 14));
  at(h("div", "head", roll), HEAD, 0);
  const bpm = at(h("div", "chip pink", d6, "128 BPM"), 1600, 104);
  const er = rng(9);
  const EQ = Array.from({ length: 24 }, (_, i) => ({ e: at(h("div", "eq", d6), 760 + i * 44, 640, 22, 150), k: 0.3 + er() * 0.7, ph: er() * 6 }));

  // 07 export: every frame shot, stacked, and pressed into one file
  const d7 = panels[6];
  const counter = at(h("div", "counter", d7), 760, 150);
  const cnum = h("span", "", counter); h("small", "", counter, "/ 0450 FRAMES");
  const thumbs = Array.from({ length: 14 }, (_, j) => ({ e: at(img(A(`mv_${String(j * 2).padStart(2, "0")}.jpg`), d7, "thumb"), 0, 0), j }));
  const file = at(h("div", "file", d7), 1300, 300);
  const fsvg = s("svg", { viewBox: "0 0 92 70" }, file);
  s("rect", { x: 3, y: 3, width: 86, height: 64, rx: 10, fill: "none", stroke: "#fb6c78", "stroke-width": 6 }, fsvg);
  s("path", { d: "M38 22 L60 35 L38 48 Z", fill: "#fb6c78" }, fsvg);
  h("b", "", file, "MP4");
  const spec = at(h("div", "spec", d7), 1236, 700, null); spec.textContent = "1920×1080  ・  30fps  ・  15s";

  // ---------------------------------------------------------------- intro + outro type
  lyric({ lines: ["HOW IT'S MADE"], x: 108, y: 112, lh: 0, size: 112, font: EN, spacing: 0.02, style: "slam", dur: 0.22, stagger: 0.02,
    segs: [[0, 0.15], [4, 0.27], [9, 0.4]], out: [1.02], outStyle: "up", outStagger: 0.008, outDur: 0.2 });
  lyric({ lines: ["恋する乙女のラブソング", "ができるまで"], x: 112, y: 262, lh: 84, size: 64, spacing: 0.04, style: "pop",
    t0: 0.42, stagger: 0.022, out: [1.06], outStyle: "up", outStagger: 0.006, outDur: 0.18 });
  lyric({ lines: ["HOW IT'S MADE"], x: 108, y: 150, lh: 0, size: 96, font: EN, spacing: 0.02, style: "slam", t0: 12.74, stagger: 0.025, dur: 0.22 });
  lyric({ lines: ["恋する乙女のラブソング", "ができるまで"], x: 112, y: 286, lh: 86, size: 66, spacing: 0.04, style: "pop", t0: 12.86, stagger: 0.02 });
  const built = at(h("div", "chip pink", info, "Built with Claude Code"), 112, 500);
  const player = at(h("div", "player", info), 1080, 176, 740, 416);
  const pcard = h("div", "card", player);
  const flip = img(A("mv_00.jpg"), pcard);
  const npPill = at(h("div", "pill en", info, "NOW PLAYING ▶"), 1080, 128);
  const toolNames = TOOL_LINE.map((n, i) => h("div", "toolname", info, n));

  // ---------------------------------------------------------------- background life
  const bignum = h("div", "bignum", $("bignum"));
  const bgfx = $("bgfx");
  const shr = rng(77);
  const SHAPES = Array.from({ length: 22 }, (_, i) => {
    const g = s("g", {}, bgfx);
    if (i % 3 === 0) s("circle", { r: 9, fill: "none", stroke: WHITE, "stroke-width": 4 }, g);
    else if (i % 3 === 1) s("path", { d: "M-10 0H10M0 -10V10", stroke: WHITE, "stroke-width": 4, "stroke-linecap": "round" }, g);
    else s("use", { href: "#i-heart", x: -11, y: -11, width: 22, height: 22, fill: PINK }, g);
    return { g, x: 60 + shr() * 1800, y: 60 + shr() * 820, beat: Math.floor(shr() * 24) };
  });
  const tick = h("div", "ticker", hud, "MAKING OF ・ HOW IT'S MADE ・ 恋する乙女のラブソング ・ YOSHINA LOVE SONG ・ ".repeat(8));
  const wipe = h("div", "wipe", $("wipes"));
  const bars = Array.from({ length: 7 }, (_, i) => { const b = h("div", "bar", wipe); b.style.background = i % 2 ? PINK : WHITE; b.style.top = i * 160 - 40 + "px"; return b; });

  (function grain() {
    const c = $("grain"), g = c.getContext("2d"), im = g.createImageData(c.width, c.height), r = rng(3);
    for (let i = 0; i < im.data.length; i += 4) {
      const n = 255 - r() * 30 - (r() < 0.012 ? 30 : 0);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = n; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const v = g.createRadialGradient(480, 270, 180, 480, 270, 620);
    v.addColorStop(0, "rgba(255,255,255,0)"); v.addColorStop(1, "rgba(150,170,120,0.55)");
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
  })();

  // ---------------------------------------------------------------- render
  const tf = (x, y, extra = "") => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${extra}`;
  const popAt = (t, t0, d = 0.3) => seg(t, t0, t0 + d, E.back);

  function render(t) {
    t = clamp(t, 0, DUR);
    const bp = beatPulse(t), bar = barPulse(t);
    const stepIdx = STEP_T.findIndex((t0, i) => t >= t0 && t < (STEP_T[i + 1] ?? OUT_T));
    typo.render(t);

    // camera and the line
    const cam = camera(t);
    world.style.transform = `translate(${cam.x.toFixed(1)}px,${cam.y.toFixed(1)}px) scale(${cam.k.toFixed(4)})`;
    line.style.strokeDashoffset = LINE_LEN * (1 - seg(t, 0.12, 0.85, E.io));
    stations.forEach((st, i) => {
      const lit = t >= STEP_T[i] + 0.05, ap = popAt(t, 0.4 + i * 0.06);
      const rc = RECAP[i], dt = t - STEP_T[i] - 0.05;
      const k = Math.max(lit ? Math.exp(-dt * 6) : 0, t >= rc ? Math.exp(-(t - rc) * 7) : 0);
      st.node.setAttribute("transform", `translate(${st.x} 0) scale(${(ap * (1 + 0.25 * k)).toFixed(3)}) translate(${-st.x} 0)`);
      st.core.setAttribute("fill", lit ? PINK : LIME);
      st.core.setAttribute("r", lit ? 10 + 3 * bp : 9);
      st.box.style.transform = `translate(-50%,0) scale(${(ap * (1 + 0.14 * k)).toFixed(3)})`;
      st.box.style.background = lit ? PINK : ""; st.box.style.color = lit ? WHITE : "";
      const rt = t >= rc ? (t - rc) / 0.5 : lit ? dt / 0.5 : 1;
      st.ripple.setAttribute("r", 21 + clamp(rt) * 70); st.ripple.setAttribute("opacity", rt < 1 ? (1 - clamp(rt)).toFixed(3) : 0);
    });
    const mp = pos(t);
    marker.setAttribute("x", mp * GAP - 23); marker.setAttribute("y", -92 - 10 * bp);
    marker.setAttribute("opacity", seg(t, 1.3, 1.55) * (1 - seg(t, 12.52, 12.7)));

    // headings: chips follow the step in view
    STEPS.forEach((st, i) => st.chips.forEach((c, j) => {
      const t0 = STEP_T[i] + 0.26 + j * 0.07, out = STEP_T[i] + STEP_LEN - 0.14;
      const q = popAt(t, t0), o = seg(t, out, out + 0.14);
      c.style.opacity = (clamp(q * 2) * (1 - o)).toFixed(3);
      c.style.transform = tf(0, (1 - q) * 20 - o * 30, ` scale(${(0.6 + 0.4 * q).toFixed(3)})`);
    }));

    // demo panels slide in from the right and out to the left, like the line
    panels.forEach((p, i) => {
      const t0 = STEP_T[i], inQ = seg(t, t0 - 0.05, t0 + 0.28, E.out), outQ = seg(t, t0 + STEP_LEN - 0.18, t0 + STEP_LEN, E.in);
      const on = t >= t0 - 0.05 && t < t0 + STEP_LEN;
      p.style.display = on ? "" : "none";
      p.style.opacity = (inQ * (1 - outQ)).toFixed(3);
      p.style.transform = tf((1 - inQ) * 180 - outQ * 240, 0);
    });
    const L = (i) => t - STEP_T[i];

    // 01
    { const l = L(0), d = popAt(t, STEP_T[0], 0.4);
      refCard.style.transform = tf(0, (1 - d) * -70, ` rotate(${((1 - d) * -4).toFixed(2)}deg) scale(${lerp(0.9, 1, d).toFixed(3)})`);
      const sq = seg(l, 0.35, 0.95, E.io);
      scan.style.top = (150 + 585 * sq).toFixed(1) + "px"; scan.style.opacity = bump(l, 0.3, 1.0).toFixed(3);
      crops.forEach((c, i) => { const q = popAt(t, STEP_T[0] + 0.25 + i * 0.04); c.style.opacity = q; c.style.transform = `scale(${(0.4 + 0.6 * q).toFixed(3)})`; });
      ring1.style.strokeDashoffset = RING1 * (1 - seg(l, 0.95, 1.3, E.io));
      const pq = popAt(t, STEP_T[0] + 0.3); d1pill.style.transform = `scale(${pq.toFixed(3)})`; }

    // 02
    { const l = L(1);
      const aq = seg(l, 0.25, 0.45, E.io); arrow.style.strokeDashoffset = ARROW * (1 - aq);
      const r = seg(l, 0.45, 0.95, E.io); plate.style.clipPath = `circle(${(r * 78).toFixed(1)}% at 52% 45%)`;
      afterCard.style.transform = `scale(${(1 + 0.03 * bump(l, 0.9, 1.2)).toFixed(3)})`;
      d2chip.style.transform = `scale(${popAt(t, STEP_T[1] + 0.3).toFixed(3)})`;
      sparks.forEach((p) => { const q = seg(l, 0.95 + p.d, 1.35 + p.d); p.g.setAttribute("transform", `translate(${p.x} ${p.y - q * 40}) scale(${(bump(l, 0.95 + p.d, 1.35 + p.d) * 1.2).toFixed(3)})`); }); }

    // 03
    { const l = L(2), n = Math.round([...PROMPT].length * seg(l, 0.12, 0.72));
      bubbleText.textContent = [...PROMPT].slice(0, n).join("");
      bcaret.style.opacity = l < 0.8 || Math.floor(t * 8) % 2 ? 1 : 0;
      bubble.style.transform = `scale(${popAt(t, STEP_T[2] - 0.02).toFixed(3)})`; bubble.style.transformOrigin = "60px 100%";
      d3pill.style.transform = `scale(${popAt(t, STEP_T[2] + 0.2).toFixed(3)})`;
      track.style.transform = tf(60 - l * 1250, 0);
      d3badge.style.transform = `scale(${popAt(t, STEP_T[2] + 0.5).toFixed(3)})`; }

    // 04
    { const l = L(3), sw = seg(l, 0.25, 1.1, E.io);
      green.style.clipPath = `inset(0 0 0 ${(sw * 100).toFixed(2)}%)`;
      kscan.style.left = (760 + 1000 * sw - 4).toFixed(1) + "px"; kscan.style.opacity = bump(l, 0.2, 1.18).toFixed(3);
      pBefore.style.transform = `scale(${popAt(t, STEP_T[3] + 0.2).toFixed(3)})`;
      pAfter.style.transform = `scale(${popAt(t, STEP_T[3] + 0.6).toFixed(3)})`;
      const mq = popAt(t, STEP_T[3] + 1.0); maskCard.style.transform = `scale(${mq.toFixed(3)})`; pMask.style.transform = `scale(${popAt(t, STEP_T[3] + 1.08).toFixed(3)})`; }

    // 05
    { const l = L(4), ex = seg(l, 0.08, 0.5, E.io) * (1 - seg(l, 1.05, 1.45, E.io));
      stack.style.transform = `rotateX(${(56 * ex).toFixed(2)}deg) rotateZ(${(-34 * ex).toFixed(2)}deg) scale(${lerp(1, 0.86, ex).toFixed(3)})`;
      planes.forEach((p, i) => {
        p.p.style.transform = `translateZ(${(i * 118 * ex).toFixed(1)}px)`;
        p.p.style.background = `rgba(253,253,248,${(0.14 * ex).toFixed(3)})`; // sheets read apart, vanish when pressed together
        const q = ex > 0.6 ? popAt(t, STEP_T[4] + 0.42 + i * 0.07, 0.25) : 0;
        p.pill.style.opacity = clamp((ex - 0.5) * 3) * q; p.pill.style.transform = `scale(${q.toFixed(3)})`;
      });
      const shown = Math.floor(CODE.join("").length * seg(l, 0.35, 1.25));
      let left = shown;
      codeLines.forEach((e, i) => {
        const txt = CODE[i].slice(0, Math.max(0, left)); left -= CODE[i].length;
        e.innerHTML = txt.replace(/function/, '<span class="kw">function</span>').replace(/(camX|clipTime|seek|draw|render)/g, '<span class="fn">$1</span>') || "&nbsp;";
      });
      code.style.transform = tf(0, (1 - popAt(t, STEP_T[4] + 0.25)) * 40); code.style.opacity = seg(l, 0.2, 0.4) * (1 - seg(l, 1.45, 1.6));
      byChip.style.transform = `scale(${popAt(t, STEP_T[4] + 0.5).toFixed(3)})`; }

    // 06
    { rtrack.style.transform = tf(HEAD - 150 - t * PPS, 0);
      for (const nn of notes) nn.n.classList.toggle("on", t >= nn.t && t < nn.t + 0.14);
      bpm.style.transform = `scale(${(1 + 0.12 * bp).toFixed(3)})`;
      EQ.forEach((q) => { const v = 0.18 + 0.82 * q.k * (0.35 + 0.65 * bp) * (0.6 + 0.4 * Math.sin(t * 9 + q.ph)); q.e.style.transform = `scaleY(${v.toFixed(3)})`; }); }

    // 07
    { const l = L(6);
      cnum.textContent = String(Math.round(450 * seg(l, 0.05, 1.15))).padStart(4, "0");
      const press = seg(l, 1.12, 1.3, E.in);
      thumbs.forEach(({ e, j }) => {
        const q = seg(l, 0.1 + j * 0.06, 0.34 + j * 0.06, E.out);
        const x = lerp(1960, 1180 + j * 7, q), y = lerp(260, 330 - j * 6, q), r = (j % 2 ? 1 : -1) * (2 + (j % 5));
        e.style.opacity = (q > 0 ? 1 : 0) * (1 - press);
        e.style.transform = tf(lerp(x, 1330, press), lerp(y, 420, press), ` rotate(${(r * (1 - press)).toFixed(1)}deg) scale(${lerp(1, 0.3, press).toFixed(3)})`);
      });
      const fq = popAt(t, STEP_T[6] + 1.22, 0.3); file.style.transform = `scale(${fq.toFixed(3)}) rotate(${((1 - fq) * -10).toFixed(1)}deg)`; file.style.opacity = fq > 0 ? 1 : 0;
      spec.style.opacity = seg(l, 1.3, 1.45); }

    // outro: the finished MV plays, the whole line is lit, tools listed under each stop
    const endOn = t >= 12.7;
    built.style.opacity = endOn ? 1 : 0; built.style.transform = `scale(${popAt(t, 13.2).toFixed(3)})`;
    const pq = popAt(t, 12.8, 0.4);
    player.style.opacity = clamp(pq * 2); player.style.transform = tf(0, (1 - pq) * 60, ` scale(${lerp(0.85, 1, pq).toFixed(3)})`);
    flip.src = A(`mv_${String(clamp(Math.floor((t - 12.8) * 12), 0, 29)).padStart(2, "0")}.jpg`);
    npPill.style.transform = `scale(${popAt(t, 13.0).toFixed(3)})`;
    toolNames.forEach((e, i) => {
      const q = popAt(t, 13.1 + i * 0.04);
      e.style.left = (330 + i * GAP * 0.42) + "px"; e.style.top = "985px";
      e.style.opacity = clamp(q * 2); e.style.transform = `translateX(-50%) translateY(${((1 - q) * 16).toFixed(1)}px)`;
    });

    // background: a giant outline number for the step in view, shapes on the beat, ticker, one stripe wipe
    bignum.textContent = stepIdx >= 0 ? "0" + (stepIdx + 1) : "";
    const bq = stepIdx >= 0 ? seg(t, STEP_T[stepIdx], STEP_T[stepIdx] + 0.4, E.out) : 0;
    bignum.style.transform = tf(1240 - bq * 120 - (t - (STEP_T[stepIdx] || 0)) * 40, 90, ` scale(${(1 + 0.01 * bar).toFixed(4)})`);
    bignum.style.opacity = bq;
    SHAPES.forEach((p) => {
      const b = t < MUSIC_IN ? -1 : Math.floor((t - MUSIC_IN) / BEAT);
      const on = b >= 0 && t < 12.6 && (b + p.beat) % 6 < 1;
      const q = on ? ((t - MUSIC_IN) / BEAT) % 1 : 0;
      const sc = on ? E.back(clamp(q * 3)) * (1 - E.in(clamp((q - 0.6) * 2.5))) : 0;
      p.g.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${sc.toFixed(3)}) rotate(${(t * 90) % 360})`);
    });
    tick.style.opacity = seg(t, 0.2, 0.5);
    tick.style.transform = `translateX(${(-2400 + ((t * 70) % 1200)).toFixed(1)}px)`;
    const wq = (t - 7.62) / 0.42;
    wipe.style.display = wq > 0 && wq < 1 ? "" : "none";
    if (wq > 0 && wq < 1) bars.forEach((b, i) => { const k = clamp(wq * 1.6 - i * 0.07); b.style.transform = `translateX(${lerp(-2400, 2400, E.io(k)).toFixed(1)}px) skewX(-18deg)`; });
  }

  // ---------------------------------------------------------------- boot + player
  const params = new URLSearchParams(location.search);
  const renderMode = params.has("render");
  if (renderMode) document.body.classList.add("render");
  function fit() {
    if (renderMode) { stage.style.transform = "none"; return; }
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * k) / 2}px,${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
  }
  addEventListener("resize", fit);
  fit();

  const imgs = [...document.images].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })));
  // every flip-book frame is fetched up front so the player never swaps to an unloaded image
  const flips = Array.from({ length: 30 }, (_, i) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = A(`mv_${String(i).padStart(2, "0")}.jpg`); }));
  const fonts = ['900 60px "Zen Maru Gothic"', '700 60px "Zen Maru Gothic"', '900 30px "Nunito"', '800 30px "Nunito"', '500 30px "DM Mono"']
    .map((f) => document.fonts.load(f, "恋あLINE0"));
  const ready = Promise.all([...imgs, ...flips, ...fonts, document.fonts.ready]);
  window.MV = { DUR, CUES, render, renderAsync: async (t) => render(t), ready, fps: 30 };

  const still = params.get("t");
  ready.then(() => render(still != null ? parseFloat(still) : 13.9));
  if (renderMode || still != null) { $("ui").classList.add("hidden"); return; }

  let ctx = null, raf = 0;
  const ui = $("ui"), label = $("play").querySelector("span");
  function play() {
    ui.classList.add("hidden");
    ctx && ctx.close();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const start = ctx.currentTime + 0.12;
    window.KoiAudio.schedule(ctx, ctx.destination, start, CUES);
    cancelAnimationFrame(raf);
    const loop = () => {
      const t = ctx.currentTime - start;
      render(Math.max(0, t));
      if (t < DUR + 0.2) raf = requestAnimationFrame(loop);
      else { label.textContent = "REPLAY"; ui.classList.remove("hidden"); }
    };
    loop();
  }
  ui.addEventListener("click", () => ready.then(play));
  addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); ready.then(play); } });
})();
