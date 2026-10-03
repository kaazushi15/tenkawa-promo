/* HOW IT'S MADE — a 30 s making-of for the Étoile spot, in the spot's own style.
 * The production pipeline is a transit line: the camera rides from station to station and
 * each stop demonstrates one step with the real production files. A star (étoile) rides along.
 * Like mv.js, everything is a pure function of time: render(t). 128 BPM, 16 bars = 30.0 s. */
(() => {
  "use strict";

  const DUR = 30, BEAT = 60 / 128;
  const STEP_LEN = 6 * BEAT;                                   // each step gets a bar and a half
  const STEP_T = Array.from({ length: 8 }, (_, i) => +(4 * BEAT + i * STEP_LEN).toFixed(4));
  const OUT_T = 52 * BEAT, FINAL = 60 * BEAT;                  // 24.375 s outro, 28.125 s last chord
  const RECAP = STEP_T.map((_, i) => OUT_T + 0.25 + i * 0.06);
  const STEPS = [
    { jp: "原画", en: "KEY VISUAL", tools: ["Claude Code"], cap: "画像の文字を、ぜんぶ書き出す" },
    { jp: "切り抜き", en: "CUT OUT", tools: ["Python"], cap: "女性だけを切り抜いて、緑の上へ" },
    { jp: "動かす", en: "ANIMATE", tools: ["MiniMax H3"], cap: "緑の上で、15秒歩いてもらう" },
    { jp: "キー抜き", en: "KEY OUT", tools: ["Python", "ffmpeg"], cap: "緑を消して、透明に" },
    { jp: "構成", en: "STORYBOARD", tools: ["Claude Code"], cap: "1小節＝1シーン。8シーンで15秒" },
    { jp: "組み立て", en: "COMPOSE", tools: ["HTML", "CSS", "JavaScript"], cap: "背景・路線図・文字・キャラを重ねる" },
    { jp: "音", en: "SOUND", tools: ["Web Audio API"], cap: "曲も効果音も、コードで鳴らす" },
    { jp: "書き出し", en: "EXPORT", tools: ["Playwright", "ffmpeg"], cap: "1コマずつ撮って、450枚をMP4に" },
  ];
  const TOOL_LINE = ["Claude Code", "Python", "MiniMax H3", "Python + ffmpeg", "Claude Code", "HTML / CSS / JS", "Web Audio API", "Playwright + ffmpeg"];
  // every line of text in the key visual (the inventory the spot was built from)
  const INVENTORY = [
    "9月から始まる、12月のクリスマスに向けた、険しいダイエットの旅。", "恋する乙女は、", "痩せて", "最高の", "私へ。",
    "START", "9.01", "今日から", "私の未来が", "変わりはじめる。",
    "誘惑", "スイーツ／チョコ", "夜更かし／お酒", "わかってるけど、", "やめられない。",
    "停滞期", "頑張ってるのに", "体重が減らない。", "心が折れそう。",
    "食事制限", "カロリー計算に疲れた。", "ストレスで", "また食べてしまう。",
    "運動が続かない", "三日坊主で終わってばかり。", "私には無理なのかな。",
    "周りの目", "SNSのキラキラ投稿。", "比べちゃう自分が", "つらい。",
    "体重", "数字に一喜一憂。", "昨日より増えてると、", "落ち込む。",
    "むくみ", "顔も脚もパンパン…", "今日の自分、", "好きになれない。",
    "自己嫌悪", "また食べちゃった。", "なんで私って", "こうなんだろう。",
    "リバウンド不安", "痩せても維持できるか、", "いつも不安で", "いっぱい。",
    "わたしをあきらめない。", "この一歩が、未来を変える。",
    "次の駅は、", "理想の私。", "一緒に、乗り越えよう。",
    "GOAL", "12.25", "X'mas", "最高の笑顔で", "大切な人と特別な日を。",
    "女性専用パーソナルジム", "Étoile", "エトワール", "わたし史上、いちばん輝くために。",
    "完全女性専用", "安心の", "プライベート空間", "パーソナル指導", "あなたに合わせた", "オーダーメイド",
    "食事サポート", "無理なく続ける", "食習慣づくり", "手ぶらOK", "レンタル・アメニティ", "完備",
    "心斎橋駅 徒歩5分", "梅田駅 徒歩7分", "女性トレーナーのみ在籍", "無料カウンセリング受付中",
    "DIET JOURNEY", "for the best me.", "MY FUTURE IS MINE.", "ETOILE GYM",
  ];
  // where that text sits on the poster (2000 × 1125 px), for the boxes that pop over it
  const BOXES = [[20, 20, 800, 58], [20, 78, 650, 205], [20, 205, 930, 565], [250, 590, 625, 745], [445, 745, 800, 935],
    [28, 598, 160, 760], [70, 845, 470, 1000], [70, 1022, 765, 1098], [895, 78, 1022, 205], [980, 248, 1112, 358],
    [748, 472, 930, 582], [708, 622, 912, 712], [718, 748, 862, 860], [1188, 1018, 1452, 1082], [1740, 42, 1945, 212],
    [1538, 178, 1700, 292], [1565, 342, 1722, 452], [1570, 532, 1722, 648], [1680, 672, 1862, 788], [1860, 308, 1968, 612],
    [1758, 838, 1978, 1078], [1048, 448, 1160, 580]];
  const CUES = { dur: DUR, makingEtoile: { steps: STEP_T, outro: OUT_T, final: FINAL, recap: RECAP, boxes: BOXES.length } };

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
    sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
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
  const tf = (x, y, extra = "") => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${extra}`;
  const popAt = (t, t0, d = 0.3) => seg(t, t0, t0 + d, E.back);
  const WHITE = "#fffafa", MAGENTA = "#cb2267", BLUSH = "#f7b6cf", NAVY = "#1c2142";
  const A = (f) => "assets/making/" + f;
  const EN = "Montserrat";

  const stage = $("stage"), world = $("world"), wsvg = $("world-svg"), demo = $("demo"), info = $("info");
  const typo = window.KoiTypo({ h, E, clamp, lerp, rng, BEAT, musicIn: 4 * BEAT, layer: $("type") });
  const { beatPulse, barPulse } = typo;
  const lyric = (o) => typo.lyric({ lh: o.size * 1.25, ...o });

  // ---------------------------------------------------------------- the production line
  const GAP = 640, LINE_Y = 950;
  const line = s("path", { d: `M-560 0 H${7 * GAP + 560}`, fill: "none", stroke: WHITE, "stroke-width": 16, "stroke-linecap": "round" }, wsvg);
  const LINE_LEN = 7 * GAP + 1120;
  line.style.strokeDasharray = LINE_LEN;
  for (let x = -480; x < 7 * GAP + 480; x += 160) s("path", { d: `M${x - 5} -8 L${x + 5} 0 L${x - 5} 8`, fill: "none", stroke: MAGENTA, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, wsvg);
  const stations = STEPS.map((st, i) => {
    const x = i * GAP, g = s("g", {}, wsvg);
    const ripple = s("circle", { cx: x, cy: 0, r: 21, fill: "none", stroke: WHITE, "stroke-width": 6, opacity: 0 }, g);
    const node = s("g", {}, g);
    s("circle", { cx: x, cy: 0, r: 21, fill: WHITE }, node);
    const core = s("circle", { cx: x, cy: 0, r: 9, fill: MAGENTA }, node);
    s("path", { d: `M${x} 21 V36`, stroke: WHITE, "stroke-width": 5 }, node);
    const box = h("div", "mk-st", world);
    h("b", "", box, st.jp); h("i", "", box, st.en);
    at(box, x, 36);
    return { node, core, ripple, box, x };
  });
  const marker = s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, wsvg);

  // camera: overview → dive into station 1 → ride the line → pull back out
  const pos = (t) => STEP_T.slice(1).reduce((p, t0) => p + seg(t, t0 - 0.2, t0 + 0.22, E.io), 0);
  const OV = { x: 150, y: 930, k: 0.36 };
  function camera(t) {
    const ride = { x: 360 - GAP * pos(t), y: LINE_Y, k: 1 };
    const zi = seg(t, 1.45, STEP_T[0] + 0.05, E.io), zo = seg(t, OUT_T - 0.05, OUT_T + 0.45, E.io);
    const mix = (a, b, q) => ({ x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), k: lerp(a.k, b.k, q) });
    return zo > 0 ? mix(ride, OV, zo) : mix(OV, ride, zi);
  }

  // ---------------------------------------------------------------- per-step headings
  STEPS.forEach((st, i) => {
    const t0 = STEP_T[i], out = t0 + STEP_LEN - 0.16;
    lyric({ lines: [String(i + 1).padStart(2, "0")], x: 96, y: 96, size: 190, font: EN, weight: 800, cls: "outline", style: "slam", t0: t0 + 0.02, stagger: 0.05, dur: 0.24, out: [out], outStyle: "up", outDur: 0.16 });
    lyric({ lines: [st.jp], x: 106, y: 318, size: 92, spacing: 0.04, style: "pop", t0: t0 + 0.1, stagger: 0.05, dur: 0.26, out: [out + 0.02], outStyle: "up", outDur: 0.16 });
    lyric({ lines: [st.en], x: 112, y: 432, size: 26, font: EN, weight: 800, spacing: 0.26, style: "type", t0: t0 + 0.18, stagger: 0.016, dur: 0.04, out: [out + 0.02], outStyle: "fade", outStagger: 0, outDur: 0.12 });
    lyric({ lines: [st.cap], x: 110, y: 604, size: 32, spacing: 0.03, style: "rise", t0: t0 + 0.34, stagger: 0.016, dur: 0.24, out: [out + 0.03], outStyle: "up", outStagger: 0.003, outDur: 0.15 });
    const row = at(h("div", "mk-chiprow", info), 110, 500);
    st.chips = st.tools.map((name, j) => h("div", "mk-chip" + (j % 2 ? " navy" : ""), row, name));
  });

  // ---------------------------------------------------------------- demos
  const panels = STEP_T.map(() => h("div", "mk-panel", demo));

  // 01 key visual: the poster, scanned; a box pops over every piece of text; the text inventory
  const d1 = panels[0];
  const RC = { x: 770, y: 100, w: 1040, h: 585 }, PK = RC.w / 2000;
  const refCard = at(h("div", "mk-card", d1), RC.x, RC.y, RC.w, RC.h); img(A("ref.jpg"), refCard);
  const boxes = BOXES.map(([x0, y0, x1, y1]) => at(h("div", "mk-box", d1), RC.x + x0 * PK, RC.y + y0 * PK, (x1 - x0) * PK, (y1 - y0) * PK));
  const scan1 = at(h("div", "mk-scan", d1), RC.x, RC.y, RC.w, 8);
  const inv = at(h("div", "mk-inv", d1), RC.x, 714, RC.w, 156);
  const invCount = h("div", "count", inv); invCount.innerHTML = '文字<em>0</em>行を書き出し';
  const invNum = invCount.querySelector("em");
  const invLines = h("div", "lines", inv);
  const invRows = [0, 1, 2].map((r) => {
    const row = at(h("div", "row", invLines), 0, 14 + r * 46);
    INVENTORY.filter((_, i) => i % 3 === r).forEach((txt) => h("span", "", row, txt));
    return row;
  });

  // 02 cut out: poster → cut-out → green plate
  const d2 = panels[1];
  const cA = at(h("div", "mk-card", d2), 730, 200, 330, 442); img(A("cut_src.jpg"), cA);
  const cB = at(h("div", "mk-card", d2), 1110, 200, 330, 442); h("div", "mk-checker", cB);
  const cBsrc = img(A("cut_src.jpg"), cB); img(A("cut_woman.png"), cB);
  const cC = at(h("div", "mk-card", d2), 1490, 300, 360, 203); img(A("plate.jpg"), cC);
  const pA = at(h("div", "mk-pill", d2, "原画"), 730, 158), pB = at(h("div", "mk-pill", d2, "切り抜き"), 1110, 158), pC = at(h("div", "mk-pill white", d2, "緑背景"), 1490, 258);
  const d2svg = s("svg", { width: 1920, height: 1080 }, d2); d2svg.style.position = "absolute";
  const arrows2 = [[1068, 1102], [1448, 1482]].map(([x0, x1]) => {
    const e = s("path", { d: `M${x0} 421 H${x1} M${x1 - 16} 405 L${x1} 421 L${x1 - 16} 437`, fill: "none", stroke: WHITE, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }, d2svg);
    const L = e.getTotalLength(); e.style.strokeDasharray = L; return { e, L };
  });

  // 03 animate: the prompt goes in, a moving take comes out
  const d3 = panels[2];
  const PROMPT = "walks in profile toward the RIGHT\n4.5-7s: slows down, looks down\n7-9s: clenches one fist\n9-11s: smiles, walks briskly\nbackground: flat lime green";
  const bubble = at(h("div", "mk-bubble", d3), 760, 70);
  const bubbleText = h("span", "", bubble); const bcaret = h("span", "caret", bubble);
  const d3pill = at(h("div", "mk-pill en white", d3, "MiniMax H3"), 1440, 58);
  const film = at(h("div", "mk-film", d3), 720, 520, 1120, 330);
  at(h("div", "holes", film), 0, 8); at(h("div", "holes", film), 0, 290);
  const ftrack = h("div", "track", film);
  for (let i = 0; i < 9; i++) at(img(A(`film_${i}.jpg`), ftrack), i * 430, 0);
  const d3badge = at(h("div", "mk-pill en", d3, "15s ・ 2K"), 1680, 494);

  // 04 key out: green on the right of the line, transparent on the left; the drift fix
  const d4 = panels[3];
  const keyCard = at(h("div", "mk-card", d4), 770, 96, 1000, 562);
  h("div", "mk-checker", keyCard); img(A("key_cut.png"), keyCard);
  const kgreen = img(A("key_green.jpg"), keyCard);
  const kscan = at(h("div", "mk-scan", d4), 770, 96, 8, 562);
  const pBefore = at(h("div", "mk-pill white", d4, "元の映像"), 1650, 66);
  const pAfter = at(h("div", "mk-pill", d4, "切り抜き後"), 790, 66);
  const maskCard = at(h("div", "mk-card", d4), 1530, 700, 300, 169); img(A("key_mask.png"), maskCard);
  const pMask = at(h("div", "mk-pill", d4, "マスク"), 1530, 672);
  const graph = at(h("div", "mk-graph", d4), 770, 700, 720, 170);
  h("b", "", graph, "頭の位置を追って、ブレを補正");
  const gsvg = s("svg", { width: 720, height: 170 }, graph); gsvg.style.position = "absolute";
  const CX = (window.KOI_CLIPS && window.KOI_CLIPS.h3 && window.KOI_CLIPS.h3.cx) || Array.from({ length: 360 }, (_, i) => 950 + 30 * Math.sin(i / 40));
  const cxMin = Math.min(...CX), cxMax = Math.max(...CX);
  const gRaw = s("path", { d: CX.map((v, i) => `${i ? "L" : "M"}${(30 + (i / (CX.length - 1)) * 660).toFixed(1)} ${(64 + ((v - cxMin) / (cxMax - cxMin || 1)) * 84).toFixed(1)}`).join(" "),
    fill: "none", stroke: BLUSH, "stroke-width": 4, "stroke-linejoin": "round" }, gsvg);
  const gFix = s("path", { d: "M30 106 H690", fill: "none", stroke: WHITE, "stroke-width": 5, "stroke-linecap": "round" }, gsvg);
  const gRawL = gRaw.getTotalLength(); gRaw.style.strokeDasharray = gRawL;
  gFix.style.strokeDasharray = 660;

  // 05 storyboard: eight scenes, one per bar
  const d5 = panels[4];
  const SCENES = [["HOOK", "つかみ"], ["START", "スタート"], ["BOARD", "案内板"], ["LOW", "どん底"], ["TURN", "転機"], ["SUPPORT", "支える駅"], ["GOAL", "ゴール"], ["END", "エンド"]];
  const thumbs = SCENES.map(([en, jp], i) => {
    const x = 760 + (i % 4) * 280, y = 96 + Math.floor(i / 4) * 246;
    const th = at(h("div", "mk-thumb", d5), x, y); img(A(`scene_${i}.jpg`), th);
    const lb = at(h("div", "mk-tlabel", d5), x + 2, y + 162); h("em", "", lb, `${i + 1} ${en}`); h("span", "", lb, jp);
    return { th, lb };
  });
  const ruler = at(h("div", "mk-ruler", d5), 760, 610, 1100, 46);
  const rfill = h("div", "fill", ruler);
  for (let i = 1; i < 8; i++) at(h("i", "", ruler), i * (1100 / 8), 0);
  const rNote = at(h("div", "mk-note", d5), 760, 690); rNote.textContent = "8小節 ＝ 15.0秒";
  const bpm5 = at(h("div", "mk-pill en white", d5, "128 BPM"), 1080, 688);

  // 06 compose: the spot's real layers pulled apart, then pressed back into one frame
  const d6 = panels[5];
  const s3 = at(h("div", "mk-scene3d", d6), 740, 70, 1040, 740);
  const stack = h("div", "mk-stack", s3);
  const LAYERS = [["bg", "背景"], ["map", "路線図"], ["type", "文字"], ["woman", "キャラ"], ["light", "光・粒子"]];
  const planes = LAYERS.map(([f, label]) => {
    const p = h("div", "mk-plane", stack);
    img(A(`layer_${f}.png`), p); h("div", "frame", p);
    return { p, pill: h("div", "mk-pill white", p, label) };
  });
  const code = at(h("div", "mk-code", d6), 110, 670);
  const CODE = ["function render(t) {", "  cam.zoom = lens(t);", "  board.flap(t);", "  woman.seek(clipTime(t));", "  type.draw(t);", "}"];
  const codeLines = CODE.map(() => h("div", "", code));

  // 07 sound: the spot's arrangement as a piano roll, scrolling under a playhead (5.6x speed)
  const d7 = panels[6];
  const roll = at(h("div", "mk-roll", d7), 740, 110, 1100, 470);
  ["DRUMS", "BASS", "KEYS", "BELL"].forEach((n, i) => { const l = at(h("div", "lane", roll), 0, 52 + i * 104); h("b", "", l, n); });
  const rtrack = h("div", "track", roll);
  const PPS = 190, HEAD = 420, SPEED = 5.6;
  const notes = [];
  const note = (tau, lane, y, w, hgt) => { const n = at(h("div", "note", rtrack), 170 + tau * PPS, 52 + lane * 104 + y, w, hgt); notes.push({ n, tau }); };
  const PROG = ["D", "A", "Bm", "G", "D", "A", "Em", "Asus", "D", "A", "Bm", "G", "G", "A", "D", "D"];
  const ROOT = { D: 2, A: 9, Bm: 11, G: 7, Em: 4, Asus: 9 };
  const LOW = [5.625, 7.5];
  for (let b = 0; b < 28; b++) {
    const tau = b * BEAT;
    if (tau >= LOW[0] && tau < LOW[1]) { if (b % 2 === 0) { note(tau, 0, 56, 18, 18); note(tau + 0.17, 0, 62, 12, 12); } continue; }
    note(tau, 0, b % 2 ? 16 : 56, 24, 24); note(tau + BEAT / 2, 0, 40, 12, 12);
  }
  for (let hb = 0; hb < 14; hb++) {
    const tau = hb * 2 * BEAT, r = ROOT[PROG[hb]];
    if (tau >= LOW[0] && tau < LOW[1]) { note(tau, 1, 74 - r * 5, 160, 14); note(tau, 2, 64 - r * 3, 160, 12); continue; }
    for (let e = 0; e < 4; e++) note(tau + e * BEAT / 2, 1, 74 - r * 5 - (e % 2) * 12, 38, 14);
    for (const off of [0, 0.75, 1.5]) for (let k = 0; k < 3; k++) note(tau + off * BEAT, 2, 70 - ((r + k * 4) % 12) * 5, off === 1.5 ? 64 : 34, 11);
  }
  const MEL = { 8: [81, 0, 78, 81], 9: [83, 81, 76, 0], 10: [78, 0, 81, 83], 11: [86, 83, 81, 0], 12: [83, 81, 78, 81], 13: [90, 0, 88, 86] };
  for (const hb in MEL) MEL[hb].forEach((n, k) => { if (n) note(hb * 2 * BEAT + k * BEAT / 2, 3, 74 - (n - 76) * 4, 32, 14); });
  [[0, "つかみ"], [5.625, "どん底"], [7.5, "転機"], [9.375, "サビ"], [13.125, "エンド"]].forEach(([tau, label]) => at(h("div", "sec", rtrack, label), 170 + tau * PPS, 10));
  at(h("div", "head", roll), HEAD, 0);
  const bpm7 = at(h("div", "mk-pill en white", d7, "128 BPM"), 1700, 70);
  const er = rng(9);
  const EQ = Array.from({ length: 24 }, (_, i) => ({ e: at(h("div", "mk-eq", d7), 760 + i * 45, 620, 24, 160), k: 0.3 + er() * 0.7, ph: er() * 6 }));

  // 08 export: every frame shot, stacked, and pressed into one file
  const d8 = panels[7];
  const counter = at(h("div", "mk-counter", d8), 770, 110);
  const cnum = h("span", "", counter); h("small", "", counter, "/ 0450 FRAMES");
  const shots = Array.from({ length: 14 }, (_, j) => ({ e: at(img(A(`shot_${String(j).padStart(2, "0")}.jpg`), d8, "mk-shot"), 0, 0), j }));
  const file = at(h("div", "mk-file", d8), 1360, 300);
  const fsvg = s("svg", { viewBox: "0 0 92 70" }, file);
  s("rect", { x: 3, y: 3, width: 86, height: 64, rx: 10, fill: "none", stroke: MAGENTA, "stroke-width": 6 }, fsvg);
  s("path", { d: "M38 22 L60 35 L38 48 Z", fill: MAGENTA }, fsvg);
  h("b", "", file, "MP4");
  const spec = at(h("div", "mk-spec", d8), 1266, 712); spec.textContent = "1920×1080 ・ 30fps ・ 15s";

  // ---------------------------------------------------------------- intro + outro
  lyric({ lines: ["HOW IT'S MADE"], x: 104, y: 124, size: 100, font: EN, weight: 800, spacing: 0.02, style: "slam", dur: 0.22, stagger: 0.02,
    segs: [[0, 0.1], [4, 0.22], [9, 0.34]], out: [1.6], outStyle: "up", outStagger: 0.008, outDur: 0.2 });
  lyric({ lines: ["Étoile 15秒Webプロモ", "ができるまで"], x: 110, y: 290, size: 64, lh: 88, spacing: 0.03, style: "pop", t0: 0.45, stagger: 0.022, out: [1.64], outStyle: "up", outStagger: 0.006, outDur: 0.18 });
  const introA = at(h("div", "mk-card", info), 1160, 140, 540, 304); img(A("ref.jpg"), introA);
  const introB = at(h("div", "mk-card", info), 1330, 390, 540, 304); img(A("scene_7.jpg"), introB);
  const introPA = at(h("div", "mk-pill en white", info, "KEY VISUAL"), 1160, 104), introPB = at(h("div", "mk-pill en", info, "15s WEB PROMO"), 1330, 712);
  const introSvg = s("svg", { width: 1920, height: 1080 }, info); introSvg.style.position = "absolute";
  const introArrow = s("path", { d: "M1240 470 Q1240 560 1310 560 M1292 542 L1312 560 L1292 578", fill: "none", stroke: WHITE, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }, introSvg);
  const IA = introArrow.getTotalLength(); introArrow.style.strokeDasharray = IA;

  lyric({ lines: ["HOW IT'S MADE"], x: 104, y: 150, size: 70, font: EN, weight: 800, spacing: 0.02, style: "slam", t0: OUT_T + 0.15, stagger: 0.022, dur: 0.22 });
  lyric({ lines: ["Étoile 15秒Webプロモ", "ができるまで"], x: 110, y: 250, size: 56, lh: 78, spacing: 0.03, style: "pop", t0: OUT_T + 0.28, stagger: 0.02 });
  const built = at(h("div", "mk-chip", info, "Built with Claude Code"), 110, 440); built.style.position = "absolute";
  const player = at(h("div", "mk-player", info), 860, 150, 960, 540);
  const pvid = h("video", "", player); pvid.muted = true; pvid.playsInline = true; pvid.preload = "auto"; pvid.src = A("spot.webm");
  const npPill = at(h("div", "mk-pill en white", info, "NOW PLAYING ▶"), 860, 104);
  const toolNames = TOOL_LINE.map((n) => h("div", "mk-toolname", info, n));

  // ---------------------------------------------------------------- background life
  const bignum = h("div", "mk-bignum", $("bignum"));
  const bgfx = $("bgfx"), sr = rng(31);
  const SPARK = Array.from({ length: 26 }, () => {
    const g = s("g", {}, bgfx);
    s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, g);
    return { g, x: 40 + sr() * 1840, y: 40 + sr() * 840, sc: 0.12 + sr() * 0.2, ph: sr() * 6.28 };
  });
  const wipe = h("div", "wipe", $("wipes"));
  const bars = Array.from({ length: 7 }, (_, i) => { const b = h("div", "bar", wipe); b.style.background = i % 2 ? BLUSH : WHITE; b.style.top = i * 160 - 40 + "px"; return b; });
  const bgGlow = $("bg-glow");
  const grain = $("grain"), gctx = grain.getContext("2d");
  const GRAIN = Array.from({ length: 4 }, (_, k) => {
    const im = gctx.createImageData(960, 540), r = rng(900 + k);
    for (let i = 0; i < im.data.length; i += 4) { const v = 200 + r() * 55; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    return im;
  });

  // ---------------------------------------------------------------- render
  let vidWant = null;
  function render(t) {
    t = clamp(t, 0, DUR);
    const bp = beatPulse(t), bar = barPulse(t);
    const stepIdx = STEP_T.findIndex((t0, i) => t >= t0 && t < (STEP_T[i + 1] ?? OUT_T));
    typo.render(t);
    bgGlow.style.transform = tf(960 + 420 * Math.sin(t * 0.4) - 800, 540 + 200 * Math.cos(t * 0.33) - 800, ` scale(${(1 + 0.04 * bp).toFixed(3)})`);

    // camera and the line
    const cam = camera(t);
    world.style.transform = `translate(${cam.x.toFixed(1)}px,${cam.y.toFixed(1)}px) scale(${cam.k.toFixed(4)})`;
    line.style.strokeDashoffset = LINE_LEN * (1 - seg(t, 0.1, 0.9, E.io));
    stations.forEach((st, i) => {
      const lit = t >= STEP_T[i] + 0.05, ap = popAt(t, 0.5 + i * 0.06), rc = RECAP[i], dt = t - STEP_T[i] - 0.05;
      const k = Math.max(lit ? Math.exp(-dt * 6) : 0, t >= rc ? Math.exp(-(t - rc) * 7) : 0);
      st.node.setAttribute("transform", `translate(${st.x} 0) scale(${(ap * (1 + 0.25 * k)).toFixed(3)}) translate(${-st.x} 0)`);
      st.core.setAttribute("fill", lit ? WHITE : MAGENTA);
      st.box.style.transform = `translate(-50%,0) scale(${(ap * (1 + 0.14 * k)).toFixed(3)})`;
      st.box.style.background = lit ? WHITE : "transparent"; st.box.style.color = lit ? MAGENTA : WHITE;
      const rt = t >= rc ? (t - rc) / 0.5 : lit ? dt / 0.5 : 1;
      st.ripple.setAttribute("r", 21 + clamp(rt) * 70); st.ripple.setAttribute("opacity", rt < 1 ? (1 - clamp(rt)).toFixed(3) : 0);
    });
    const mp = pos(t);
    marker.setAttribute("transform", `translate(${(mp * GAP).toFixed(1)} ${(-78 - 10 * bp).toFixed(1)}) rotate(${(t * 50).toFixed(1)}) scale(${(0.5 + 0.08 * bp).toFixed(3)})`);
    marker.setAttribute("opacity", seg(t, 1.5, 1.8) * (1 - seg(t, OUT_T, OUT_T + 0.2)));

    // headings: chips follow the step in view
    STEPS.forEach((st, i) => st.chips.forEach((c, j) => {
      const t0 = STEP_T[i] + 0.26 + j * 0.07, out = STEP_T[i] + STEP_LEN - 0.16;
      const q = popAt(t, t0), o = seg(t, out, out + 0.14);
      c.style.opacity = (clamp(q * 2) * (1 - o)).toFixed(3);
      c.style.transform = tf(0, (1 - q) * 20 - o * 30, ` scale(${(0.6 + 0.4 * q).toFixed(3)})`);
    }));

    // demo panels slide in from the right and out to the left, like the line
    panels.forEach((p, i) => {
      const t0 = STEP_T[i], inQ = seg(t, t0 - 0.05, t0 + 0.3, E.out), outQ = seg(t, t0 + STEP_LEN - 0.22, t0 + STEP_LEN, E.in);
      p.style.display = t >= t0 - 0.05 && t < t0 + STEP_LEN ? "" : "none";
      p.style.opacity = (inQ * (1 - outQ)).toFixed(3);
      p.style.transform = tf((1 - inQ) * 200 - outQ * 260, 0);
    });
    const L = (i) => t - STEP_T[i];

    // 01
    { const l = L(0), d = popAt(t, STEP_T[0], 0.42);
      refCard.style.transform = tf(0, (1 - d) * -70, ` rotate(${((1 - d) * -4).toFixed(2)}deg) scale(${lerp(0.9, 1, d).toFixed(3)})`);
      const sq = seg(l, 0.3, 0.95, E.io);
      scan1.style.top = (RC.y + RC.h * sq).toFixed(1) + "px"; scan1.style.opacity = bump(l, 0.25, 1.0).toFixed(3);
      boxes.forEach((b, i) => { const q = popAt(t, STEP_T[0] + 0.5 + i * 0.04, 0.22); b.style.opacity = clamp(q * 2).toFixed(3); b.style.transform = `scale(${(0.5 + 0.5 * q).toFixed(3)})`; });
      const iq = seg(l, 1.25, 1.55, E.out);
      inv.style.opacity = iq.toFixed(3); inv.style.transform = tf(0, (1 - iq) * 40);
      invNum.textContent = Math.round(INVENTORY.length * seg(l, 1.35, 2.2, E.out));
      invRows.forEach((r, i) => { r.style.transform = tf(-((l - 1.2) * (220 + i * 60)) % 3000, 0); }); }

    // 02
    { const l = L(1);
      cA.style.transform = `scale(${popAt(t, STEP_T[1] + 0.05, 0.35).toFixed(3)})`; pA.style.transform = `scale(${popAt(t, STEP_T[1] + 0.15).toFixed(3)})`;
      arrows2.forEach((a, i) => { a.e.style.strokeDashoffset = a.L * (1 - seg(l, 0.45 + i * 0.75, 0.65 + i * 0.75, E.io)); });
      const bq = popAt(t, STEP_T[1] + 0.6, 0.35); cB.style.transform = `scale(${bq.toFixed(3)})`; cB.style.opacity = clamp(bq * 2).toFixed(3);
      cBsrc.style.opacity = (1 - seg(l, 0.85, 1.35, E.io)).toFixed(3); pB.style.transform = `scale(${popAt(t, STEP_T[1] + 0.7).toFixed(3)})`;
      const cq = popAt(t, STEP_T[1] + 1.4, 0.35); cC.style.transform = `scale(${cq.toFixed(3)})`; cC.style.opacity = clamp(cq * 2).toFixed(3);
      pC.style.transform = `scale(${popAt(t, STEP_T[1] + 1.5).toFixed(3)})`; }

    // 03
    { const l = L(2), n = Math.round([...PROMPT].length * seg(l, 0.12, 1.05));
      bubbleText.textContent = [...PROMPT].slice(0, n).join("");
      bcaret.style.opacity = l < 1.1 || Math.floor(t * 8) % 2 ? 1 : 0;
      bubble.style.transform = `scale(${popAt(t, STEP_T[2] - 0.02).toFixed(3)})`;
      d3pill.style.transform = `scale(${popAt(t, STEP_T[2] + 0.2).toFixed(3)})`;
      const fq = seg(l, 0.9, 1.2, E.out); film.style.opacity = fq.toFixed(3);
      ftrack.style.transform = tf(80 - Math.max(0, l - 0.9) * 1150, 0);
      d3badge.style.transform = `scale(${popAt(t, STEP_T[2] + 1.15).toFixed(3)})`; }

    // 04
    { const l = L(3), sw = seg(l, 0.25, 1.15, E.io);
      kgreen.style.clipPath = `inset(0 0 0 ${(sw * 100).toFixed(2)}%)`;
      kscan.style.left = (770 + 1000 * sw - 4).toFixed(1) + "px"; kscan.style.opacity = bump(l, 0.2, 1.22).toFixed(3);
      pBefore.style.transform = `scale(${popAt(t, STEP_T[3] + 0.2).toFixed(3)})`;
      pAfter.style.transform = `scale(${popAt(t, STEP_T[3] + 0.7).toFixed(3)})`;
      const gq = seg(l, 1.15, 1.4, E.out); graph.style.opacity = gq.toFixed(3); graph.style.transform = tf(0, (1 - gq) * 30);
      gRaw.style.strokeDashoffset = gRawL * (1 - seg(l, 1.3, 1.9, E.io));
      gFix.style.strokeDashoffset = 660 * (1 - seg(l, 1.9, 2.3, E.io));
      maskCard.style.transform = `scale(${popAt(t, STEP_T[3] + 1.25).toFixed(3)})`; pMask.style.transform = `scale(${popAt(t, STEP_T[3] + 1.32).toFixed(3)})`; }

    // 05
    { const l = L(4), ph = seg(l, 0.75, 2.45);
      thumbs.forEach((q, i) => {
        const a = popAt(t, STEP_T[4] + 0.15 + i * BEAT / 2, 0.28), on = ph * 8 >= i && ph * 8 < i + 1 && ph > 0 && ph < 1;
        q.th.style.opacity = clamp(a * 2).toFixed(3);
        q.th.style.transform = `scale(${(a * (on ? 1.06 : 1)).toFixed(3)})`;
        q.th.style.boxShadow = on ? `0 0 0 8px ${WHITE}, 0 18px 34px rgba(70,0,28,0.4)` : "";
        q.lb.style.opacity = clamp(a * 2).toFixed(3);
      });
      rfill.style.transform = `scaleX(${ph.toFixed(4)})`;
      rNote.style.opacity = seg(l, 0.5, 0.7).toFixed(3); bpm5.style.transform = `scale(${(popAt(t, STEP_T[4] + 0.55) * (1 + 0.1 * bp)).toFixed(3)})`; }

    // 06
    { const l = L(5), ex = seg(l, 0.08, 0.55, E.io) * (1 - seg(l, 1.75, 2.2, E.io));
      stack.style.transform = `rotateX(${(56 * ex).toFixed(2)}deg) rotateZ(${(-34 * ex).toFixed(2)}deg) scale(${lerp(1, 0.86, ex).toFixed(3)})`;
      planes.forEach((p, i) => {
        p.p.style.transform = `translateZ(${(i * 118 * ex).toFixed(1)}px)`;
        p.p.style.background = `rgba(255,250,250,${(0.12 * ex).toFixed(3)})`;
        const q = ex > 0.6 ? popAt(t, STEP_T[5] + 0.45 + i * 0.08, 0.25) : 0;
        p.pill.style.opacity = clamp((ex - 0.5) * 3) * q; p.pill.style.transform = `scale(${q.toFixed(3)})`;
      });
      const shown = Math.floor(CODE.join("").length * seg(l, 0.35, 1.6));
      let left = shown;
      codeLines.forEach((e, i) => {
        const txt = CODE[i].slice(0, Math.max(0, left)); left -= CODE[i].length;
        e.innerHTML = txt.replace(/function/, '<span class="kw">function</span>').replace(/(lens|flap|seek|clipTime|draw|render)/g, '<span class="fn">$1</span>') || "&nbsp;";
      });
      code.style.transform = tf(0, (1 - popAt(t, STEP_T[5] + 0.25)) * 40); code.style.opacity = seg(l, 0.2, 0.4) * (1 - seg(l, 2.5, 2.65)); }

    // 07
    { const l = L(6), tau = Math.max(0, l - 0.2) * SPEED;
      rtrack.style.transform = tf(HEAD - 170 - tau * PPS, 0);
      for (const nn of notes) nn.n.classList.toggle("on", tau >= nn.tau && tau < nn.tau + 0.5);
      bpm7.style.transform = `scale(${(popAt(t, STEP_T[6] + 0.3) * (1 + 0.12 * bp)).toFixed(3)})`;
      const lowNow = tau >= LOW[0] && tau < LOW[1];
      EQ.forEach((q) => { const v = (lowNow ? 0.35 : 1) * (0.18 + 0.82 * q.k * (0.35 + 0.65 * bp) * (0.6 + 0.4 * Math.sin(t * 9 + q.ph))); q.e.style.transform = `scaleY(${v.toFixed(3)})`; }); }

    // 08
    { const l = L(7);
      cnum.textContent = String(Math.round(450 * seg(l, 0.05, 1.55))).padStart(4, "0");
      const press = seg(l, 1.55, 1.75, E.in);
      shots.forEach(({ e, j }) => {
        const q = seg(l, 0.1 + j * 0.08, 0.36 + j * 0.08, E.out);
        const x = lerp(1960, 1180 + j * 7, q), y = lerp(250, 330 - j * 6, q), r = (j % 2 ? 1 : -1) * (2 + (j % 5));
        e.style.opacity = (q > 0 ? 1 : 0) * (1 - press);
        e.style.transform = tf(lerp(x, 1330, press), lerp(y, 420, press), ` rotate(${(r * (1 - press)).toFixed(1)}deg) scale(${lerp(1, 0.3, press).toFixed(3)})`);
      });
      const fq = popAt(t, STEP_T[7] + 1.7, 0.3); file.style.transform = `scale(${fq.toFixed(3)}) rotate(${((1 - fq) * -10).toFixed(1)}deg)`; file.style.opacity = fq > 0 ? 1 : 0;
      spec.style.opacity = seg(l, 1.85, 2.0); }

    // intro: one poster → one 15 s spot
    { const a = popAt(t, 0.55, 0.4), b = popAt(t, 0.9, 0.4), o = seg(t, 1.55, 1.8, E.in);
      introA.style.opacity = (clamp(a * 2) * (1 - o)).toFixed(3); introA.style.transform = tf(o * -200, (1 - a) * -60, ` rotate(${lerp(-8, -3, a).toFixed(2)}deg)`);
      introB.style.opacity = (clamp(b * 2) * (1 - o)).toFixed(3); introB.style.transform = tf(o * -200, (1 - b) * 60, ` rotate(${lerp(8, 3, b).toFixed(2)}deg)`);
      introPA.style.opacity = introA.style.opacity; introPA.style.transform = tf(o * -200, 0, ` scale(${popAt(t, 0.7).toFixed(3)})`);
      introPB.style.opacity = introB.style.opacity; introPB.style.transform = tf(o * -200, 0, ` scale(${popAt(t, 1.05).toFixed(3)})`);
      introArrow.style.strokeDashoffset = IA * (1 - seg(t, 0.8, 1.05, E.io)); introArrow.setAttribute("opacity", 1 - o); }

    // outro: the finished spot plays, the whole line is lit, tools listed under each stop
    const endOn = t >= OUT_T + 0.2;
    built.style.opacity = endOn ? 1 : 0; built.style.transform = `scale(${popAt(t, OUT_T + 0.75).toFixed(3)})`;
    const pq = popAt(t, OUT_T + 0.08, 0.4);
    player.style.opacity = clamp(pq * 2); player.style.transform = tf(0, (1 - pq) * 60, ` scale(${lerp(0.85, 1, pq).toFixed(3)})`);
    vidWant = t >= OUT_T ? clamp((t - (OUT_T + 0.15)) * 3.3, 0, 13.9) : null;
    npPill.style.opacity = endOn ? 1 : 0; npPill.style.transform = `scale(${popAt(t, OUT_T + 0.5).toFixed(3)})`;
    toolNames.forEach((e, i) => {
      const q = popAt(t, OUT_T + 0.6 + i * 0.05);
      e.style.left = (OV.x + i * GAP * OV.k) + "px"; e.style.top = "1016px";
      e.style.opacity = clamp(q * 2); e.style.transform = `translateX(-50%) translateY(${((1 - q) * 16).toFixed(1)}px)`;
    });

    // background: a giant outline number for the step in view, twinkling stars, one stripe wipe
    bignum.textContent = stepIdx >= 0 ? String(stepIdx + 1).padStart(2, "0") : "";
    const bq = stepIdx >= 0 ? seg(t, STEP_T[stepIdx], STEP_T[stepIdx] + 0.4, E.out) : 0;
    bignum.style.transform = tf(1180 - bq * 120 - (t - (STEP_T[stepIdx] || 0)) * 30, 60, ` scale(${(1 + 0.01 * bar).toFixed(4)})`);
    bignum.style.opacity = bq;
    const still = t >= FINAL + 0.4; // the last stretch holds still
    SPARK.forEach((p) => {
      const tw = still ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.6 + p.ph);
      p.g.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${(still ? 0 : t * 25 + p.ph * 40).toFixed(1)}) scale(${(p.sc * (0.7 + 0.5 * (still ? 0 : bp))).toFixed(3)})`);
      p.g.setAttribute("opacity", (0.7 * tw).toFixed(3));
    });
    const wq = (t - (OUT_T - 0.3)) / 0.45;
    wipe.style.display = wq > 0 && wq < 1 ? "" : "none";
    if (wq > 0 && wq < 1) bars.forEach((b, i) => { const k = clamp(wq * 1.6 - i * 0.07); b.style.transform = `translateX(${lerp(-2400, 2400, E.io(k)).toFixed(1)}px) skewX(-18deg)`; });
    gctx.putImageData(GRAIN[Math.floor(t * 30) % 4], 0, 0);
  }

  // ---------------------------------------------------------------- the finished spot in the player
  function seekVid(c) {
    return new Promise((res) => {
      const target = (Math.floor(c * 30) + 0.5) / 30;
      if (Math.abs(pvid.currentTime - target) < 1e-3 && pvid.readyState >= 2) return res();
      pvid.addEventListener("seeked", () => requestAnimationFrame(() => requestAnimationFrame(res)), { once: true });
      pvid.currentTime = target;
    });
  }
  async function renderAsync(t) { render(t); if (vidWant != null) await seekVid(vidWant); }
  function syncVid() {
    if (vidWant == null) { if (!pvid.paused) pvid.pause(); return; }
    if (vidWant >= 13.9) { if (!pvid.paused) pvid.pause(); if (Math.abs(pvid.currentTime - 13.9) > 0.05) pvid.currentTime = 13.9; return; }
    pvid.playbackRate = 3.3;
    if (Math.abs(pvid.currentTime - vidWant) > 0.25) pvid.currentTime = vidWant;
    if (pvid.paused) pvid.play().catch(() => {});
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
  const fonts = ['900 60px "Noto Sans JP"', '700 60px "Noto Sans JP"', '800 30px "Montserrat"', '400 30px "DM Mono"', '500 60px "Cormorant Garamond"']
    .map((f) => document.fonts.load(f, "原画GOAL Étoile0"));
  const vid = new Promise((r) => { if (pvid.readyState >= 2) r(); else { pvid.addEventListener("loadeddata", r, { once: true }); pvid.addEventListener("error", r, { once: true }); } });
  const ready = Promise.all([...imgs, ...fonts, document.fonts.ready, vid]);
  window.MV = { DUR, CUES, render, renderAsync, ready, fps: 30 };

  const stillT = params.get("t");
  ready.then(() => renderAsync(stillT != null ? parseFloat(stillT) : 29));
  if (renderMode || stillT != null) { $("ui").classList.add("hidden"); return; }

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
      syncVid();
      if (t < DUR + 0.2) raf = requestAnimationFrame(loop);
      else { label.textContent = "REPLAY"; ui.classList.remove("hidden"); }
    };
    loop();
  }
  ui.addEventListener("click", () => ready.then(play));
  addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); ready.then(play); } });
})();
