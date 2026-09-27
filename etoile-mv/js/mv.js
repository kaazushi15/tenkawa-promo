/* Étoile — 恋する乙女は、痩せて最高の私へ。 15s DIET JOURNEY spot.
 * Same engine as koi-mv: every visual is a pure function of time, render(t). The player
 * drives t from the AudioContext clock; tools/render.mjs seeks frame by frame.
 * She faces right and walks right, so the route map flows from right to left. */
(() => {
  "use strict";

  // ---------------------------------------------------------------- constants
  const DUR = 15;
  const BEAT = 60 / 128;
  const TY = 930;              // main track; her shoes rest on it
  const UY = 470;              // upper line
  const FOOT_X = 560;          // where she walks on screen
  const HEIGHT = 780;          // her height on stage (px)
  const SPR = { ax: 420, ay: 1112, top: 14 }; // woman.png: point between the feet, top of the hair

  const TXT = {
    top: "9月から始まる、12月のクリスマスに向けた、険しいダイエットの旅。",
    start: ["今日から", "私の未来が", "変わりはじめる。"],
    koi: "恋する乙女は、", yasete: "痩せて", saikou: "最高の", watashi: "私へ。",
    turn: ["わたしをあきらめない。", "この一歩が、未来を変える。"],
    next: ["次の駅は、", "理想の私。"], together: "一緒に、乗り越えよう。",
    goal: ["最高の笑顔で", "大切な人と特別な日を。"],
  };
  const BEAT_T = (n) => +(n * BEAT).toFixed(3);
  // stations on the main track (T) and the upper line (U), lit on the beat at her feet
  const ST = [
    { jp: "誘惑", copy: ["スイーツ／チョコ", "夜更かし／お酒", "わかってるけど、", "やめられない。"], t: BEAT_T(6), line: "T" },
    { jp: "停滞期", copy: ["頑張ってるのに", "体重が減らない。", "心が折れそう。"], t: BEAT_T(7), line: "U" },
    { jp: "食事制限", copy: ["カロリー計算に疲れた。", "ストレスで", "また食べてしまう。"], t: BEAT_T(8), line: "T" },
    { jp: "運動が続かない", copy: ["三日坊主で終わってばかり。", "私には無理なのかな。"], t: BEAT_T(9), line: "U" },
    { jp: "周りの目", copy: ["SNSのキラキラ投稿。", "比べちゃう自分が", "つらい。"], t: BEAT_T(10), line: "T" },
    { jp: "体重", copy: ["数字に一喜一憂。", "昨日より増えてると、", "落ち込む。"], t: BEAT_T(11), line: "U" },
    { jp: "むくみ", copy: ["顔も脚もパンパン…", "今日の自分、", "好きになれない。"], t: BEAT_T(12.5), line: "T" },
    { jp: "自己嫌悪", copy: ["また食べちゃった。", "なんで私って", "こうなんだろう。"], t: BEAT_T(13.5), line: "U" },
    { jp: "リバウンド不安", copy: ["痩せても維持できるか、", "いつも不安で", "いっぱい。"], t: BEAT_T(14.5), line: "T" },
  ];

  // Moments the picture and the soundtrack agree on (seconds).
  const CUES = {
    start: BEAT_T(1),
    catch: 7.5,                     // the turn: snare build + crash land here
    low: [5.625, 7.5],
    turn: 7.5,
    goal: BEAT_T(26),
    sweep: [12.95, 13.4],
    endDone: 13.62,
    music: {
      lift: [7.5, 11.25], hold: [5.625, 7.5],
      prog: ["G", "G", "G", "A", "Bm", "Fm", "Em", "Asus", "G", "A", "Bm", "G", "G", "A", "D", "D"],
    },
  };
  CUES.etoile = {
    enter: 0, low: CUES.low, turn: CUES.turn, goal: CUES.goal, end: CUES.sweep[0],
    title: [BEAT_T(4), BEAT_T(5), BEAT_T(18), BEAT_T(19)],
    stations: [CUES.start, ...ST.map((s) => s.t)],
  };

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
    in: (p) => p ** 3,
    io: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
    back: (p) => 1 + 2.9 * (p - 1) ** 3 + 1.9 * (p - 1) ** 2,
  };
  const seg = (t, a, b, e = E.lin) => e(clamp((t - a) / (b - a)));
  const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));
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

  // ---------------------------------------------------------------- camera
  // The camera travels right with her; the map therefore flows left.
  const camV = keys([[0, 0], [0.45, 0], [1.0, 430, E.io], [5.45, 430], [5.9, 330, E.io], [7.35, 330],
    [7.75, 560, E.io], [11.1, 560], [11.9, 300, E.io], [15, 300]]);
  const CAM = new Float64Array(15001);
  for (let i = 1; i <= 15000; i++) CAM[i] = CAM[i - 1] + camV((i - 0.5) / 1000) / 1000;
  const camX = (t) => {
    const f = clamp(t, 0, DUR) * 1000, i = Math.floor(f);
    return i >= 15000 ? CAM[15000] : lerp(CAM[i], CAM[i + 1], f - i);
  };

  // ---------------------------------------------------------------- character
  // A keyed MiniMax H3 clip (clips/<name>.js, from tools/key_clips.py) replaces the
  // cut-out sprite when present. ?clip=<name> picks another take.
  const CLIP_NAME = new URLSearchParams(location.search).get("clip") || "h3";
  const CLIP = (window.KOI_CLIPS || {})[CLIP_NAME] || null;
  const VS = CLIP ? HEIGHT / CLIP.height : 1;                  // clip px → stage px
  // story time → clip time (h3: brisk 0–1.8s, head down 2–6s, looks up with a fist 6–9s,
  // bright stride from 9.5s). The struggle stations play the head-down walk a little slow,
  // the turn at 7.5s lands on her looking up, and the rest runs at about real speed.
  const clipTime = keys((CLIP && CLIP.sync) || [[0, 0], [1.875, 1.875], [5.6, 4.6], [7.35, 5.95], [7.5, 6.3],
    [9.4, 9.2], [13.4, 13.4], [15, 15]]);
  const SS = HEIGHT / (SPR.ay - SPR.top);                      // sprite scale

  const womanX = keys([[0, -260], [0.85, FOOT_X, E.out], [15, FOOT_X]]);
  function pose(t) {
    const x = womanX(t);
    if (CLIP) {
      return { x, y: 0, rot: 0 }; // the footage carries all of her motion
    }
    const low = seg(t, 5.5, 5.9) * (1 - seg(t, 7.3, 7.6));
    const p = t / BEAT;
    const bob = Math.abs(Math.sin(Math.PI * p)) * lerp(12, 5, low);
    const hop = 46 * bump(t, 11.62, 11.95);
    return { x, y: -bob - hop, rot: lerp(0.8 * Math.sin(Math.PI * p), 2.2, low) };
  }

  // ---------------------------------------------------------------- DOM build
  const stage = $("stage"), world = $("world"), wsvg = $("world-svg"), far = $("far"), near = $("near");
  const fxb = $("fx-back"), top = $("top"), shade = $("shade"), wipe = $("wipe"), endcard = $("endcard");
  const woman = $("woman"), clipWrap = $("clip-wrap"), clipVid = $("clip");
  const sweep = $("sweep"), sweepStar = $("sweep-star");
  const WHITE = "#fffafa", MAGENTA = "#cb2267", BLUSH = "#f7b6cf";
  const stroke = (w, extra = {}) => ({ fill: "none", stroke: WHITE, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...extra });

  if (CLIP) {
    woman.style.display = "none";
    clipVid.src = CLIP.src;
    const [x0, y0, x1, y1] = CLIP.crop;
    clipVid.style.width = px((x1 - x0) * VS); clipVid.style.height = px((y1 - y0) * VS);
  } else clipWrap.style.display = "none";

  // world positions: a station sits where her feet are on its beat
  const footWorld = (t) => womanX(t) + camX(t);
  ST.forEach((st) => { st.wx = footWorld(st.t); st.wy = st.line === "U" ? UY : TY; });
  const START_X = footWorld(CUES.start);
  const firstU = ST.find((q) => q.line === "U"), lastU = [...ST].reverse().find((q) => q.line === "U");
  const lastT = ST[ST.length - 1];

  // far: the headline in outline, drifting slowly
  const band = h("div", "band", far, "恋する乙女は、痩せて最高の私へ。　恋する乙女は、痩せて最高の私へ。");
  band.style.fontSize = "250px"; band.style.top = "540px";

  // main track, drawn in from the left at the start; chevrons point the way she walks
  const track = s("path", { d: `M-400 ${TY} H${camX(DUR) + 2400}`, ...stroke(16) }, wsvg);
  const TRACK_LEN = camX(DUR) + 2800;
  track.style.strokeDasharray = TRACK_LEN;
  for (let x = START_X + 170; x < camX(DUR) + 2200; x += 320) {
    s("path", { d: `M${x - 6} ${TY - 8} L${x + 4} ${TY} L${x - 6} ${TY + 8}`, ...stroke(4, { stroke: MAGENTA }) }, wsvg);
  }
  // upper line: climbs off the track before the first U station, drops back after the last
  const uA = firstU.wx - 420, uB = lastU.wx + 520;
  const upper = s("path", { d: route([[uA - 200, TY], [uA, TY], [uA, UY], [uB, UY], [uB, TY], [uB + 200, TY]], 60), ...stroke(12) }, wsvg);
  const UPPER_LEN = upper.getTotalLength();
  upper.style.strokeDasharray = UPPER_LEN;
  // loose ends and dotted spurs, like the key visual
  const deco = [];
  const decoPath = (pts, w, extra, t0) => { const e = s("path", { d: route(pts, 40), ...stroke(w, extra) }, wsvg); deco.push({ e, t0 }); return e; };
  decoPath([[uA - 520, TY], [uA - 520, 760], [uA - 860, 760]], 8, { "stroke-dasharray": "2 16" }, 1.9);
  decoPath([[uB + 360, TY], [uB + 360, 640], [uB + 860, 640], [uB + 860, 520]], 12, {}, 1.9);
  decoPath([[uB + 860, 640], [uB + 1400, 640], [uB + 1400, 800], [uB + 1900, 800], [uB + 1900, TY]], 8, { "stroke-dasharray": "2 16" }, 1.9);
  decoPath([[uB + 2300, TY], [uB + 2300, 700], [uB + 2800, 700], [uB + 2800, 560], [uB + 3500, 560]], 12, {}, 1.9);
  const pops = []; // extra nodes that pulse on the beat
  [[uA - 860, 760], [uB + 860, 520], [uB + 1400, 700], [uB + 1900, 800], [uB + 2800, 630], [uB + 3500, 560]].forEach(([x, y]) =>
    pops.push(s("circle", { cx: x, cy: y, r: 11, fill: WHITE }, wsvg)));

  // START: the first node, under her feet
  const startNode = s("circle", { cx: START_X, cy: TY, r: 20, fill: WHITE }, wsvg);
  const startCore = s("circle", { cx: START_X, cy: TY, r: 8, fill: MAGENTA }, wsvg);
  const startRing = s("circle", { cx: START_X, cy: TY, r: 20, fill: "none", stroke: WHITE, "stroke-width": 5, opacity: 0 }, wsvg);

  // stations: node on its line, name and copy beside it (above the track / below the upper line)
  ST.forEach((st) => {
    st.ring = s("circle", { cx: st.wx, cy: st.wy, r: 18, fill: "none", stroke: WHITE, "stroke-width": 5, opacity: 0 }, wsvg);
    s("circle", { cx: st.wx, cy: st.wy, r: 18, fill: WHITE }, wsvg);
    st.core = s("circle", { cx: st.wx, cy: st.wy, r: 8, fill: MAGENTA }, wsvg);
    const el = h("div", "stn", world);
    st.name = h("b", "", el, st.jp);
    const p = h("p", "", el);
    st.copy.forEach((ln, i) => { if (i) h("br", "", p); p.appendChild(document.createTextNode(ln)); });
    const rule = h("div", "rule", el);
    const H = 52 + st.copy.length * 33.4;
    el.style.left = st.wx + 40 + "px";
    if (st.line === "U") { el.style.top = UY + 22 + "px"; rule.style.top = "-22px"; rule.style.height = H + 22 + "px"; }
    else { el.style.top = TY - 26 - H + "px"; rule.style.top = "0px"; rule.style.height = H + 26 + "px"; }
    rule.style.left = "-40px";
    st.el = el;
  });

  // GOAL: a framed destination that scrolls into view, with the star from the key visual
  const GOAL_X = footWorld(CUES.goal) + 640, GOAL_Y = 66, GW = 500, GH = 420;
  const goalFrame = s("path", { d: route([[GOAL_X - 260, TY], [GOAL_X - 260, GOAL_Y + GH], [GOAL_X - 40, GOAL_Y + GH], [GOAL_X - 40, GOAL_Y], [GOAL_X + GW, GOAL_Y], [GOAL_X + GW, GOAL_Y + GH], [GOAL_X + 160, GOAL_Y + GH]], 50), ...stroke(12) }, wsvg);
  const GOAL_LEN = goalFrame.getTotalLength();
  goalFrame.style.strokeDasharray = GOAL_LEN;
  const goalNode = s("circle", { cx: GOAL_X - 40, cy: GOAL_Y + 70, r: 18, fill: WHITE }, wsvg);
  const goalRing = s("circle", { cx: GOAL_X - 40, cy: GOAL_Y + 70, r: 18, fill: "none", stroke: WHITE, "stroke-width": 6, opacity: 0 }, wsvg);
  const goalStar = s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, wsvg);
  const goalRays = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2, e: s("path", { ...stroke(5), opacity: 0 }, wsvg) }));

  // screen-space kinetic type (shared engine with koi-mv)
  const kt = window.KoiTypo({ h, E, clamp, lerp, rng, BEAT, musicIn: BEAT_T(4), layer: $("lyrics") });
  const lyric = (o) => kt.lyric({ lh: o.size * 1.25, ...o });
  const RX = 940; // the right half of the frame is hers to look into; the words live there
  lyric({ lines: [TXT.top], x: 70, y: 40, size: 32, lh: 40, weight: 700, style: "type", t0: 0.12, stagger: 0.028, dur: 0.05, out: [1.7], outStyle: "up", outStagger: 0.004, spacing: 0.02 });
  lyric({ lines: ["START"], x: RX + 10, y: 150, size: 84, font: "Montserrat", weight: 800, style: "slam", t0: CUES.start, stagger: 0.04, out: [1.72], outStyle: "scatter", spacing: 0.04 });
  lyric({ lines: ["9.01"], x: RX + 330, y: 120, size: 150, font: "Montserrat", weight: 800, style: "pop", t0: CUES.start + 0.16, stagger: 0.05, out: [1.74], outStyle: "scatter", spacing: 0.02 });
  lyric({ lines: TXT.start, x: RX + 14, y: 316, size: 52, lh: 72, style: "rise", t0: 0.8, stagger: 0.03, out: [1.76], outStyle: "up", outStagger: 0.006, spacing: 0.04 });
  lyric({ lines: [TXT.koi], x: RX, y: 70, size: 86, style: "pop", t0: CUES.etoile.title[0], stagger: 0.035, out: [3.66], outStyle: "up", spacing: 0.02 });
  lyric({ lines: [TXT.yasete], x: RX - 30, y: 150, size: 300, style: "slam", t0: CUES.etoile.title[1], stagger: 0.07, dur: 0.26, beat: 0.035, out: [3.64], outStyle: "scatter", outStagger: 0.03, spacing: -0.04 });
  // each station's name slams in big as she passes it
  ST.forEach((st, i) => {
    if (i < 2) return; // 誘惑 and 停滞期 share the frame with 痩せて
    const low = st.t > CUES.low[0];
    const next = ST[i + 1] ? ST[i + 1].t : CUES.turn - 0.14;
    if (low) { // the low stretch: names fall in as vertical columns and stay
      const col = i - 6;
      lyric({ lines: [st.jp], x: 1780 - col * 120, y: 50, size: 74, vertical: true, style: "drop", t0: st.t, stagger: 0.05, dur: 0.4, out: [7.28 + col * 0.05], outStyle: "fall", spacing: 0.06, seed: 40 + i });
    } else {
      lyric({ lines: [st.jp], x: RX, y: 110, size: st.jp.length > 4 ? 136 : 196, style: i % 2 ? "flip" : "slam", t0: st.t, stagger: 0.04, dur: 0.22, out: [next - 0.08], outStyle: i % 2 ? "up" : "shrink", outDur: 0.1, outStagger: 0.004, spacing: -0.02, seed: 40 + i });
    }
  });
  lyric({ lines: [TXT.turn[0]], x: RX, y: 96, size: 70, style: "wave", t0: CUES.turn + 0.02, stagger: 0.03, out: [8.36], outStyle: "up", outStagger: 0.005, spacing: 0.02 });
  lyric({ lines: [TXT.turn[1]], x: RX, y: 196, size: 62, style: "rise", t0: 7.97, stagger: 0.028, out: [8.38], outStyle: "up", outStagger: 0.005, spacing: 0.02 });
  lyric({ lines: [TXT.saikou], x: RX - 10, y: 60, size: 190, style: "slam", t0: CUES.etoile.title[2], stagger: 0.06, beat: 0.03, out: [9.3], outStyle: "scatter", spacing: -0.03 });
  lyric({ lines: [TXT.watashi], x: RX + 130, y: 262, size: 190, style: "slam", t0: CUES.etoile.title[3], stagger: 0.06, beat: 0.03, out: [9.32], outStyle: "scatter", spacing: -0.03 });
  lyric({ lines: [TXT.next[0]], x: RX, y: 70, size: 100, style: "flip", t0: BEAT_T(20), stagger: 0.04, out: [11.02], outStyle: "up", spacing: 0.02 });
  lyric({ lines: [TXT.next[1]], x: RX, y: 190, size: 136, style: "pop", t0: BEAT_T(20.5), stagger: 0.05, beat: 0.03, out: [11.04], outStyle: "up", spacing: 0.02 });
  lyric({ lines: [TXT.together], x: RX + 6, y: 360, size: 50, style: "type", t0: BEAT_T(21.5), stagger: 0.045, dur: 0.05, out: [11.06], outStyle: "up", outStagger: 0.004, spacing: 0.06 });
  lyric({ lines: ["DIET JOURNEY"], x: 1850, y: 60, size: 64, font: "Montserrat", weight: 800, vertical: true, style: "rise", t0: BEAT_T(22), stagger: 0.03, out: [11.08], outStyle: "up", spacing: 0.04 });
  lyric({ lines: ["for the best me."], x: 1770, y: 70, size: 34, font: "DM Mono", weight: 400, vertical: true, style: "type", t0: BEAT_T(22.5), stagger: 0.035, dur: 0.05, out: [11.1], outStyle: "fade", spacing: 0.12 });
  // GOAL copy rides in the frame (world space)
  const goalText = [
    lyric({ layer: world, lines: ["GOAL"], x: GOAL_X + 20, y: GOAL_Y + 44, size: 54, font: "Montserrat", weight: 800, style: "pop", t0: 11.62, stagger: 0.04, spacing: 0.04 }),
    lyric({ layer: world, lines: ["12.25"], x: GOAL_X + 18, y: GOAL_Y + 108, size: 106, font: "Montserrat", weight: 800, style: "slam", t0: CUES.goal, stagger: 0.05, spacing: 0 }),
    lyric({ layer: world, lines: ["X'mas"], x: GOAL_X + 22, y: GOAL_Y + 222, size: 70, font: "Montserrat", weight: 800, style: "pop", t0: CUES.goal + 0.2, stagger: 0.04, spacing: 0.02 }),
    lyric({ layer: world, lines: TXT.goal, x: GOAL_X + 22, y: GOAL_Y + 316, size: 34, lh: 48, weight: 700, style: "rise", t0: 12.3, stagger: 0.018, spacing: 0.04 }),
  ];

  // ticker: the words printed on her bag and the side of the key visual
  const ticker = h("div", "ticker", top, "MY FUTURE IS MINE.  ・  ETOILE GYM  ・  DIET JOURNEY  ・  ".repeat(8));

  // X'mas lights strung across the top once the goal is in sight
  const lr = rng(5);
  const LIGHTS = Array.from({ length: 34 }, (_, i) => {
    const x = 20 + i * 57, sag = 34 * Math.sin((Math.PI * ((x % 640) / 640)));
    return { x, y: 34 + sag, ph: lr() * 6.28, c: [WHITE, BLUSH, "#ffe3a3"][i % 3], e: s("circle", { cx: x, cy: 34 + sag, r: 7, fill: WHITE, opacity: 0 }, fxb) };
  });
  const wire = s("path", { d: "M0 34 " + Array.from({ length: 3 }, (_, k) => `Q${k * 640 + 320} ${34 + 68} ${k * 640 + 640} 34`).join(" "), fill: "none", stroke: WHITE, "stroke-width": 2, opacity: 0 }, fxb);

  // sparkles (the four-point star of the key visual), drifting in the near layer
  const sr = rng(31);
  const SPARK = Array.from({ length: 30 }, () => {
    const e = s("svg", { class: "abs", width: 40, height: 40, viewBox: "-50 -50 100 100" }, near);
    s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, e);
    return { e, wx: sr() * 9000, y: 60 + sr() * 880, sc: 0.3 + sr() * 0.8, ph: sr() * 6.28, par: 1.1 + sr() * 0.5 };
  });
  // speed lines while she strides toward the next station
  const SPEED = Array.from({ length: 16 }, () => ({ y: 520 + sr() * 360, x0: sr() * 2600, len: 120 + sr() * 260, v: 2200 + sr() * 1400, e: s("path", { ...stroke(4), opacity: 0 }, fxb) }));

  // stripes that wipe the low stretch away (the turn)
  const BARS = [BLUSH, WHITE, BLUSH, WHITE, MAGENTA].map((c, i) => {
    const e = h("div", "bar", wipe);
    e.style.background = c; e.style.width = "1100px";
    return { e, i };
  });

  // ---------------------------------------------------------------- end card
  const EC = {};
  const ec = (id, tag, text) => { const e = h(tag, "e", endcard, text); e.id = id; return (EC[id] = e); };
  ec("e-top", "div", TXT.top);
  ec("e-head", "div", "恋する乙女は、痩せて最高の私へ。");
  ec("e-kind", "div", "女性専用パーソナルジム");
  ec("e-logo", "div", "Étoile");
  ec("e-kana", "div", "エトワール");
  ec("e-tag", "div", "わたし史上、いちばん輝くために。");
  const FEATS = [["i-woman", "完全女性専用", "安心の", "プライベート空間"], ["i-coach", "パーソナル指導", "あなたに合わせた", "オーダーメイド"],
    ["i-food", "食事サポート", "無理なく続ける", "食習慣づくり"], ["i-bag", "手ぶらOK", "レンタル・アメニティ", "完備"]].map((f, i) => {
    const el = h("div", "feat", endcard);
    el.style.left = 110 + (i % 2) * 390 + "px"; el.style.top = 712 + Math.floor(i / 2) * 136 + "px";
    const sv = s("svg", { viewBox: "0 0 48 64" }, el);
    s("use", { href: "#" + f[0], color: WHITE }, sv);
    const tx = h("div", "", el);
    h("b", "", tx, f[1]); tx.appendChild(document.createTextNode(f[2])); h("br", "", tx); tx.appendChild(document.createTextNode(f[3]));
    return el;
  });
  const eWoman = h("div", "", endcard); eWoman.id = "e-woman";
  h("img", "", eWoman).src = "assets/woman.png";
  const EW = { s: 0.84, x: 1240, y: 1068 };
  const box = h("div", "", endcard); box.id = "e-box";
  const n1 = h("div", "n1", box); n1.innerHTML = "次の駅は、<br>理想の私。";
  h("div", "n2", box, TXT.together);
  h("div", "acc", box).innerHTML = ["心斎橋駅 徒歩5分", "梅田駅 徒歩7分", "女性トレーナーのみ在籍", "無料カウンセリング受付中"].join("<br>");
  const endStar = s("svg", { class: "abs", width: 90, height: 90, viewBox: "-50 -50 100 100" }, endcard);
  s("use", { href: "#star", x: -50, y: -50, width: 100, height: 100, fill: WHITE }, endStar);
  const endItems = [["e-top", 13.3], ["e-head", 13.14], ["e-kind", 13.22], ["e-logo", 13.26], ["e-kana", 13.34], ["e-tag", 13.36]]
    .map(([id, t0]) => ({ e: EC[id], t0 })).concat(FEATS.map((e, i) => ({ e, t0: 13.38 + i * 0.04 })), [{ e: box, t0: 13.3 }]);

  // grain: a few fixed noise frames, cycled per frame so exports stay deterministic
  const grain = $("grain"), gctx = grain.getContext("2d");
  const GRAIN = Array.from({ length: 4 }, (_, k) => {
    const img = gctx.createImageData(960, 540), r = rng(900 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = 200 + r() * 55; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    return img;
  });

  // ---------------------------------------------------------------- render
  let clipWant = null;
  function render(t) {
    const cam = camX(t);
    world.style.transform = tf(-cam, 0);
    const beat = kt.beatPulse(t), bar = kt.barPulse(t);

    // --- background: low stretch darkens, the turn brings the colour back
    const low = seg(t, 5.55, 5.95, E.sine) * (t < CUES.turn ? 1 : 0);
    shade.style.opacity = (0.42 * low).toFixed(3);
    stage.style.background = MAGENTA;
    far.style.opacity = (0.55 * seg(t, 1.9, 2.3) * (1 - 0.6 * low)).toFixed(3);
    band.style.transform = tf(200 - cam * 0.3, 0);

    // --- the map
    track.style.strokeDashoffset = Math.max(0, TRACK_LEN - (cam + 2400) * seg(t, 0.05, 0.6, E.out)); // draws in from the left
    upper.style.strokeDashoffset = UPPER_LEN * (1 - seg(t, 1.88, 2.4, E.io));
    deco.forEach((d) => { d.e.style.opacity = seg(t, d.t0, d.t0 + 0.3).toFixed(3); });
    pops.forEach((p) => p.setAttribute("r", (11 + 6 * beat).toFixed(2)));
    const sOn = t >= CUES.start;
    startCore.setAttribute("fill", sOn ? WHITE : MAGENTA);
    startNode.setAttribute("r", (20 + (sOn ? 6 * Math.exp(-(t - CUES.start) * 6) : 0) + 2 * beat).toFixed(2));
    const sr_ = clamp((t - CUES.start) / 0.6);
    startRing.setAttribute("r", 20 + sr_ * 70); startRing.setAttribute("opacity", sOn && sr_ < 1 ? (1 - sr_).toFixed(3) : 0);
    ST.forEach((st) => {
      const on = t >= st.t, dt = t - st.t;
      // everything on the map arrives with the upper line (1.9s); stations off to the right just scroll in
      const sx = st.wx - camX(1.9);
      const appear = sx > 1960 ? 1 : seg(t, 1.9 + (sx / 1920) * 0.35, 2.15 + (sx / 1920) * 0.35, E.back);
      st.el.style.opacity = clamp(appear * 1.5).toFixed(3);
      st.el.style.transform = tf(0, (1 - appear) * (st.line === "U" ? -24 : 24));
      st.core.setAttribute("fill", on ? WHITE : MAGENTA);
      st.core.setAttribute("r", on ? (8 + 12 * Math.exp(-dt * 7)).toFixed(2) : 8);
      const rq = clamp(dt / 0.55);
      st.ring.setAttribute("r", 18 + rq * 64); st.ring.setAttribute("opacity", on && rq < 1 ? (1 - rq).toFixed(3) : 0);
      const pop = on ? 1 + 0.22 * Math.exp(-dt * 8) * Math.cos(dt * 22) : 1;
      st.name.style.background = on ? WHITE : "transparent";
      st.name.style.color = on ? MAGENTA : WHITE;
      st.name.style.transform = `scale(${pop.toFixed(3)})`;
      st.el.style.visibility = appear > 0 ? "visible" : "hidden";
    });
    // GOAL frame draws as it comes into view, lights on its beat
    goalFrame.style.strokeDashoffset = GOAL_LEN * (1 - seg(t, 11.2, 11.75, E.io));
    const gOn = t >= CUES.goal, gd = t - CUES.goal;
    goalNode.setAttribute("r", (18 + (gOn ? 10 * Math.exp(-gd * 6) : 0) + 3 * beat).toFixed(2));
    goalNode.setAttribute("opacity", seg(t, 11.5, 11.6));
    const gq = clamp(gd / 0.7);
    goalRing.setAttribute("r", 18 + gq * 120); goalRing.setAttribute("opacity", gOn && gq < 1 ? (1 - gq).toFixed(3) : 0);
    const starS = seg(t, CUES.goal, CUES.goal + 0.35, E.back) * (1 + 0.12 * beat);
    const SX = GOAL_X + GW + 110, SY = GOAL_Y + 110;
    goalStar.setAttribute("transform", `translate(${SX} ${SY}) rotate(${(gOn ? gd * 40 : 0).toFixed(1)}) scale(${(1.9 * starS).toFixed(3)})`);
    goalRays.forEach((r) => {
      const q = clamp(gd / 0.6), r0 = 70 + 160 * E.out(q), r1 = r0 + 60 * (1 - q);
      r.e.setAttribute("d", `M${SX + Math.cos(r.a) * r0} ${SY + Math.sin(r.a) * r0} L${SX + Math.cos(r.a) * r1} ${SY + Math.sin(r.a) * r1}`);
      r.e.setAttribute("opacity", gOn && q < 1 ? 1 - q : 0);
    });

    // --- her
    const p = pose(t);
    if (CLIP) {
      const [x0, y0] = CLIP.crop;
      // hold her head and shoulders steady: the generated camera drifts a little
      const i = clamp(Math.floor(clipTime(t) * CLIP.fps), 0, CLIP.frames - 1);
      const drift = CLIP.cx ? CLIP.cx[i] - CLIP.cx[0] : 0;
      const ox = p.x - (CLIP.feet[0] - x0 + drift) * VS, oy = TY + p.y - (CLIP.feet[1] - y0) * VS;
      clipWrap.style.transform = tf(ox, oy);
      clipWant = clipTime(t);
    } else {
      woman.style.transformOrigin = `${SPR.ax}px ${SPR.ay}px`;
      woman.style.transform = tf(p.x - SPR.ax, TY + p.y - SPR.ay, ` rotate(${p.rot.toFixed(2)}deg) scale(${SS.toFixed(4)})`);
    }

    // --- type
    kt.render(t);
    ticker.style.opacity = (0.9 * seg(t, 1.9, 2.2) * (1 - seg(t, 11.2, 11.4))).toFixed(3);
    ticker.style.transform = tf(-((t * 140) % 1400) , 0);

    // --- lights, sparkles, speed lines
    const lv = seg(t, 11.3, 11.7);
    wire.setAttribute("opacity", 0.8 * lv);
    LIGHTS.forEach((l, i) => {
      const on = seg(t, 11.3 + i * 0.012, 11.4 + i * 0.012);
      const tw = 0.55 + 0.45 * Math.sin(t * 7 + l.ph);
      l.e.setAttribute("opacity", (on * tw).toFixed(3));
      l.e.setAttribute("fill", l.c);
      l.e.setAttribute("r", (6 + 3 * beat).toFixed(2));
    });
    const sparkV = t < 1.9 ? 0.4 : lerp(0.9, 0.3, low) + 0.1 * lv;
    SPARK.forEach((q) => {
      const x = ((((q.wx - cam * q.par) % 2400) + 2400) % 2400) - 240;
      const tw = 0.5 + 0.5 * Math.sin(t * 3.1 + q.ph);
      q.e.style.opacity = (sparkV * tw).toFixed(3);
      q.e.style.transform = tf(x - 20, q.y - 20, ` rotate(${(q.ph * 30 + t * 20).toFixed(1)}deg) scale(${(q.sc * (0.7 + 0.5 * beat)).toFixed(3)})`);
    });
    const spv = seg(t, 7.75, 8.0) * (1 - seg(t, 10.9, 11.2));
    SPEED.forEach((l) => {
      const x = 2100 - ((l.x0 + t * l.v) % 2600);
      l.e.setAttribute("d", `M${x} ${l.y} H${x + l.len}`);
      l.e.setAttribute("opacity", (spv * 0.7).toFixed(3));
    });

    // --- the turn: stripes sweep across, the colour comes back underneath
    const wp = seg(t, CUES.turn - 0.34, CUES.turn + 0.34, E.io);
    wipe.style.display = wp > 0 && wp < 1 ? "" : "none";
    BARS.forEach((b) => {
      const x = -500 + (4 - b.i) * 450 + (wp - 0.5) * 5200; // all five cover the frame at the midpoint
      b.e.style.transform = `translateX(${x.toFixed(1)}px) skewX(-18deg)`;
    });

    // --- the star sweeps across the lens and wipes to the end card
    const sw = seg(t, CUES.sweep[0], CUES.sweep[1], E.sine);
    const stx = lerp(-900, 3000, sw);
    sweep.style.display = t >= CUES.sweep[0] && t < CUES.sweep[1] ? "" : "none";
    sweepStar.setAttribute("transform", `translate(${stx.toFixed(1)} 540) rotate(${(sw * 90).toFixed(1)}) scale(14)`);
    endcard.style.display = t >= CUES.sweep[0] ? "" : "none";
    endcard.style.clipPath = t >= CUES.sweep[1] ? "none" : `inset(0 ${Math.max(0, 1920 - stx).toFixed(1)}px 0 0)`;
    $("scene").style.visibility = t >= CUES.sweep[1] ? "hidden" : "visible";
    endItems.forEach(({ e, t0 }) => {
      const q = seg(t, t0, t0 + 0.24, E.out);
      e.style.opacity = q.toFixed(3);
      e.style.transform = tf(0, (1 - q) * 26);
    });
    const wq = seg(t, 13.05, 13.45, E.out);
    eWoman.style.transform = tf(EW.x - SPR.ax * EW.s - (1 - wq) * 60, EW.y - SPR.ay * EW.s, ` scale(${EW.s})`);
    eWoman.style.opacity = wq.toFixed(3);
    const esq = seg(t, 13.42, 13.62, E.back);
    endStar.style.transform = tf(1800 - 45, 250 - 45, ` scale(${(1.6 * esq).toFixed(3)}) rotate(${(esq * 45).toFixed(1)}deg)`);

    gctx.putImageData(GRAIN[Math.floor(t * 30) % 4], 0, 0);
  }

  // ---------------------------------------------------------------- footage sync
  const clipFrameTime = (c) => (Math.floor(clamp(c, 0, CLIP.frames / CLIP.fps - 1e-3) * CLIP.fps) + 0.5) / CLIP.fps;
  function seekClip(c) { // resolves once the requested frame is decoded
    return new Promise((res) => {
      const target = clipFrameTime(c);
      if (Math.abs(clipVid.currentTime - target) < 1e-3 && clipVid.readyState >= 2) return res();
      clipVid.addEventListener("seeked", () => requestAnimationFrame(() => requestAnimationFrame(res)), { once: true });
      clipVid.currentTime = target;
    });
  }
  async function renderAsync(t) {
    render(t);
    if (CLIP && clipWant != null) await seekClip(clipWant);
  }
  function syncClip() { // live playback: let the video run, nudge it back when it drifts
    if (!CLIP) return;
    if (Math.abs(clipVid.currentTime - clipWant) > 0.1) clipVid.currentTime = clipWant;
    if (clipVid.paused) clipVid.play().catch(() => {});
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
  const clipReady = !CLIP ? Promise.resolve() : new Promise((r) => {
    if (clipVid.readyState >= 2) r(); else { clipVid.addEventListener("loadeddata", r, { once: true }); clipVid.addEventListener("error", r, { once: true }); }
  });
  const ready = Promise.all([...imgs, ...fonts, clipReady, document.fonts.ready]);
  window.MV = { DUR, CUES, render, renderAsync, ready, fps: 30, clip: CLIP && CLIP_NAME,
    debug: () => ({ st: ST.map((q) => [q.jp, Math.round(q.wx), q.line]), goal: GOAL_X, cam: [0, 1, 2, 5.6, 7.5, 11.25, 12.19, 13].map((t) => [t, Math.round(camX(t))]) }) };

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
