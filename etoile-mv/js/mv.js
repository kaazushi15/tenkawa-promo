/* Étoile — 恋する乙女は、痩せて最高の私へ。 15s web spot.
 * Same engine as koi-mv: every visual is a pure function of time, render(t). The player
 * drives t from the AudioContext clock; tools/render.mjs seeks frame by frame.
 *
 * Eight bars at 128 BPM, one scene per bar:
 *   1 HOOK     the headline, built like a route; zoom through 痩せて
 *   2 START    9.01, the journey and its first stations
 *   3 BOARD    a departure board flaps through the hurdles
 *   4 LOW      the colour drains; three confessions stack up
 *   5 TURN     white flash, close-up: she looks up — わたしをあきらめない。
 *   6 SUPPORT  次の駅は、理想の私。 — the gym's four promises are the next stations
 *   7 GOAL     12.25 X'mas lights up
 *   8 END      brand, features, the free-counselling call to action
 * She faces right and walks right, so the route map flows from right to left. */
(() => {
  "use strict";

  // ---------------------------------------------------------------- constants
  const DUR = 15;
  const BEAT = 60 / 128;
  const B = (n) => +(n * BEAT).toFixed(4);
  const TY = 930;              // main track; her shoes rest on it
  const FOOT_X = 620;          // where she walks on screen
  const HEIGHT = 780;          // her height on stage at zoom 1
  const SPR = { ax: 420, ay: 1112, top: 14 }; // woman.png: point between the feet, top of the hair
  const WHITE = "#fffafa", MAGENTA = "#cb2267", BLUSH = "#f7b6cf", NAVY = "#1c2142";

  // Every cue the picture and the soundtrack share (seconds).
  const T = {
    hook: [0, B(1), B(2), B(2.5)],    // 恋する乙女は、/ 痩せて / 最高の / 私へ。
    zoom: B(4),                       // zoom through 痩せて into the map
    start: 1.97,
    typeTop: [2.0, 2.86],
    stations: [B(6), B(7)],           // 誘惑, 停滞期 pass under her feet
    whip: 3.62,
    rows: [0, 1, 2, 3, 4, 5].map((k) => B(8 + k / 2)),
    boardOut: 5.48,
    low: [B(12), B(16)],
    cards: [5.66, 6.05, 6.45],
    turn: B(16),
    swap: B(18),
    pull: 8.95,
    next: B(20),
    ideal: B(20.5),
    together: B(22),
    feats: [B(20.5), B(21.5), B(22.5), B(23.5)],
    lights: B(24),
    goal: B(26),
    sweep: 12.95,
    end: B(28),
    cta: 13.62,
  };
  const CUES = { etoile: T };

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
  const px = (v) => v.toFixed(2) + "px";
  const tf = (x, y, extra = "") => `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)${extra}`;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    lin: (p) => p,
    out: (p) => 1 - (1 - p) ** 3,
    outQ: (p) => 1 - (1 - p) ** 5,
    expo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
    in: (p) => p ** 3,
    inX: (p) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
    io: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
    back: (p) => 1 + 2.9 * (p - 1) ** 3 + 1.9 * (p - 1) ** 2,
  };
  const seg = (t, a, b, e = E.lin) => e(clamp((t - a) / (b - a)));
  const win = (t, a, b) => t >= a && t < b;
  const decay = (t, t0, k = 8) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
  function keys(list) { // piecewise curve: [[t, value, easeIntoThisKey], ...]
    return (t) => {
      if (t <= list[0][0]) return list[0][1];
      for (let i = 1; i < list.length; i++) {
        const [t1, v1, e] = list[i];
        if (t <= t1) {
          const [t0, v0] = list[i - 1];
          return lerp(v0, v1, (e || E.lin)((t - t0) / (t1 - t0)));
        }
      }
      return list[list.length - 1][1];
    };
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function route(pts, r = 46) { // rounded polyline → SVG path
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const ax = x1 - ((x1 - x0) / l1) * rr, ay = y1 - ((y1 - y0) / l1) * rr;
      const bx = x1 + ((x2 - x1) / l2) * rr, by = y1 + ((y2 - y1) / l2) * rr;
      d += ` L${ax} ${ay} Q${x1} ${y1} ${bx} ${by}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last[0]} ${last[1]}`;
  }
  const stroke = (w, extra = {}) => ({ fill: "none", stroke: WHITE, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...extra });
  function drawable(e) { const L = e.getTotalLength(); e.style.strokeDasharray = `${L} ${L + 10}`; return (p) => { e.style.strokeDashoffset = (L * (1 - p)).toFixed(1); }; }
  const show = (e, on) => { e.style.visibility = on ? "visible" : "hidden"; };

  // ---------------------------------------------------------------- camera
  // Pan: the map scrolls under her. Lens: zoom about a focus point (cam-space f → screen s).
  const camV = keys([[0, 240], [1.55, 240], [1.875, 900, E.in], [2.25, 430, E.out], [3.5, 430], [3.66, 2400, E.in], [3.9, 430, E.out],
    [5.45, 430], [5.8, 250, E.io], [7.4, 250], [7.5, 300], [9.0, 300], [9.45, 760, E.io], [11.1, 760], [11.7, 330, E.io], [15, 330]]);
  const CAM = new Float64Array(15001);
  for (let i = 1; i <= 15000; i++) CAM[i] = CAM[i - 1] + camV((i - 0.5) / 1000) / 1000;
  const camX = (t) => {
    const f = clamp(t, 0, DUR) * 1000, i = Math.floor(f);
    return i >= 15000 ? CAM[15000] : lerp(CAM[i], CAM[i + 1], f - i);
  };
  const FACE = { x: FOOT_X - 10, y: 330 };                  // her head and fist, cam space
  function lens(t) {
    let z = 1, f = [FOOT_X, TY], sc = [FOOT_X, TY];
    if (t < T.zoom) z = lerp(1.14, 1, seg(t, 0, 1.7, E.out));
    else if (t < T.whip) z = lerp(1.3, 1, seg(t, T.zoom, 2.4, E.outQ));
    else if (win(t, T.low[0], T.turn)) { z = lerp(1, 1.1, seg(t, T.low[0], 7.45, E.sine)); f = sc = [FOOT_X, 560]; }
    else if (win(t, T.turn, 9.45)) {
      const k = seg(t, T.pull, 9.42, E.io);
      z = lerp(lerp(2.15, 2.3, seg(t, T.turn, T.pull)), 1, k);
      f = [FACE.x, FACE.y]; sc = [lerp(560, FACE.x, k), lerp(520, FACE.y, k)];
    } else if (t >= T.lights) { z = lerp(1, 0.9, seg(t, T.lights, 12.1, E.io)); sc = [lerp(FOOT_X, FOOT_X + 70, seg(t, T.lights, 12.1, E.io)), TY + 34 * seg(t, T.lights, 12.1, E.io)]; }
    // a small zoom punch on the big hits
    for (const ti of [...T.hook, T.ideal, T.goal]) z *= 1 + 0.022 * decay(t, ti, 9);
    return { z, f, s: sc };
  }
  const lensTf = (L) => `translate(${(L.s[0] - L.f[0] * L.z).toFixed(2)}px,${(L.s[1] - L.f[1] * L.z).toFixed(2)}px) scale(${L.z.toFixed(4)})`;
  const toScreen = (L, x, y) => [L.s[0] + (x - L.f[0]) * L.z, L.s[1] + (y - L.f[1]) * L.z];

  // ---------------------------------------------------------------- character footage
  // A keyed MiniMax H3 clip (clips/<name>.js, from tools/key_clips.py) replaces the
  // cut-out sprite when present. ?clip=<name> picks another take.
  const CLIP_NAME = new URLSearchParams(location.search).get("clip") || "h3";
  const CLIP = (window.KOI_CLIPS || {})[CLIP_NAME] || null;
  const VS = CLIP ? HEIGHT / CLIP.height : 1;                  // clip px → stage px
  // story time → clip time (h3: brisk 0–1.8s, head down 2–6s, looks up with a fist 6–9s,
  // bright stride from 9.5s). The hurdles play the head-down walk a little slow, the turn
  // lands on her looking up, and the rest runs at about real speed.
  const clipTime = keys((CLIP && CLIP.sync) || [[0, 0], [1.875, 1.875], [5.6, 4.6], [7.35, 5.95], [7.5, 6.3],
    [9.4, 9.2], [13.4, 13.4], [15, 15]]);
  const SS = HEIGHT / (SPR.ay - SPR.top);                      // sprite scale

  // ---------------------------------------------------------------- DOM
  const stage = $("stage"), main = $("main"), bg = $("bg"), bgGlow = $("bg-glow"), camA = $("cam-a"), camB = $("cam-b");
  const far = $("far"), world = $("world"), wsvg = $("world-svg"), behind = $("behind"), bsvg = $("behind-svg");
  const fx = $("fx"), near = $("near"), typeL = $("type"), tsvg = $("type-svg"), ticker = $("ticker"), bug = $("bug");
  const flash = $("flash"), endcard = $("endcard"), sweep = $("sweep"), sweepStar = $("sweep-star");
  const woman = $("woman"), clipWrap = $("clip-wrap"), clipVid = $("clip"), endWrap = $("end-clip-wrap"), clipVid2 = $("clip2");

  const EW = { h: 900, x: 1300, y: 1046 };                     // her on the end card
  const VS2 = CLIP ? EW.h / CLIP.height : 1;
  if (CLIP) {
    woman.style.display = "none";
    const [x0, y0, x1, y1] = CLIP.crop;
    for (const [v, k] of [[clipVid, VS], [clipVid2, VS2]]) {
      v.src = CLIP.src;
      v.style.width = px((x1 - x0) * k); v.style.height = px((y1 - y0) * k);
    }
  } else { clipWrap.style.display = "none"; endWrap.innerHTML = '<img src="assets/woman.png" alt="" style="width:840px;height:1125px">'; }

  const footWorld = (t) => FOOT_X + camX(t);

  // ---------------------------------------------------------------- world: the map
  const TRACK_END = camX(DUR) + 2600;
  const track = s("path", { d: `M-600 ${TY} H${TRACK_END}`, ...stroke(16) }, wsvg);
  const trackDraw = drawable(track);
  for (let x = -300; x < TRACK_END; x += 320) s("path", { d: `M${x - 6} ${TY - 8} L${x + 4} ${TY} L${x - 6} ${TY + 8}`, ...stroke(4, { stroke: MAGENTA }) }, wsvg);
  // loose spurs and dotted branches, like the key visual (kept low, under the type)
  const deco = [];
  const spur = (pts, w, extra = {}, r = 40) => deco.push(s("path", { d: route(pts, r), ...stroke(w, extra) }, wsvg));
  const DOT = { "stroke-dasharray": "2 16" };
  {
    const a = footWorld(2.6), b = footWorld(9.2), c = footWorld(11.4);
    spur([[a + 900, TY], [a + 900, 800], [a + 1300, 800], [a + 1300, 690]], 10);
    spur([[a + 1300, 800], [a + 1800, 800]], 6, DOT);
    spur([[b + 1250, TY], [b + 1250, 640], [b + 1700, 640], [b + 1700, 560], [b + 2300, 560]], 10);
    spur([[b + 1700, 640], [b + 2200, 640], [b + 2200, TY]], 6, DOT);
    spur([[c + 300, TY], [c + 300, 700], [c + 640, 700]], 6, DOT);
  }
  // node helper: a station dot with a ripple
  function node(x, y, r = 18) {
    const ring = s("circle", { cx: x, cy: y, r, fill: "none", stroke: WHITE, "stroke-width": 5, opacity: 0 }, wsvg);
    const dot = s("circle", { cx: x, cy: y, r, fill: WHITE }, wsvg);
    const core = s("circle", { cx: x, cy: y, r: r * 0.45, fill: MAGENTA }, wsvg);
    return { ring, dot, core, r, render(t, t0, big = 1) {
      const on = t >= t0, dt = t - t0, q = clamp(dt / 0.6);
      core.setAttribute("fill", on ? WHITE : MAGENTA);
      dot.setAttribute("r", (r + (on ? 9 * big * Math.exp(-dt * 7) : 0)).toFixed(2));
      ring.setAttribute("r", (r + q * 70 * big).toFixed(1)); ring.setAttribute("opacity", on && q < 1 ? (1 - q).toFixed(3) : 0);
    } };
  }
  const startNode = node(footWorld(T.start), TY, 22);
  // the first two hurdles pass under her feet as name tags (the board tells their story)
  const ST1 = [["誘惑", T.stations[0]], ["停滞期", T.stations[1]]].map(([jp, t]) => {
    const wx = footWorld(t), n = node(wx, TY);
    const stub = s("path", { d: `M${wx} ${TY - 18} V${TY - 52}`, ...stroke(5) }, wsvg);
    const p = h("div", "pill", world, jp);
    p.style.left = wx - 4 + "px"; p.style.top = TY - 116 + "px";
    return { jp, t, wx, n, stub, p };
  });
  // the low point: three dim stations
  const LOWN = [B(12.5), B(13.5), B(14.5)].map((t) => ({ t, n: node(footWorld(t), TY, 14) }));
  // the gym's four promises, as the stations after the turn
  const FEATS = [
    ["i-woman", "完全女性専用", ["安心の", "プライベート空間"]],
    ["i-coach", "パーソナル指導", ["あなたに合わせた", "オーダーメイド"]],
    ["i-food", "食事サポート", ["無理なく続ける", "食習慣づくり"]],
    ["i-bag", "手ぶらOK", ["レンタル・アメニティ", "完備"]],
  ].map(([icon, title, sub], i) => {
    const t = T.feats[i], wx = footWorld(t), n = node(wx, TY, 20);
    const stub = s("path", { d: `M${wx} ${TY - 20} V${TY - 40}`, ...stroke(5) }, wsvg);
    const el = h("div", "feat-st", world);
    const sv = s("svg", { viewBox: "0 0 48 64" }, el);
    const use = s("use", { href: "#" + icon }, sv);
    const tx = h("div", "", el);
    h("b", "", tx, title);
    const it = h("i", "", tx); it.innerHTML = sub.join("<br>");
    el.style.left = wx - 6 + "px"; el.style.top = TY - 40 - 136 + "px";
    return { t, wx, n, stub, el, use };
  });
  // GOAL: a framed destination, rising off the track, with the star of the key visual
  const GOAL_X = footWorld(T.goal) + 600, GOAL_Y = 74, GW = 520, GH = 430;
  const goalGlow = s("circle", { cx: GOAL_X + GW / 2, cy: GOAL_Y + GH / 2, r: 520, fill: "url(#glow-g)", opacity: 0 }, wsvg);
  const goalFrame = s("path", { d: route([[GOAL_X - 300, TY], [GOAL_X - 300, GOAL_Y + GH], [GOAL_X - 40, GOAL_Y + GH], [GOAL_X - 40, GOAL_Y], [GOAL_X + GW, GOAL_Y], [GOAL_X + GW, GOAL_Y + GH], [GOAL_X + 180, GOAL_Y + GH]], 54), ...stroke(12) }, wsvg);
  const goalDraw = drawable(goalFrame);
  const goalNode = node(GOAL_X - 40, GOAL_Y + 78, 20);
  const SX = GOAL_X + GW + 120, SY = GOAL_Y + 120;
  const goalStar = s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, wsvg);
  const goalRays = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2, e: s("path", { ...stroke(i % 2 ? 3 : 6), opacity: 0 }, wsvg) }));

  // far: the headline in outline, drifting slowly behind everything
  const band = h("div", "band", far, "恋する乙女は、痩せて最高の私へ。　恋する乙女は、痩せて最高の私へ。");
  band.style.fontSize = "240px"; band.style.top = "520px";

  // ---------------------------------------------------------------- behind her (screen space)
  // rays for the turn, centred on her face
  const rays = s("g", { opacity: 0 }, bsvg);
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 36;
    s("path", { d: `M0 0 L${Math.cos(a0) * 2400} ${Math.sin(a0) * 2400} L${Math.cos(a1) * 2400} ${Math.sin(a1) * 2400}Z`, fill: WHITE, opacity: 0.14 }, rays);
  }
  // MY FUTURE IS MINE. — the words on her bag, running behind the turn
  const mine = h("div", "band en", behind, "MY FUTURE IS MINE.  MY FUTURE IS MINE.  MY FUTURE IS MINE.");
  mine.style.fontSize = "190px"; mine.style.top = "800px";
  // the departure board
  const board = h("div", "", behind); board.id = "board";
  const bh = h("div", "head", board); h("b", "", bh, "DIET JOURNEY"); h("i", "", bh, "for the best me.");
  const ROWS = [
    ["誘惑", ["スイーツ／チョコ　夜更かし／お酒", "わかってるけど、やめられない。"]],
    ["停滞期", ["頑張ってるのに体重が減らない。", "心が折れそう。"]],
    ["食事制限", ["カロリー計算に疲れた。", "ストレスでまた食べてしまう。"]],
    ["運動が続かない", ["三日坊主で終わってばかり。", "私には無理なのかな。"]],
    ["周りの目", ["SNSのキラキラ投稿。", "比べちゃう自分がつらい。"]],
    ["体重", ["数字に一喜一憂。", "昨日より増えてると、落ち込む。"]],
  ];
  const POOL = [...new Set(ROWS.map((r) => r[0]).join("") + "むくみ自己嫌悪リバウンド不安")];
  const br = rng(77);
  const boardRail = s("svg", { class: "abs", width: 1000, height: 770 }, board);
  const railLine = s("path", { d: `M34 ${86 + 57} V${86 + 57 + 5 * 114}`, ...stroke(5) }, boardRail);
  const railDraw = drawable(railLine);
  const BROWS = ROWS.map(([name, copy], r) => {
    const row = h("div", "row", board); row.style.top = 86 + r * 114 + "px";
    const flap = h("div", "flap", row);
    const t0 = T.rows[r];
    const cells = [...name].map((ch, i) => {
      const c = h("div", "cell", flap), sp = h("span", "", c);
      const n = 4 + Math.floor(br() * 4), seq = Array.from({ length: n }, () => POOL[Math.floor(br() * POOL.length)]);
      return { sp, ch, seq, land: t0 + i * 0.03, step: 0.045 };
    });
    const cp = h("div", "copy", row);
    const chars = [];
    copy.forEach((ln, li) => {
      const line = h("div", "", cp);
      for (const ch of ln) chars.push({ e: h("span", "", line, ch), d: chars.length });
      if (li === 0) line.style.color = WHITE; else line.style.color = BLUSH;
    });
    const dot = s("circle", { cx: 34, cy: 86 + 57 + r * 114, r: 11, fill: NAVY, stroke: WHITE, "stroke-width": 5 }, boardRail);
    return { row, cells, chars, t0, dot };
  });

  // ---------------------------------------------------------------- screen-space type
  const kt = window.KoiTypo({ h, E, clamp, lerp, rng, BEAT, musicIn: 0, layer: typeL });
  const lyric = (o) => kt.lyric({ lh: o.size * 1.25, ...o });
  const TX = 910; // the right half of the frame is hers to look into; the words live there

  // 1 HOOK — the headline is a route: a rail runs down its left edge, one stop per line
  const hookRail = s("path", { d: route([[860, -40], [860, 690], [892, 690]], 30), ...stroke(10) }, tsvg);
  const hookRailDraw = drawable(hookRail);
  const hookArrow = s("path", { d: "M878 676 L896 690 L878 704", ...stroke(8) }, tsvg);
  const hookNodes = [[126, T.hook[0]], [360, T.hook[1]], [655, T.hook[2]]].map(([y, t0]) => ({ t0, c: s("circle", { cx: 860, cy: y, r: 16, fill: WHITE }, tsvg) }));
  const hookUnder = s("path", { d: `M${TX} 760 H${TX + 900}`, ...stroke(10) }, tsvg);
  const hookUnderDraw = drawable(hookUnder);
  const hookEnd = s("circle", { cx: TX + 900, cy: 760, r: 14, fill: WHITE }, tsvg);
  lyric({ lines: ["恋する乙女は、"], x: TX, y: 80, size: 96, style: "pop", t0: T.hook[0] + 0.02, stagger: 0.028, spacing: 0.02 , out: [T.zoom], outStyle: "fade", outDur: 0.001, outStagger: 0 });
  lyric({ lines: ["痩せて"], x: TX - 14, y: 186, size: 340, style: "slam", t0: T.hook[1], stagger: 0.06, dur: 0.22, beat: 0.03, spacing: -0.06 , out: [T.zoom], outStyle: "fade", outDur: 0.001, outStagger: 0 });
  lyric({ lines: ["最高の"], x: TX, y: 590, size: 150, style: "slam", t0: T.hook[2], stagger: 0.05, dur: 0.2, spacing: -0.02 , out: [T.zoom], outStyle: "fade", outDur: 0.001, outStagger: 0 });
  lyric({ lines: ["私へ。"], x: TX + 444, y: 590, size: 150, style: "slam", t0: T.hook[3], stagger: 0.05, dur: 0.2, spacing: -0.02 , out: [T.zoom], outStyle: "fade", outDur: 0.001, outStagger: 0 });

  // 2 START — the journey begins; a frame drawn like the START box of the key visual
  lyric({ lines: ["9月から始まる、12月のクリスマスに向けた、険しいダイエットの旅。"], x: 70, y: 34, size: 30, weight: 700, style: "type", t0: T.typeTop[0], stagger: 0.028, dur: 0.04, out: [T.whip - 0.2], outStyle: "up", outStagger: 0.002, spacing: 0.03 });
  const startFrame = s("path", { d: route([[1560, 400], [1560, 110], [TX, 110], [TX, 700], [1560, 700], [1560, 560]], 40), ...stroke(10) }, tsvg);
  const startFrameDraw = drawable(startFrame);
  lyric({ lines: ["START"], x: TX + 50, y: 150, size: 76, font: "Montserrat", weight: 800, style: "slam", t0: T.start, stagger: 0.035, out: [T.whip - 0.22], outStyle: "scatter", outDur: 0.2, spacing: 0.06 });
  lyric({ lines: ["9.01"], x: TX + 40, y: 232, size: 220, font: "Montserrat", weight: 800, style: "pop", t0: T.start + 0.12, stagger: 0.05, beat: 0.03, out: [T.whip - 0.2], outStyle: "scatter", outDur: 0.2, spacing: -0.01 });
  lyric({ lines: ["今日から", "私の未来が", "変わりはじめる。"], x: TX + 54, y: 486, size: 52, lh: 70, style: "rise", t0: 2.3, stagger: 0.03, out: [T.whip - 0.2], outStyle: "up", outDur: 0.18, outStagger: 0.002, spacing: 0.05 });
  lyric({ lines: ["DIET JOURNEY"], x: 1786, y: 150, size: 70, font: "Montserrat", weight: 800, vertical: true, style: "rise", t0: 2.15, stagger: 0.025, out: [T.whip - 0.2], outStyle: "up", outDur: 0.18, spacing: 0.05 });
  lyric({ lines: ["for the best me."], x: 1690, y: 160, size: 34, font: "DM Mono", weight: 400, vertical: true, style: "type", t0: 2.45, stagger: 0.03, dur: 0.04, out: [T.whip - 0.2], outStyle: "fade", outDur: 0.15, spacing: 0.12 });

  // 4 LOW — three confessions stack up, each tagged with its station
  const CARDS = [["むくみ", ["顔も脚もパンパン…", "今日の自分、好きになれない。"]], ["自己嫌悪", ["また食べちゃった。", "なんで私ってこうなんだろう。"]], ["リバウンド不安", ["痩せても維持できるか、", "いつも不安でいっぱい。"]]]
    .map(([tag, lines], i) => {
      const y = 132 + i * 276, t0 = T.cards[i];
      const chip = h("div", "chip", typeL, tag); chip.style.left = TX + 50 + "px"; chip.style.top = y + "px";
      lyric({ lines, x: TX + 50, y: y + 64, size: 52, lh: 70, style: "rise", t0: t0 + 0.08, stagger: 0.022, dur: 0.34, out: [7.34 + i * 0.03], outStyle: "fall", outStagger: 0.004, spacing: 0.03, seed: 60 + i });
      return { chip, t0 };
    });
  const lowRain = ["むくみ", "自己嫌悪", "リバウンド不安"].map((w, i) => {
    const e = h("div", "band", behind, w);
    e.style.writingMode = "vertical-rl"; e.style.fontSize = "200px"; e.style.left = 1690 - i * 250 + "px"; e.style.top = "0px";
    e.style.webkitTextStroke = "2px rgba(255,250,250,0.18)";
    return e;
  });

  // 5 TURN — close-up; the line lands on the beat, then the promise
  lyric({ lines: ["わたしを"], x: 960, y: 170, size: 132, style: "slam", t0: T.turn, stagger: 0.05, dur: 0.2, out: [T.swap - 0.07], outStyle: "scatter", outStagger: 0.012, spacing: 0.02 });
  lyric({ lines: ["あきらめない。"], x: 960, y: 330, size: 132, style: "slam", t0: T.turn + BEAT / 2, stagger: 0.045, dur: 0.2, beat: 0.025, out: [T.swap - 0.06], outStyle: "scatter", outStagger: 0.012, spacing: 0.0 });
  lyric({ lines: ["この一歩が、"], x: 966, y: 200, size: 112, style: "flip", t0: T.swap, stagger: 0.04, out: [9.2], outStyle: "up", outStagger: 0.01, spacing: 0.02 });
  lyric({ lines: ["未来を変える。"], x: 966, y: 352, size: 112, style: "slam", t0: T.swap + BEAT / 2, stagger: 0.045, dur: 0.2, beat: 0.025, out: [9.22], outStyle: "up", outStagger: 0.01, spacing: 0.0 });
  const turnUnder = s("path", { d: "M966 500 H1880", ...stroke(12) }, tsvg);
  const turnUnderDraw = drawable(turnUnder);

  // 6 SUPPORT — next station: the ideal me (inverted telop), then "together"
  lyric({ lines: ["次の駅は、"], x: TX + 40, y: 80, size: 92, style: "pop", t0: T.next, stagger: 0.035, out: [11.36], outStyle: "up", spacing: 0.02 });
  const telop = h("div", "telop", typeL); telop.style.left = TX + 22 + "px"; telop.style.top = "196px"; telop.style.width = "906px"; telop.style.height = "202px";
  lyric({ lines: ["理想の私。"], x: TX + 50, y: 212, size: 170, color: MAGENTA, style: "slam", t0: T.ideal + 0.04, stagger: 0.05, dur: 0.2, beat: 0.025, out: [11.38], outStyle: "up", spacing: 0.0 });
  lyric({ lines: ["一緒に、乗り越えよう。"], x: TX + 44, y: 440, size: 60, style: "rise", t0: T.together, stagger: 0.03, out: [11.4], outStyle: "up", outStagger: 0.005, spacing: 0.06 });

  // 7 GOAL — the copy rides in the frame (world space)
  lyric({ layer: world, lines: ["GOAL"], x: GOAL_X + 26, y: GOAL_Y + 46, size: 58, font: "Montserrat", weight: 800, style: "pop", t0: 11.62, stagger: 0.04, spacing: 0.06 });
  lyric({ layer: world, lines: ["12.25"], x: GOAL_X + 20, y: GOAL_Y + 112, size: 118, font: "Montserrat", weight: 800, style: "slam", t0: T.goal, stagger: 0.05, beat: 0.03, spacing: 0 });
  lyric({ layer: world, lines: ["X'mas"], x: GOAL_X + 26, y: GOAL_Y + 238, size: 74, font: "Montserrat", weight: 800, style: "pop", t0: T.goal + 0.16, stagger: 0.04, spacing: 0.02 });
  lyric({ layer: world, lines: ["最高の笑顔で", "大切な人と特別な日を。"], x: GOAL_X + 26, y: GOAL_Y + 336, size: 36, lh: 50, weight: 700, style: "rise", t0: 12.3, stagger: 0.016, spacing: 0.05 });

  // ---------------------------------------------------------------- fx: lights, speed lines, sparkles, snow
  const lr = rng(5);
  const wire = s("path", { d: "M-20 30 " + Array.from({ length: 4 }, (_, k) => `Q${k * 520 + 260} ${30 + 74} ${k * 520 + 520} 30`).join(" "), fill: "none", stroke: WHITE, "stroke-width": 2, opacity: 0 }, fx);
  const LIGHTS = Array.from({ length: 40 }, (_, i) => {
    const x = 6 + i * 50, u = (x % 520) / 520, y = 30 + 74 * 2 * u * (1 - u) * 1.0;
    const halo = s("circle", { cx: x, cy: y + 8, r: 18, fill: "url(#glow-g)", opacity: 0 }, fx);
    return { x, ph: lr() * 6.28, c: [WHITE, BLUSH, "#ffe3a3"][i % 3], halo, e: s("circle", { cx: x, cy: y + 8, r: 7, fill: WHITE, opacity: 0 }, fx) };
  });
  const SPEED = Array.from({ length: 18 }, () => ({ y: 520 + lr() * 380, x0: lr() * 2600, len: 140 + lr() * 300, v: 2600 + lr() * 1600, e: s("path", { ...stroke(4), opacity: 0 }, fx) }));
  const sr = rng(31);
  const SPARK = Array.from({ length: 34 }, () => {
    const e = s("svg", { class: "abs", width: 40, height: 40, viewBox: "-50 -50 100 100" }, near);
    s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, e);
    return { e, wx: sr() * 9000, y: 60 + sr() * 880, sc: 0.3 + sr() * 0.8, ph: sr() * 6.28, par: 1.1 + sr() * 0.5 };
  });
  const SNOW = Array.from({ length: 70 }, () => ({ x: sr() * 2000, y: sr() * 1100, r: 2 + sr() * 4, v: 40 + sr() * 70, sw: 10 + sr() * 26, ph: sr() * 6.28,
    e: s("circle", { r: 3, fill: WHITE, opacity: 0 }, fx) }));
  ticker.textContent = "MY FUTURE IS MINE.  ・  ETOILE GYM  ・  DIET JOURNEY  ・  ".repeat(8);

  // ---------------------------------------------------------------- end card
  const EC = {};
  const ec = (id, text) => { const e = h("div", "e", endcard, text); e.id = id; return (EC[id] = e); };
  ec("e-head", "恋する乙女は、痩せて最高の私へ。");
  ec("e-kind", "女性専用パーソナルジム");
  ec("e-logo", "Étoile");
  ec("e-kana", "エトワール");
  ec("e-tag", "わたし史上、いちばん輝くために。");
  const EFEATS = [["i-woman", "完全女性専用", "安心のプライベート空間"], ["i-coach", "パーソナル指導", "あなたに合わせたオーダーメイド"],
    ["i-food", "食事サポート", "無理なく続ける食習慣づくり"], ["i-bag", "手ぶらOK", "レンタル・アメニティ完備"]].map((f, i) => {
    const el = h("div", "feat", endcard);
    el.style.left = 110 + (i % 2) * 400 + "px"; el.style.top = 562 + Math.floor(i / 2) * 120 + "px";
    const sv = s("svg", { viewBox: "0 0 48 64" }, el);
    s("use", { href: "#" + f[0], color: WHITE }, sv);
    const tx = h("div", "", el); h("b", "", tx, f[1]); tx.appendChild(document.createTextNode(f[2]));
    return el;
  });
  const ctaRing = h("div", "", endcard); ctaRing.id = "cta-ring";
  const cta = h("div", "", endcard); cta.id = "cta";
  h("b", "", cta, "無料カウンセリング受付中");
  const ctaSv = s("svg", { viewBox: "0 0 60 60" }, cta);
  s("circle", { cx: 30, cy: 30, r: 30, fill: MAGENTA }, ctaSv);
  const ctaArrow = s("path", { d: "M24 18 L36 30 L24 42", fill: "none", stroke: WHITE, "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, ctaSv);
  const acc = h("div", "", endcard); acc.id = "e-access";
  const accSv = s("svg", { class: "abs", width: 900, height: 60 }, acc);
  const accLine = s("path", { d: "M10 24 H880", ...stroke(4) }, accSv);
  const accDraw = drawable(accLine);
  const ACC = [["心斎橋駅 徒歩5分", 10], ["梅田駅 徒歩7分", 300], ["女性トレーナーのみ在籍", 560]].map(([txt, x], i) => {
    const c = s("circle", { cx: x, cy: 24, r: 9, fill: WHITE }, accSv);
    const sp = h("span", "", acc, txt); sp.style.left = x + 22 + "px"; sp.style.top = "36px";
    return { c, sp, i };
  });
  const badge = h("div", "", endcard); badge.id = "e-badge";
  h("b", "", badge, "GOAL"); h("i", "", badge, "12.25"); h("em", "", badge, "X'mas");
  ec("e-dj", "DIET JOURNEY"); ec("e-fb", "for the best me.");
  const endStars = [[1520, 150, 1.2], [1880, 420, 0.7], [1010, 120, 0.8]].map(([x, y, k]) => {
    const e = s("svg", { class: "abs", width: 90, height: 90, viewBox: "-50 -50 100 100" }, endcard);
    s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, e);
    return { e, x, y, k };
  });
  const END_IN = [["e-head", 13.16], ["e-kind", 13.24], ["e-tag", 13.42], ["e-dj", 13.36], ["e-fb", 13.42]].map(([id, t0]) => ({ e: EC[id], t0 }))
    .concat(EFEATS.map((e, i) => ({ e, t0: 13.46 + i * 0.045 })));

  // grain: a few fixed noise frames, cycled per frame so exports stay deterministic
  const grain = $("grain"), gctx = grain.getContext("2d");
  const GRAIN = Array.from({ length: 4 }, (_, k) => {
    const img = gctx.createImageData(960, 540), r = rng(900 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = 200 + r() * 55; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    return img;
  });

  // ---------------------------------------------------------------- render
  let clipWant = null, clip2Want = null;
  const mixHex = (a, b, p) => { // "#rrggbb" blend
    const A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16);
    const c = (sh) => Math.round(lerp((A >> sh) & 255, (Bc >> sh) & 255, p));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };

  function render(t) {
    const cam = camX(t), L = lens(t), beat = kt.beatPulse(t);

    // --- zoom through 痩せて (the whole frame dives into the せ), white at the cut
    const zt = seg(t, 1.6, T.zoom, E.inX);
    main.style.transform = t < T.zoom && zt > 0 ? `translate(${1390 * (1 - (1 + zt * 11))}px,${300 * (1 - (1 + zt * 11))}px) scale(${1 + zt * 11})` : "none";
    main.style.filter = t < T.zoom && zt > 0.05 ? `blur(${(zt * 6).toFixed(2)}px)` : "none";
    const fl = Math.max(seg(t, 1.76, T.zoom) * (t < T.zoom ? 1 : 0), t >= T.zoom ? 1 - seg(t, T.zoom, T.zoom + 0.2, E.out) : 0,
      t >= T.turn - 0.05 ? bumpFlash(t, T.turn) : 0);
    flash.style.opacity = fl.toFixed(3);

    // --- background: magenta; the low point drains toward deep wine; light blooms at the turn and the goal
    const low = seg(t, T.low[0] - 0.1, T.low[0] + 0.35, E.sine) * (t < T.turn ? 1 : 0);
    bg.style.background = mixHex("#cb2267", "#5e0d31", low * 0.92);
    const gx = 960 + 420 * Math.sin(t * 0.45), gy = 540 + 200 * Math.cos(t * 0.37);
    bgGlow.style.transform = tf(gx - 800, gy - 800, ` scale(${(1 + 0.04 * beat).toFixed(3)})`);
    bgGlow.style.opacity = (lerp(0.8, 0.15, low) + 0.4 * seg(t, T.lights, 12.3)).toFixed(3);

    // --- camera
    camA.style.transform = camB.style.transform = lensTf(L);
    world.style.transform = tf(-cam, 0);
    world.style.opacity = (1 - 0.45 * low).toFixed(3);
    camA.style.filter = win(t, 3.6, 3.9) ? `blur(${(4 * Math.sin(Math.PI * seg(t, 3.6, 3.9))).toFixed(2)}px)` : "none";
    far.style.opacity = (0.5 * seg(t, T.zoom, T.zoom + 0.4) * (1 - low) * (t < T.turn || t > 9.4 ? 1 : 0)).toFixed(3);
    band.style.transform = tf(260 - cam * 0.3, 0);

    // --- the map
    trackDraw(clamp(seg(t, 0, 0.5, E.out) + (t > 0.5 ? 1 : 0)));
    deco.forEach((d) => { d.style.opacity = seg(t, T.zoom, T.zoom + 0.4).toFixed(3); });
    startNode.render(t, T.start, 1.6);
    ST1.forEach((q) => {
      q.n.render(t, q.t);
      const on = t >= q.t, dt = t - q.t, ap = seg(t, T.zoom + 0.1, T.zoom + 0.4, E.back);
      q.p.style.opacity = ap.toFixed(3);
      q.p.style.background = on ? WHITE : "transparent"; q.p.style.color = on ? MAGENTA : WHITE;
      q.p.style.transform = `scale(${(ap * (on ? 1 + 0.2 * Math.exp(-dt * 8) * Math.cos(dt * 22) : 1)).toFixed(3)})`;
      q.stub.setAttribute("opacity", ap);
    });
    LOWN.forEach((q) => q.n.render(t, q.t, 0.7));
    FEATS.forEach((q) => {
      q.n.render(t, q.t, 1.3);
      const on = t >= q.t, dt = t - q.t, ap = seg(t, T.turn, T.turn + 0.2);
      q.el.style.opacity = ap.toFixed(3);
      q.el.style.background = on ? WHITE : "transparent"; q.el.style.color = on ? MAGENTA : WHITE;
      q.use.setAttribute("color", on ? MAGENTA : WHITE);
      q.el.style.transform = `scale(${(on ? 1 + 0.16 * Math.exp(-dt * 7) * Math.cos(dt * 20) : 1).toFixed(3)})`;
    });
    goalDraw(seg(t, T.lights, T.lights + 0.6, E.io));
    goalNode.render(t, T.goal, 2.2);
    goalNode.dot.setAttribute("opacity", seg(t, 11.5, 11.6));
    goalGlow.setAttribute("opacity", (seg(t, T.goal - 0.1, T.goal + 0.4) * (0.85 + 0.15 * beat)).toFixed(3));
    const gOn = t >= T.goal, gd = t - T.goal, starS = seg(t, T.goal, T.goal + 0.35, E.back) * (1 + 0.12 * beat);
    goalStar.setAttribute("transform", `translate(${SX} ${SY}) rotate(${(gOn ? gd * 40 : 0).toFixed(1)}) scale(${(2.1 * starS).toFixed(3)})`);
    goalRays.forEach((r) => {
      const q = clamp(gd / 0.7), r0 = 80 + 200 * E.out(q), r1 = r0 + 80 * (1 - q);
      r.e.setAttribute("d", `M${SX + Math.cos(r.a) * r0} ${SY + Math.sin(r.a) * r0} L${SX + Math.cos(r.a) * r1} ${SY + Math.sin(r.a) * r1}`);
      r.e.setAttribute("opacity", gOn && q < 1 ? 1 - q : 0);
    });

    // --- behind her: board, rain, rays, MY FUTURE IS MINE.
    const bin = seg(t, T.whip - 0.02, T.rows[0] + 0.06, E.outQ), bout = seg(t, T.boardOut, T.boardOut + 0.16, E.in);
    show(board, t >= T.whip - 0.02 && t < T.boardOut + 0.16);
    board.style.transform = `translate(${((1 - bin) * 1150).toFixed(1)}px,${(bout * 120).toFixed(1)}px) skewX(${((1 - bin) * -10).toFixed(2)}deg) scaleY(${(1 - bout * 0.6).toFixed(3)})`;
    board.style.opacity = (1 - bout).toFixed(3);
    railDraw(seg(t, T.rows[0], T.rows[5] + 0.1));
    BROWS.forEach((r) => {
      r.dot.setAttribute("fill", t >= r.t0 ? WHITE : NAVY);
      r.dot.setAttribute("r", (11 + (t >= r.t0 ? 6 * Math.exp(-(t - r.t0) * 8) : 0)).toFixed(2));
      r.cells.forEach((c) => {
        // split-flap: the cell rattles through a few glyphs, then lands on its letter
        const first = c.land - c.seq.length * c.step;
        if (t < first) { c.sp.textContent = ""; c.sp.style.transform = "none"; return; }
        const k = Math.min(c.seq.length, Math.floor((t - first) / c.step));
        c.sp.textContent = k >= c.seq.length ? c.ch : c.seq[k];
        const ph = ((t - first) / c.step) % 1;
        c.sp.style.transform = t < c.land + c.step ? `scaleY(${Math.abs(Math.cos(Math.PI * ph * 0.5)).toFixed(3)})` : "none";
        c.sp.style.color = t >= c.land ? WHITE : "rgba(255,250,250,0.6)";
      });
      r.chars.forEach((c) => {
        const q = seg(t, r.t0 + 0.06 + c.d * 0.012, r.t0 + 0.06 + c.d * 0.012 + 0.08);
        c.e.style.opacity = q.toFixed(3);
        c.e.style.transform = tf((1 - q) * 10, 0);
      });
    });
    lowRain.forEach((e, i) => {
      e.style.opacity = (low * 0.9).toFixed(3);
      e.style.transform = tf(0, -260 + (t - T.low[0]) * (60 + i * 25) + i * 90);
    });
    const face = toScreen(L, FACE.x - 30, FACE.y - 60);
    const rv = seg(t, T.turn, T.turn + 0.25) * (1 - seg(t, 9.1, 9.4));
    rays.setAttribute("opacity", rv.toFixed(3));
    rays.setAttribute("transform", `translate(${face[0].toFixed(1)} ${face[1].toFixed(1)}) rotate(${((t - T.turn) * 9).toFixed(2)})`);
    mine.style.opacity = (seg(t, T.turn, T.turn + 0.2) * (1 - seg(t, 9.15, 9.4)) * 0.9).toFixed(3);
    mine.style.transform = tf(-((t - T.turn) * 260) % 2400 - 40, 0);

    // --- her
    if (CLIP) {
      const [x0, y0] = CLIP.crop;
      const i = clamp(Math.floor(clipTime(t) * CLIP.fps), 0, CLIP.frames - 1);
      const drift = CLIP.cx ? CLIP.cx[i] - CLIP.cx[0] : 0; // hold her head and shoulders steady against the generated camera's drift
      clipWrap.style.transform = tf(FOOT_X - (CLIP.feet[0] - x0 + drift) * VS, TY - (CLIP.feet[1] - y0) * VS);
      clipWant = clipTime(t);
    } else {
      const p = t / BEAT, bob = Math.abs(Math.sin(Math.PI * p)) * lerp(12, 5, low);
      woman.style.transformOrigin = `${SPR.ax}px ${SPR.ay}px`;
      woman.style.transform = tf(FOOT_X - SPR.ax, TY - bob - SPR.ay, ` rotate(${lerp(0.8 * Math.sin(Math.PI * p), 2.2, low).toFixed(2)}deg) scale(${SS.toFixed(4)})`);
    }
    $("actor").style.filter = `drop-shadow(14px 10px 0 rgba(96,8,42,${(0.3 + 0.2 * low).toFixed(2)})) brightness(${(1 - 0.22 * low).toFixed(3)}) saturate(${(1 - 0.25 * low).toFixed(3)})`;

    // --- type
    kt.render(t);
    hookRailDraw(seg(t, 0, 1.05, E.out)); hookArrow.setAttribute("opacity", seg(t, 0.95, 1.05));
    hookNodes.forEach((n) => n.c.setAttribute("r", (t >= n.t0 ? 16 + 10 * decay(t, n.t0, 9) : 0).toFixed(2)));
    hookUnderDraw(seg(t, 1.3, 1.55, E.io)); hookEnd.setAttribute("r", (14 * seg(t, 1.5, 1.6, E.back)).toFixed(2));
    [hookRail, hookArrow, hookUnder, hookEnd, ...hookNodes.map((n) => n.c)].forEach((e) => e.setAttribute("visibility", t < T.zoom ? "visible" : "hidden"));
    startFrameDraw(seg(t, T.start - 0.05, T.start + 0.4, E.io) * (1 - seg(t, T.whip - 0.24, T.whip - 0.04, E.in)));
    CARDS.forEach((c, i) => {
      const q = seg(t, c.t0, c.t0 + 0.22, E.back), out = seg(t, 7.32 + i * 0.03, 7.44 + i * 0.03);
      c.chip.style.opacity = (clamp(q * 2) * (1 - out)).toFixed(3);
      c.chip.style.transform = `scaleX(${clamp(q).toFixed(3)}) translateY(${(out * 40).toFixed(1)}px)`;
    });
    turnUnderDraw(seg(t, T.turn + 0.45, T.turn + 0.75, E.io) * (1 - seg(t, T.swap - 0.1, T.swap)) + seg(t, T.swap + 0.5, T.swap + 0.75, E.io) * (1 - seg(t, 9.15, 9.25)));
    const tq = seg(t, T.ideal - 0.08, T.ideal + 0.08, E.out), tout = seg(t, 11.32, 11.44);
    telop.style.transform = `scaleX(${(tq * (1 - tout)).toFixed(3)})`;
    show(telop, tq > 0 && tout < 1);
    ticker.style.opacity = (0.7 * seg(t, T.zoom, T.zoom + 0.3) * (1 - seg(t, 12.7, 12.95))).toFixed(3);
    ticker.style.transform = tf(-((t * 140) % 1500), 0);
    bug.style.opacity = (seg(t, 0.5, 0.8) * (1 - seg(t, T.lights - 0.2, T.lights))).toFixed(3);

    // --- lights, sparkles, snow, speed lines
    const lv = seg(t, T.lights, T.lights + 0.4);
    wire.setAttribute("opacity", (0.8 * lv).toFixed(3));
    LIGHTS.forEach((l, i) => {
      const on = seg(t, T.lights + i * 0.01, T.lights + 0.08 + i * 0.01) * (t < T.sweep[0] + 1 ? 1 : 0);
      const tw = 0.6 + 0.4 * Math.sin(t * 7 + l.ph) + 0.3 * beat;
      l.e.setAttribute("opacity", clamp(on * tw).toFixed(3)); l.e.setAttribute("fill", l.c);
      l.halo.setAttribute("opacity", (on * 0.7 * tw).toFixed(3));
    });
    const sparkV = lerp(0.85, 0.25, low) * seg(t, 0.1, 0.5);
    SPARK.forEach((q) => {
      const x = ((((q.wx - cam * q.par) % 2400) + 2400) % 2400) - 240;
      const tw = 0.5 + 0.5 * Math.sin(t * 3.1 + q.ph);
      q.e.style.opacity = (sparkV * tw).toFixed(3);
      q.e.style.transform = tf(x - 20, q.y - 20, ` rotate(${(q.ph * 30 + t * 20).toFixed(1)}deg) scale(${(q.sc * (0.7 + 0.6 * beat)).toFixed(3)})`);
    });
    const sv = seg(t, T.lights, T.lights + 0.5);
    SNOW.forEach((f) => {
      const y = ((f.y + (t - T.lights) * f.v) % 1120) - 20, x = (f.x + Math.sin(t * 1.3 + f.ph) * f.sw - cam * 0.2) % 2000;
      f.e.setAttribute("cx", (x < 0 ? x + 2000 : x).toFixed(1)); f.e.setAttribute("cy", y.toFixed(1)); f.e.setAttribute("r", f.r);
      f.e.setAttribute("opacity", (sv * 0.75).toFixed(3));
    });
    const spv = seg(t, 9.4, 9.6) * (1 - seg(t, 11.0, 11.3)) + 0.8 * Math.sin(Math.PI * seg(t, 3.6, 3.9));
    SPEED.forEach((l) => {
      const x = 2100 - ((l.x0 + t * l.v) % 2600);
      l.e.setAttribute("d", `M${x} ${l.y} H${x + l.len}`);
      l.e.setAttribute("opacity", (clamp(spv) * 0.7).toFixed(3));
    });

    // --- the star sweeps across the lens and wipes to the end card
    const sw = seg(t, T.sweep, 13.4, E.sine), stx = lerp(-900, 3000, sw);
    show(sweep, t >= T.sweep && t < 13.4);
    sweepStar.setAttribute("transform", `translate(${stx.toFixed(1)} 540) rotate(${(sw * 90).toFixed(1)}) scale(14)`);
    show(endcard, t >= T.sweep);
    endcard.style.clipPath = t >= 13.4 ? "none" : `inset(0 ${Math.max(0, 1920 - stx).toFixed(1)}px 0 0)`;
    main.style.display = t < 13.4 ? "" : "none";
    renderEnd(t, beat);

    gctx.putImageData(GRAIN[Math.floor(t * 30) % 4], 0, 0);
  }
  function bumpFlash(t, t0) { // white flash peaking on t0
    return t < t0 ? seg(t, t0 - 0.05, t0) : 1 - seg(t, t0, t0 + 0.22, E.out);
  }

  function renderEnd(t, beat) {
    if (t < T.sweep) { clip2Want = null; return; }
    END_IN.forEach(({ e, t0 }) => {
      const q = seg(t, t0, t0 + 0.26, E.out);
      e.style.opacity = q.toFixed(3);
      e.style.transform = tf(0, (1 - q) * 28);
    });
    const lq = seg(t, 13.2, 13.62, E.out); // the logo opens up, letter-spacing settling
    EC["e-logo"].style.clipPath = `inset(0 ${(100 - 100 * lq).toFixed(1)}% 0 0)`;
    EC["e-logo"].style.letterSpacing = (0.06 + 0.12 * (1 - lq)).toFixed(3) + "em";
    EC["e-kana"].style.opacity = seg(t, 13.5, 13.7).toFixed(3);
    const cq = seg(t, T.cta - 0.1, T.cta + 0.18, E.back);
    cta.style.opacity = clamp(cq * 2).toFixed(3);
    cta.style.transform = `scale(${(cq * (1 + 0.025 * (t > T.cta + 0.3 ? beat : 0))).toFixed(4)})`;
    ctaArrow.setAttribute("transform", `translate(${(t > T.cta + 0.3 ? 4 * beat : 0).toFixed(2)} 0)`);
    const rp = t > T.cta + 0.2 ? ((t - T.cta - 0.2) / (2 * BEAT)) % 1 : -1; // a ring pulses out every two beats
    ctaRing.style.opacity = rp >= 0 ? (0.8 * (1 - rp)).toFixed(3) : 0;
    ctaRing.style.transform = `scale(${(1 + 0.12 * Math.max(0, rp)).toFixed(4)}, ${(1 + 0.5 * Math.max(0, rp)).toFixed(4)})`;
    accDraw(seg(t, 13.55, 13.85, E.io));
    ACC.forEach((a) => {
      const q = seg(t, 13.6 + a.i * 0.07, 13.8 + a.i * 0.07, E.out);
      a.c.setAttribute("r", (9 * seg(t, 13.6 + a.i * 0.07, 13.72 + a.i * 0.07, E.back)).toFixed(2));
      a.sp.style.opacity = q.toFixed(3); a.sp.style.transform = tf(0, (1 - q) * 14);
    });
    const bq = seg(t, 13.3, 13.62, E.back);
    badge.style.opacity = clamp(bq * 2).toFixed(3);
    badge.style.transform = `rotate(${((1 - bq) * -40).toFixed(2)}deg) scale(${bq.toFixed(3)})`;
    endStars.forEach((st, i) => {
      const q = seg(t, 13.5 + i * 0.08, 13.7 + i * 0.08, E.back), tw = 0.85 + 0.15 * Math.sin(t * 5 + i * 2);
      st.e.style.transform = tf(st.x - 45, st.y - 45, ` scale(${(st.k * q * tw).toFixed(3)}) rotate(${(q * 45 + t * 12).toFixed(1)}deg)`);
    });
    // her, still striding, on the end card
    const wq = seg(t, 13.1, 13.5, E.out);
    if (CLIP) {
      const [x0, y0] = CLIP.crop, i = clamp(Math.floor(clipTime(t) * CLIP.fps), 0, CLIP.frames - 1);
      const drift = CLIP.cx ? CLIP.cx[i] - CLIP.cx[0] : 0;
      endWrap.style.transform = tf(EW.x - (CLIP.feet[0] - x0 + drift) * VS2 - (1 - wq) * 80, EW.y - (CLIP.feet[1] - y0) * VS2);
      clip2Want = clipTime(t);
    } else {
      const k = EW.h / (SPR.ay - SPR.top);
      endWrap.style.transform = tf(EW.x - SPR.ax * k - (1 - wq) * 80, EW.y - SPR.ay * k, ` scale(${k.toFixed(4)})`);
      endWrap.style.transformOrigin = "0 0";
    }
    endWrap.style.opacity = wq.toFixed(3);
    endWrap.style.filter = "drop-shadow(16px 12px 0 rgba(96,8,42,0.3))";
  }

  // ---------------------------------------------------------------- footage sync
  const clipFrameTime = (c) => (Math.floor(clamp(c, 0, CLIP.frames / CLIP.fps - 1e-3) * CLIP.fps) + 0.5) / CLIP.fps;
  function seek(v, c) { // resolves once the requested frame is decoded
    return new Promise((res) => {
      const target = clipFrameTime(c);
      if (Math.abs(v.currentTime - target) < 1e-3 && v.readyState >= 2) return res();
      v.addEventListener("seeked", () => requestAnimationFrame(() => requestAnimationFrame(res)), { once: true });
      v.currentTime = target;
    });
  }
  async function renderAsync(t) {
    render(t);
    if (!CLIP) return;
    const jobs = [];
    if (t < 13.4 && clipWant != null) jobs.push(seek(clipVid, clipWant));
    if (clip2Want != null) jobs.push(seek(clipVid2, clip2Want));
    await Promise.all(jobs);
  }
  function syncClip() { // live playback: let the videos run, nudge them back when they drift
    if (!CLIP) return;
    for (const [v, want] of [[clipVid, clipWant], [clipVid2, clip2Want]]) {
      if (want == null) { if (!v.paused) v.pause(); continue; }
      if (Math.abs(v.currentTime - want) > 0.1) v.currentTime = want;
      if (v.paused) v.play().catch(() => {});
    }
  }

  // ---------------------------------------------------------------- boot
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
    .map((f) => document.fonts.load(f, "恋あGOAL Étoile"));
  const vidReady = (v) => new Promise((r) => {
    if (v.readyState >= 2) r(); else { v.addEventListener("loadeddata", r, { once: true }); v.addEventListener("error", r, { once: true }); }
  });
  const ready = Promise.all([...imgs, ...fonts, document.fonts.ready, ...(CLIP ? [vidReady(clipVid), vidReady(clipVid2)] : [])]);
  window.MV = { DUR, CUES, render, renderAsync, ready, fps: 30, clip: CLIP && CLIP_NAME,
    debug: () => ({ cam: [0, 1.875, 3.75, 5.6, 7.5, 9.4, 11.25, 13].map((t) => [t, Math.round(camX(t))]), goal: GOAL_X }) };

  const still = params.get("t");
  ready.then(() => renderAsync(still != null ? parseFloat(still) : 14));
  if (renderMode || still != null) { $("ui").classList.add("hidden"); return; }

  // ---------------------------------------------------------------- player
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
      syncClip();
      if (t < DUR + 0.2) raf = requestAnimationFrame(loop);
      else { label.textContent = "REPLAY"; ui.classList.remove("hidden"); }
    };
    loop();
  }
  ui.addEventListener("click", () => ready.then(play));
  addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); ready.then(play); } });
})();
