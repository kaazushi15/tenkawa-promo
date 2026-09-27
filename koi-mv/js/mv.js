/* 恋する乙女のラブソング — 15s lyric-video teaser.
 * Every visual is a pure function of time: render(t). The player drives t from the
 * AudioContext clock; tools/render.mjs seeks frame by frame for the MP4 export. */
(() => {
  "use strict";

  // ---------------------------------------------------------------- constants
  const DUR = 15;
  const BEAT = 60 / 128;
  const FEET_Y = 940;          // her shoes rest on the main route
  const TRACK_Y = 948;
  const S = 0.74;              // sprite scale (sprites are 960x1090)
  const AX = 480, AY = 1062;   // sprite anchor: between her feet
  const HEART = { x: 410, y: 322, rot: 19, scale: 0.755 }; // cushion in sprite px

  const TXT = {
    t1: ["まだ、伝えられない", "気持ちがある。"],
    line: "LINEのメッセージ、何度も書いては消してる。",
    l2: ["「好き」って、たった一言が", "こんなに言えないなんて。"],
    l3: ["他の誰かじゃダメなの。", "あなたでなきゃ、ダメなの。"],
    title: "恋する乙女のラブソング",
    artist: "YOSHINA",
    song: "YOSHINA LOVE SONG",
  };

  // Moments the picture and the soundtrack agree on (seconds).
  const CUES = {
    land: 1.875,
    stations: { fuan: 2.344, suki: 3.75, namida: 6.35, kataomoi: 8.15, yuuki: 11.25 },
    envelope: 3.5,
    typeStart: 3.62, typeEnd: 4.08, eraseStart: 4.2, eraseEnd: 4.34, keepChars: 10,
    slip: 5.8, reach: 6.25, runStart: 6.45, jump: 8.0, catch: 8.15, landCatch: 8.35,
    pulse: [8.15, 8.55],
    relief: 10.3,
    recap: [11.55, 11.7, 11.85, 12.0, 12.15],
    rise: [12.15, 12.5],
    sweep: [12.7, 13.35],
    endDone: 13.6,
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
    elastic: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 2 ** (-10 * p) * Math.sin(((p * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
  };
  const seg = (t, a, b, e = E.lin) => e(clamp((t - a) / (b - a)));
  const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));
  // piecewise curve: [[t, value, easeIntoThisKey], ...]
  function keys(list) {
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
  // rounded polyline → SVG path
  function route(pts, r = 42) {
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
  function catmull(pts, t) { // pts: [[t,x,y],...]
    let i = 1;
    while (i < pts.length - 1 && t > pts[i][0]) i++;
    const p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(pts.length - 1, i + 1)];
    const u = clamp((t - p1[0]) / (p2[0] - p1[0]));
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    return [f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
  }

  // ---------------------------------------------------------------- camera
  // The camera tracks left with her; world content therefore flows right.
  const camV = keys([[0, 0], [1.9, 0], [2.4, 260, E.io], [5.8, 260], [6.3, 90, E.io], [6.5, 120],
    [7.8, 760, E.in], [8.3, 15, E.out], [10.3, 15], [10.9, 300, E.io], [15, 300]]);
  const CAM = new Float64Array(15001);
  for (let i = 1; i <= 15000; i++) CAM[i] = CAM[i - 1] + camV((i - 0.5) / 1000) / 1000;
  const camX = (t) => {
    const f = clamp(t, 0, DUR) * 1000, i = Math.floor(f);
    return i >= 15000 ? CAM[15000] : lerp(CAM[i], CAM[i + 1], f - i);
  };

  // ---------------------------------------------------------------- character footage
  // A keyed Kling clip (clips/<name>.js, written by tools/key_clips.py) replaces the
  // cut-out sprites when it is present. ?clip=<name> picks another take.
  const CLIP_NAME = new URLSearchParams(location.search).get("clip") || "kling15";
  const CLIP = (window.KOI_CLIPS || {})[CLIP_NAME] || null;
  const VS = CLIP ? 760 / CLIP.height : 1; // clip px → stage px
  // story time → clip time; retime the footage against the cues here
  const clipTime = keys((CLIP && CLIP.sync) || [[1.4, 0], [1.87, 0.55], [5.8, 4.5], [8.15, 7.25], [10.3, 9.5], [13.4, 12.6]]);

  // ---------------------------------------------------------------- character
  const girlX = keys([[0, 2380], [1.4, 2380], [1.87, 1480], [2.2, 1466, E.out], [5.8, 1330],
    [6.25, 1326, E.out], [6.45, 1305, E.io], [8.0, 860], [8.35, 700], [8.75, 668, E.out],
    [10.3, 656], [12.7, 500], [15, 420]]);

  function pose(t) {
    let x = girlX(t), y = 0, rot = 0, sx = 1, sy = 1;
    if (CLIP) { // the footage carries her body motion; only the leap in is ours
      if (t < 1.87) { const u = clamp((t - 1.4) / 0.47); y = -(1 - u) * (0.45 + u) * 300; rot = lerp(-8, 0, u); }
      return { x, y, rot, sx, sy, hug: true };
    }
    if (t < 1.87) { // leaps in from the right edge
      const u = clamp((t - 1.4) / 0.47);
      y = -(1 - u) * (0.45 + u) * 300;
      rot = lerp(-8, -2, u); sx = 0.97; sy = 1.04;
    } else if (t < CUES.slip) { // elastic landing, then walks on the beat
      const l = t - 1.87;
      const sq = l < 0.6 ? Math.exp(-l * 9) * Math.cos(l * 26) : 0;
      sy = 1 - 0.1 * sq; sx = 1 + 0.07 * sq;
      const w = seg(t, 2.0, 2.3), p = t / BEAT;
      y = -12 * Math.abs(Math.sin(Math.PI * p)) * w;
      rot = (1.3 * Math.sin(Math.PI * p) - 1) * w;
    } else if (t < CUES.runStart) { // freezes, then reaches for the cushion
      sy = 1 + 0.025 * bump(t, 5.8, 5.98);
      rot = -3.5 * seg(t, 6.2, 6.45, E.io);
    } else if (t < CUES.jump) { // short anxious run
      const p = (t - 6.45) / (BEAT / 2), w = seg(t, 6.45, 6.7);
      y = -20 * Math.abs(Math.sin(Math.PI * p)) * w;
      rot = lerp(-3.5, -6, w) + 1.6 * Math.sin(Math.PI * p);
      sy = 1 + 0.02 * Math.cos(2 * Math.PI * p) * w;
    } else if (t < CUES.landCatch) { // leap and catch
      const u = (t - 8.0) / 0.35;
      y = -120 * 4 * u * (1 - u);
      rot = lerp(-8, -3, u); sy = 1 + 0.06 * Math.sin(Math.PI * u); sx = 1 - 0.03 * Math.sin(Math.PI * u);
    } else if (t < CUES.relief) { // lands, momentum carries forward, regains balance
      const l = t - 8.35, sq = Math.exp(-l * 7) * Math.cos(l * 22);
      sy = 1 - 0.09 * sq; sx = 1 + 0.06 * sq;
      rot = -3 * Math.exp(-l * 3) * Math.cos(l * 8);
      y = -3 * Math.sin(l * 3) * seg(t, 8.9, 9.3);
    } else { // walks on, relieved
      const p = t / BEAT, w = seg(t, 10.3, 10.6);
      y = -10 * Math.abs(Math.sin(Math.PI * p)) * w;
      rot = (1.1 * Math.sin(Math.PI * p) - 0.6) * w;
    }
    return { x, y, rot, sx, sy, hug: !(t >= CUES.slip && t < CUES.catch) };
  }
  function attach(p) { // where the hugged cushion sits for a given pose
    const dx = (HEART.x - AX) * S * p.sx, dy = (HEART.y - AY) * S * p.sy, r = (p.rot * Math.PI) / 180;
    return { x: p.x + dx * Math.cos(r) - dy * Math.sin(r), y: FEET_Y + p.y + dx * Math.sin(r) + dy * Math.cos(r), rot: HEART.rot + p.rot };
  }
  const A_SLIP = attach(pose(CUES.slip)), A_CATCH = attach(pose(CUES.catch));
  function clipHeart(t, p = pose(t)) { // cushion centre in the footage, on stage
    const i = clamp(Math.round(clipTime(t) * CLIP.fps), 0, CLIP.frames - 1);
    let hc = CLIP.heart[i];
    for (let k = 1; !hc && k < 12; k++) hc = CLIP.heart[i - k] || CLIP.heart[i + k];
    return hc && { x: p.x + (hc[0] - CLIP.feet[0]) * VS, y: FEET_Y + p.y + (hc[1] - CLIP.feet[1]) * VS };
  }
  const heldHeart = (t, p) => (CLIP && clipHeart(t, p)) || attach(p);
  // 片想い sits where the cushion comes to rest (screen, t = 8.0)
  const K_NODE = (CLIP && clipHeart(8.0)) || { x: 738, y: 284 };
  const HEART_PATH = [[5.8, A_SLIP.x, A_SLIP.y], [6.05, 1165, 382], [6.5, 1030, 318], [7.1, 880, 280],
    [7.7, 770, 284], [8.0, K_NODE.x, K_NODE.y], [8.15, A_CATCH.x, A_CATCH.y]];
  function heartFloat(t) {
    const [x, y] = catmull(HEART_PATH, t);
    const env = seg(t, 5.8, 6.2) * (1 - seg(t, 7.95, 8.15));
    return {
      x, y: y + Math.sin((t - 5.8) * 5.2) * 7 * env,
      rot: lerp(A_SLIP.rot, A_CATCH.rot, seg(t, 7.9, 8.15)) - 10 * env + 3 * Math.sin(t * 3.7) * env,
      sc: HEART.scale * (1 + 0.025 * Math.sin((t - 5.8) * 6) * env),
    };
  }
  const footX = (t) => girlX(t) - 70;

  // ---------------------------------------------------------------- stations
  const ST = [
    { id: "fuan", jp: "不安", en: "FUAN", icon: "i-broken", t: CUES.stations.fuan, sx: () => footX(CUES.stations.fuan) },
    { id: "suki", jp: "好き", en: "SUKI", t: CUES.stations.suki, sx: () => footX(CUES.stations.suki) },
    { id: "namida", jp: "涙", en: "NAMIDA", icon: "i-tear", t: CUES.stations.namida, sx: () => girlX(CUES.stations.namida) + 250 },
    { id: "kataomoi", jp: "片想い", en: "KATAOMOI", air: true, t: CUES.stations.kataomoi },
    { id: "yuuki", jp: "勇気", en: "YUUKI", icon: "i-phone", t: CUES.stations.yuuki, sx: () => footX(CUES.stations.yuuki) },
  ];
  for (const st of ST) {
    if (st.air) { st.wx = K_NODE.x - camX(8.0); st.wy = K_NODE.y; } else { st.wx = st.sx() - camX(st.t); st.wy = TRACK_Y; }
  }
  const byId = Object.fromEntries(ST.map((st) => [st.id, st]));

  // ---------------------------------------------------------------- DOM build
  const stage = $("stage"), mid = $("mid"), msvg = $("mid-svg"), far = $("far"), near = $("near");
  const fxb = $("fx-back"), fx = $("fx"), hud = $("hud"), endcard = $("endcard");
  const clipWrap = $("clip-wrap"), clipVid = $("clip");
  if (CLIP) {
    clipVid.src = CLIP.src;
    const [x0, y0, x1, y1] = CLIP.crop;
    clipVid.style.width = px((x1 - x0) * VS); clipVid.style.height = px((y1 - y0) * VS);
    clipWrap.style.transformOrigin = `${px((CLIP.feet[0] - x0) * VS)} ${px((CLIP.feet[1] - y0) * VS)}`;
  }
  const girl = $("girl"), girlFront = $("girl-front"), gHug = $("g-hug"), gEmpty = $("g-empty"), heart = $("heart"), sweep = $("sweep");

  const WHITE = "#fdfdf8", PINK = "#fb6c78", LIME = "#62c20c";
  const stroke = (w, extra = {}) => ({ fill: "none", stroke: WHITE, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...extra });

  // far layer: giant title fragments that drift behind her
  const FRAGS = [
    { txt: "恋", size: 470, wx: -380, top: 548 },
    { txt: "乙女の", size: 330, wx: -1760, top: 612 },
    { txt: "ソング", size: 300, wx: -3020, top: 652 },
  ].map((f) => {
    const e = h("div", "frag", far, f.txt);
    e.style.fontSize = f.size + "px"; e.style.top = f.top + "px";
    return { ...f, e };
  });
  // the title briefly assembles across the moving background in shot 6
  const ALIGN_T = 12.2;
  const ar = rng(7);
  const ALIGN = [...TXT.title].map((ch, i) => {
    const e = h("div", "frag", far, ch);
    e.style.fontSize = "150px"; e.style.top = "0px";
    return { e, tx: 118 + i * 152, ty: 318, k: 0.55 + ar() * 0.6, m: (ar() - 0.5) * 0.55 };
  });

  // main route: enters top-right, two rounded bends, then runs along her feet
  const mainPts = [[2080, 262], [1668, 262], [1668, TRACK_Y], [-3400, TRACK_Y]];
  const mainRoute = s("path", { d: route(mainPts, 60), ...stroke(16) }, msvg);
  const visRoute = s("path", { d: route([[2080, 262], [1668, 262], [1668, TRACK_Y], [-40, TRACK_Y]], 60) }, null);
  msvg.appendChild(visRoute);
  const MAIN_LEN = mainRoute.getTotalLength(), MAIN_VIS = visRoute.getTotalLength();
  visRoute.remove();
  mainRoute.style.strokeDasharray = MAIN_LEN;

  // chevrons along the main route point the way she travels
  for (let x = 1450; x > -3400; x -= 340) {
    s("path", { d: `M${x + 7} ${TRACK_Y - 8} L${x - 3} ${TRACK_Y} L${x + 7} ${TRACK_Y + 8}`, ...stroke(4, { stroke: LIME }) }, msvg);
  }

  const F = byId.fuan.wx, SK = byId.suki.wx, N = byId.namida.wx, K = byId.kataomoi.wx, Y = byId.yuuki.wx;
  const KY = byId.kataomoi.wy;
  const DOT = { "stroke-dasharray": "2 16" };
  // Everything except the main route arrives on the cut into shot 2 (1.4s);
  // 片想い's branch only grows once the cushion drifts toward it.
  const draws = [], pops = [];
  function drawn(d, w, t0, t1, extra) {
    const e = s("path", { d, ...stroke(w, extra) }, msvg);
    draws.push({ e, len: e.getTotalLength(), t0, t1, dotted: !!extra });
    return e;
  }
  function node(x, y, t0, r = 11) {
    pops.push({ e: s("circle", { cx: x, cy: y, r, fill: WHITE }, msvg), x, y, t0 });
  }
  // secondary routes hang off the stations so the map stays coherent if timings move
  drawn(route([[F + 220, TRACK_Y], [F + 220, 560], [SK - 170, 560], [SK - 170, TRACK_Y]]), 12, 1.42, 1.9);
  node((F + SK) / 2 + 25, 560, 1.72);
  drawn(route([[SK - 170, 560], [N - 100, 560], [N - 100, 830]]), 5, 1.6, 2.0, DOT);
  node(N - 100, 830, 1.95, 9);
  drawn(route([[N - 200, TRACK_Y], [N - 200, 700], [K + 300, 700], [K + 300, 470], [K - 250, 470]]), 12, 1.45, 2.0);
  node(K, 700, 1.8); node(K, 470, 1.85); node(K - 250, 470, 1.9);
  drawn(route([[K - 250, 470], [K - 580, 470], [K - 580, 780]]), 5, 1.7, 2.1, DOT);
  drawn(route([[Y - 400, TRACK_Y], [Y - 400, 620], [Y - 820, 620], [Y - 820, 800]]), 12, 1.5, 2.0);
  node(Y - 820, 800, 1.95);
  drawn(route([[Y - 820, 620], [Y - 1220, 620], [Y - 1220, 430], [Y - 1600, 430]]), 5, 1.6, 2.1, DOT);
  drawn(route([[Y - 1100, TRACK_Y], [Y - 1100, 760], [Y - 1550, 760]]), 12, 1.5, 2.0);
  node(Y - 1550, 760, 1.95);
  const kBranch = drawn(route([[K, TRACK_Y], [K, KY]]), 12, 7.15, 7.5);

  // shot 1 copy lives in the world and leaves before the cut into shot 3
  const t1 = h("div", "", mid); t1.id = "t1";
  const t1Chars = [];
  TXT.t1.forEach((str, li) => {
    const line = h("div", "line", t1);
    line.style.left = "112px"; line.style.top = 116 + li * 90 + "px";
    for (const ch of str) t1Chars.push(h("span", "", line, ch));
  });

  // station nodes, labels and icon tiles
  ST.forEach((st, i) => {
    st.t0 = st.air ? 7.42 : st.id === "yuuki" ? 10.35 : 1.46 + i * 0.07; // when the station appears
    const g = s("g", {}, msvg);
    st.ripple = s("circle", { cx: st.wx, cy: st.wy, r: 16, fill: "none", stroke: WHITE, "stroke-width": 5, opacity: 0 }, g);
    st.node = s("g", {}, g);
    if (st.air) {
      s("circle", { cx: st.wx, cy: st.wy, r: 28, fill: WHITE }, st.node);
      st.core = s("use", { href: "#i-heart", x: st.wx - 17, y: st.wy - 17, width: 34, height: 34, fill: PINK }, st.node);
    } else {
      s("circle", { cx: st.wx, cy: st.wy, r: 17, fill: WHITE }, st.node);
      st.core = s("circle", { cx: st.wx, cy: st.wy, r: 7, fill: LIME }, st.node);
      s("path", { d: `M${st.wx} ${st.wy + 17} V${st.wy + 30}`, ...stroke(5) }, st.node);
    }
    const box = h("div", "station" + (st.air ? " air" : ""), mid);
    h("b", "", box, st.jp); h("i", "", box, st.en);
    st.box = box;
    if (st.air) { box.style.left = st.wx - 44 + "px"; box.style.top = st.wy + "px"; }
    else { box.style.left = st.wx + "px"; box.style.top = st.wy + 30 + "px"; }
    if (st.icon) {
      const tile = h("div", "tile", mid);
      tile.style.left = st.wx + 84 + "px"; tile.style.top = st.wy + 38 + "px";
      const sv = s("svg", { viewBox: "0 0 36 36" }, tile);
      s("use", { href: "#" + st.icon, fill: "none", color: WHITE }, sv);
      st.tile = tile;
    }
  });
  // 涙: the tear falls onto the route and becomes the node
  const tear = s("path", { d: "M0 -30C0 -30 -15 -8 -15 4a15 15 0 0 0 30 0C15 -8 0 -30 0 -30Z", fill: WHITE }, msvg);

  // 片想い pulse: node → rightward along the route → the quiet lyric panel
  const PULSE_PTS = [[K, KY], [K + 200, KY], [K + 200, 118], [K + 236, 118]];
  const pulsePath = s("path", { d: route(PULSE_PTS, 40), ...stroke(10, { stroke: PINK }) }, msvg);
  const PULSE_LEN = pulsePath.getTotalLength();
  pulsePath.style.strokeDasharray = PULSE_LEN;
  const pulseDot = s("circle", { r: 13, fill: PINK, stroke: WHITE, "stroke-width": 5 }, msvg);
  const L3_X = K + 236 + camX(CUES.pulse[1]); // lyric panel starts where the pulse arrives

  // 勇気: the final line turns upward
  const risePath = s("path", { d: route([[Y - 190, TRACK_Y], [Y - 190, -60]], 40), ...stroke(16) }, msvg);
  node(Y - 190, TRACK_Y, 11.9);
  const RISE_LEN = risePath.getTotalLength();
  risePath.style.strokeDasharray = RISE_LEN;

  // near layer: petals
  const pr = rng(31);
  const PETALS = Array.from({ length: 46 }, () => {
    const e = s("svg", { class: "petal", viewBox: "0 0 22 16" }, near);
    s("path", { d: "M1 8C5 1 15 0 21 5C17 7 17 10 21 12C14 16 5 15 1 8Z", fill: "#f6bace" }, e);
    return { e, wx: -4200 + pr() * 6300, y: pr() * 1080, fall: 18 + pr() * 30, sway: 10 + pr() * 22, ph: pr() * 6.28, spin: (pr() - 0.5) * 240, sc: 0.7 + pr() * 0.9 };
  });
  // bursts at the landing and at the catch
  const br = rng(99);
  const BURSTS = [[CUES.land, 1], [CUES.catch, 1.3]].flatMap(([t0, pow]) =>
    Array.from({ length: 9 }, (_, i) => {
      const e = s("svg", { class: "petal", viewBox: "0 0 22 16" }, near);
      s("path", { d: "M1 8C5 1 15 0 21 5C17 7 17 10 21 12C14 16 5 15 1 8Z", fill: i % 3 ? "#f6bace" : WHITE }, e);
      const a = -Math.PI * (0.1 + 0.8 * (i / 8)) + (br() - 0.5) * 0.3;
      return { e, t0, v: (260 + br() * 260) * pow, a, spin: (br() - 0.5) * 720 };
    }));

  // fx: dotted branch 好き → cushion, speed lines, relief hearts
  const branch = s("path", { ...stroke(6, { stroke: WHITE, "stroke-dasharray": "2 15" }) }, fx);
  const branchHead = s("circle", { r: 9, fill: PINK, stroke: WHITE, "stroke-width": 4 }, fx);
  const sr = rng(5);
  const SPEED = Array.from({ length: 12 }, () => ({
    e: s("path", { ...stroke(6), opacity: 0 }, fxb), y: 140 + sr() * 760, len: 90 + sr() * 220, x0: sr() * 2400, v: 2200 + sr() * 1400,
  }));
  const RELIEF = [0, 1, 2].map((i) => ({ e: s("use", { href: "#i-heart", width: 44, height: 44, fill: PINK }, fx), t0: 10.35 + i * 0.17, dx: [-40, 20, -90][i] }));
  const ring = s("circle", { r: 20, fill: "none", stroke: WHITE, "stroke-width": 8, opacity: 0 }, fx);

  // hud: envelope + typing field, lyrics, right-edge route recap, credit
  const field = h("div", "", hud); field.id = "field";
  const env = s("svg", { width: 60, height: 60, viewBox: "0 0 60 60" }, field);
  env.style.position = "absolute"; env.style.left = "8px"; env.style.top = "7px";
  s("circle", { cx: 30, cy: 30, r: 29, fill: PINK }, env);
  s("rect", { x: 15, y: 20, width: 30, height: 21, rx: 3, fill: WHITE }, env);
  const flap = s("path", { d: "M15 21 L30 32 L45 21", fill: "none", stroke: PINK, "stroke-width": 3.2, "stroke-linejoin": "round" }, env);
  const fieldText = h("div", "", field); fieldText.id = "field-text";
  const typed = h("span", "", fieldText);
  const caret = h("span", "", fieldText); caret.id = "caret";

  const mkLines = (id, lines, x, y0, dy) => {
    const box = h("div", "", hud); box.id = id;
    const chars = [];
    lines.forEach((str, li) => {
      const line = h("div", "line", box);
      line.style.left = x + "px"; line.style.top = y0 + li * dy + "px";
      for (const ch of str) chars.push(h("span", "", line, ch));
    });
    return chars;
  };
  const l2Chars = mkLines("l2", TXT.l2, 112, 124, 84);
  const l3Dash = h("div", "dash", hud); l3Dash.style.left = px(L3_X); l3Dash.style.top = "116px";
  const l3Chars = mkLines("l3", TXT.l3, L3_X + 34, 150, 78);

  const credit = h("div", "", hud, TXT.song); credit.id = "credit";

  const HUD_X = 1856, HUD_Y = [884, 752, 620, 488, 356];
  const hudSvg = s("svg", { width: 1920, height: 1080 }, hud);
  hudSvg.style.position = "absolute";
  const hudLine = s("path", { d: `M${HUD_X} 950 V${HUD_Y[4]}`, ...stroke(6) }, hudSvg);
  const hudRise = s("path", { d: `M${HUD_X} ${HUD_Y[4]} V120 M${HUD_X - 14} 136 L${HUD_X} 120 L${HUD_X + 14} 136`, ...stroke(6) }, hudSvg);
  const HUD_LEN = 950 - HUD_Y[4], HUD_RISE = hudRise.getTotalLength();
  hudLine.style.strokeDasharray = HUD_LEN; hudRise.style.strokeDasharray = HUD_RISE;
  const hudNodes = ST.map((st, i) => {
    const g = s("g", {}, hudSvg);
    const halo = s("circle", { cx: HUD_X, cy: HUD_Y[i], r: 12, fill: "none", stroke: WHITE, "stroke-width": 4, opacity: 0 }, g);
    const dot = s("circle", { cx: HUD_X, cy: HUD_Y[i], r: 11, fill: WHITE, stroke: WHITE, "stroke-width": 4 }, g);
    return { g, halo, dot, t: st.t };
  });

  // end card
  const np = h("div", "", endcard); np.id = "np";
  np.append("NOW PLAYING "); h("span", "", np, "▶").id = "np-tri";
  const title = h("div", "", endcard); title.id = "title";
  const titleChars = [...TXT.title].map((ch) => h("span", "", title, ch));
  const endSvg = s("svg", { width: 1920, height: 1080 }, endcard);
  endSvg.style.position = "absolute";
  const endRoute = s("path", { d: route([[1990, 800], [1836, 800], [1836, 480], [1768, 480]], 46), ...stroke(16) }, endSvg);
  const END_LEN = endRoute.getTotalLength();
  endRoute.style.strokeDasharray = END_LEN;
  const endNode = s("g", {}, endSvg);
  s("circle", { cx: 1740, cy: 480, r: 34, fill: WHITE }, endNode);
  s("use", { href: "#i-heart", x: 1719, y: 459, width: 42, height: 42, fill: PINK }, endNode);
  // the journey, recapped small along the bottom of the end card
  const JX = [150, 470, 790, 1110, 1430], JY = 930;
  const journey = s("path", { d: `M${JX[0]} ${JY} H${JX[4]}`, ...stroke(8) }, endSvg);
  const J_LEN = JX[4] - JX[0];
  journey.style.strokeDasharray = J_LEN;
  const jStops = ST.map((st, i) => {
    const g = s("g", {}, endSvg);
    s("circle", { cx: JX[i], cy: JY, r: 13, fill: WHITE }, g);
    s("circle", { cx: JX[i], cy: JY, r: 6, fill: PINK }, g);
    const lb = h("div", "jlabel", endcard);
    h("b", "", lb, st.jp); h("i", "", lb, st.en);
    lb.style.left = JX[i] + "px"; lb.style.top = JY + 26 + "px";
    return { g, lb, x: JX[i] };
  });
  const yoshina = h("div", "", endcard, TXT.artist); yoshina.id = "yoshina";
  const yls = h("div", "", endcard, TXT.song); yls.id = "yls";

  // paper grain + soft vignette, drawn once
  (function grain() {
    const c = $("grain"), g = c.getContext("2d"), img = g.createImageData(c.width, c.height), r = rng(3);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 255 - r() * 30 - (r() < 0.012 ? 30 : 0);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const v = g.createRadialGradient(480, 270, 180, 480, 270, 620);
    v.addColorStop(0, "rgba(255,255,255,0)"); v.addColorStop(1, "rgba(150,170,120,0.55)");
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
  })();

  // ---------------------------------------------------------------- render
  const tf = (x, y, extra = "") => `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)${extra}`;

  function render(t) {
    t = clamp(t, 0, DUR);
    const cam = camX(t);

    // world layers
    mid.style.transform = tf(cam, 0);
    mainRoute.style.strokeDashoffset = t < 1.3 ? lerp(MAIN_LEN, MAIN_LEN - MAIN_VIS, seg(t, 0.05, 1.2, E.io)) : 0;
    for (const d of draws) {
      const q = seg(t, d.t0, d.t1, E.io);
      d.e.style.visibility = q > 0 ? "visible" : "hidden"; // a zero-length round-capped dash still paints a dot
      if (d.dotted) d.e.style.strokeDasharray = dashReveal(d.len, q, 2, 16);
      else { d.e.style.strokeDasharray = d.len; d.e.style.strokeDashoffset = d.len * (1 - q); }
    }
    for (const n of pops) {
      const q = seg(t, n.t0, n.t0 + 0.3, E.back);
      n.e.setAttribute("transform", `translate(${n.x} ${n.y}) scale(${q.toFixed(3)}) translate(${-n.x} ${-n.y})`);
    }
    t1Chars.forEach((c, i) => {
      const p = seg(t, 0.1 + i * 0.02, 0.38 + i * 0.02, E.out);
      const o = seg(t, 3.08 + i * 0.012, 3.26 + i * 0.012, E.in);
      c.style.opacity = p * (1 - o); c.style.transform = tf(0, (1 - p) * 42 + o * 30);
    });

    // title fragments appear on the cut into shot 3 and drift slower than the routes
    const reveal = seg(t, 3.4, 3.62, E.out);
    FRAGS.forEach((f) => {
      f.e.style.transform = tf(f.wx + cam, 0);
      f.e.style.clipPath = `inset(0 ${((1 - reveal) * 100).toFixed(1)}% 0 0)`;
    });
    const aCam = camX(ALIGN_T), aVis = seg(t, 11.2, 11.6) * (1 - seg(t, 12.62, 12.7));
    ALIGN.forEach((a) => {
      const d = cam - aCam;
      a.e.style.opacity = aVis;
      a.e.style.transform = tf(a.tx + d * a.k, a.ty + d * a.m);
    });

    // stations
    for (const st of ST) {
      const on = t >= st.t, dt = t - st.t;
      st.box.classList.toggle("lit", on);
      const ap = seg(t, st.t0, st.t0 + 0.3, E.back);
      // 勇気 glides in along the route from the left edge
      const gl = st.id === "yuuki" ? -950 * (1 - seg(t, 10.35, 10.95, E.outQ)) : 0;
      const pop = ap * (on ? 1 + 0.16 * Math.exp(-dt * 7) * Math.sin(dt * 20 + 1.3) : 1);
      st.box.style.transform = `translateX(${gl.toFixed(1)}px) ` + (st.air ? "translate(-100%,-50%)" : "translate(-50%,0)") + ` scale(${pop.toFixed(3)})`;
      if (st.id !== "namida") st.node.setAttribute("transform", `translate(${st.wx + gl} ${st.wy}) scale(${ap.toFixed(3)}) translate(${-st.wx} ${-st.wy})`);
      st.box.style.background = on ? PINK : ""; st.box.style.color = on ? WHITE : "";
      st.core.setAttribute("fill", on ? PINK : st.air ? PINK : LIME);
      if (!st.air) st.core.setAttribute("r", on ? 9 : 7);
      const rp = clamp(dt / 0.6);
      st.ripple.setAttribute("r", 17 + rp * 70); st.ripple.setAttribute("opacity", on && dt < 0.6 ? (1 - rp).toFixed(3) : 0);
      if (st.tile) {
        const b = on ? Math.exp(-dt * 6) : 0;
        let tr = `scale(${(1 + 0.35 * b * Math.abs(Math.sin(dt * 16))).toFixed(3)})`;
        if (st.id === "yuuki") tr += ` rotate(${(on && dt < 0.7 ? 14 * Math.sin(dt * 55) * (1 - dt / 0.7) : 0).toFixed(2)}deg)`;
        st.tile.style.transform = `translateX(${gl.toFixed(1)}px) ` + tr + ` scale(${seg(t, st.t0 + 0.05, st.t0 + 0.35, E.back).toFixed(3)})`;
        st.tile.style.background = on ? PINK : "transparent";
      }
    }
    // 涙's node only exists once the tear lands
    const nd = byId.namida, drop = seg(t, 6.35, 6.6, E.in);
    tear.setAttribute("transform", `translate(${nd.wx} ${lerp(780, TRACK_Y - 4, drop)}) scale(${t < 6.6 ? 1 : 0})`);
    tear.setAttribute("opacity", t >= 6.3 && t < 6.6 ? seg(t, 6.3, 6.38) : 0);
    const landed = seg(t, 6.6, 6.9, E.elastic);
    nd.node.setAttribute("transform", `translate(${nd.wx} ${TRACK_Y}) scale(${t < 6.6 ? 0 : landed}) translate(${-nd.wx} ${-TRACK_Y})`);
    const nr = clamp((t - 6.6) / 0.6);
    nd.ripple.setAttribute("r", 17 + nr * 80); nd.ripple.setAttribute("opacity", t >= 6.6 && t < 7.2 ? 1 - nr : 0);

    // 片想い: pulse runs rightward to the lyric panel
    const pp = seg(t, CUES.pulse[0], CUES.pulse[1], E.io);
    pulsePath.style.strokeDashoffset = PULSE_LEN * (1 - pp);
    pulsePath.setAttribute("opacity", t >= CUES.pulse[0] ? 1 : 0);
    const pt = pulsePath.getPointAtLength(PULSE_LEN * pp);
    pulseDot.setAttribute("cx", pt.x); pulseDot.setAttribute("cy", pt.y);
    pulseDot.setAttribute("opacity", t >= CUES.pulse[0] && t < CUES.pulse[1] + 0.1 ? 1 : 0);
    risePath.style.strokeDashoffset = RISE_LEN * (1 - seg(t, CUES.rise[0], CUES.rise[1], E.io));

    // character
    const p = pose(t);
    const onStage = t >= 1.4 && t <= 13.4;
    clipWrap.style.visibility = CLIP && onStage ? "visible" : "hidden"; // a display:none video may not repaint after a seek
    if (CLIP) {
      const [x0, y0] = CLIP.crop;
      clipWrap.style.transform = tf(p.x - (CLIP.feet[0] - x0) * VS, FEET_Y + p.y - (CLIP.feet[1] - y0) * VS, ` rotate(${p.rot.toFixed(2)}deg)`);
      clipWant = onStage ? clipTime(t) : null;
    }
    girl.style.transform = tf(p.x - AX * S, FEET_Y - AY * S + p.y, ` rotate(${p.rot.toFixed(2)}deg) scale(${p.sx.toFixed(3)},${p.sy.toFixed(3)})`);
    girlFront.style.transform = girl.style.transform;
    girlFront.style.display = t >= CUES.slip && t < CUES.slip + 0.5 ? "" : "none"; // cushion slips out from under her sleeve
    gHug.style.opacity = p.hug ? 1 : 0; gEmpty.style.opacity = p.hug ? 0 : 1;
    girl.style.display = CLIP || !onStage ? "none" : "";
    if (CLIP) girlFront.style.display = "none";
    if (!p.hug && !CLIP) {
      const hf = heartFloat(t);
      heart.style.display = "";
      heart.style.transform = tf(hf.x - 170, hf.y - 160, ` rotate(${hf.rot.toFixed(2)}deg) scale(${hf.sc.toFixed(3)})`);
    } else heart.style.display = "none";
    // catch flash
    const cr = clamp((t - CUES.catch) / 0.45);
    const ca = heldHeart(CUES.catch, pose(CUES.catch));
    ring.setAttribute("cx", ca.x); ring.setAttribute("cy", ca.y);
    ring.setAttribute("r", 60 + cr * 150); ring.setAttribute("opacity", t >= CUES.catch && cr < 1 ? (1 - cr) * 0.9 : 0);

    // petals drift in the near layer (faster parallax)
    const pv = seg(t, 1.4, 1.9);
    PETALS.forEach((q) => {
      let x = q.wx + cam * 1.5 + Math.sin(t * 1.3 + q.ph) * q.sway;
      const y = ((q.y + t * q.fall) % 1140) - 30;
      q.e.style.opacity = pv;
      q.e.style.transform = tf(x, y, ` rotate(${(q.ph * 57 + t * q.spin).toFixed(1)}deg) scale(${q.sc.toFixed(2)})`);
    });
    BURSTS.forEach((b) => {
      const dt = t - b.t0, on = dt >= 0 && dt < 1.2;
      b.e.style.opacity = on ? 1 - dt / 1.2 : 0;
      if (!on) return;
      const o = b.t0 < 5 ? { x: girlX(b.t0) - 40, y: FEET_Y - 20 } : ca;
      const d = b.v * (1 - Math.exp(-dt * 3)) / 3;
      b.e.style.transform = tf(o.x + Math.cos(b.a) * d, o.y + Math.sin(b.a) * d + 60 * dt * dt, ` rotate(${(dt * b.spin).toFixed(1)}deg)`);
    });

    // dotted branch 好き → the cushion she is holding
    const bv = seg(t, 3.75, 4.05, E.out) * (1 - seg(t, 5.55, 5.8));
    if (bv > 0) {
      const nx = byId.suki.wx + cam, ny = TRACK_Y, hp = heldHeart(t, p);
      branch.setAttribute("d", `M${nx} ${ny} Q${nx - 300} ${(ny + hp.y) / 2 + 40} ${hp.x - 60} ${hp.y + 30}`);
      const L = branch.getTotalLength(), grow = seg(t, 3.75, 4.05, E.out);
      branch.style.strokeDasharray = dashReveal(L, grow);
      branch.setAttribute("opacity", bv);
      const q = branch.getPointAtLength(L * grow);
      branchHead.setAttribute("cx", q.x); branchHead.setAttribute("cy", q.y); branchHead.setAttribute("opacity", bv);
    } else { branch.setAttribute("opacity", 0); branchHead.setAttribute("opacity", 0); }

    // speed lines during the chase
    const sv = seg(t, 6.5, 6.8) * (1 - seg(t, 7.9, 8.2));
    SPEED.forEach((l) => {
      const x = ((l.x0 + (t - 6.5) * l.v) % 2600) - 340;
      l.e.setAttribute("d", `M${x} ${l.y} H${x + l.len}`);
      l.e.setAttribute("opacity", (sv * 0.85).toFixed(3));
    });
    // relief: little hearts rise from her head
    RELIEF.forEach((r) => {
      const dt = t - r.t0, on = dt >= 0 && dt < 1.1, hx = p.x - 60 + r.dx, hy = FEET_Y - 690 + p.y;
      r.e.setAttribute("opacity", on ? bump(t, r.t0, r.t0 + 1.1) : 0);
      r.e.setAttribute("transform", `translate(${hx} ${hy - dt * 120}) scale(${(0.6 + 0.4 * seg(t, r.t0, r.t0 + 0.3, E.back)).toFixed(3)})`);
    });

    // shot 3: envelope opens, a message is typed, erased, and replaced
    const fOpen = seg(t, 3.62, 3.8, E.out), fClose = seg(t, 4.34, 4.44, E.in);
    field.style.opacity = t >= 3.4 && t < 4.46 ? seg(t, 3.4, 3.5) : 0;
    field.style.width = px(lerp(74, 1004, fOpen) * (1 - fClose) + 74 * fClose);
    field.style.transform = `scale(${lerp(0.6, 1, seg(t, 3.4, 3.52, E.back)).toFixed(3)})`;
    flap.setAttribute("transform", `translate(0 21) scale(1 ${lerp(1, -1, seg(t, 3.5, 3.62, E.io)).toFixed(3)}) translate(0 -21)`);
    const chars = [...TXT.line];
    let n = Math.round(chars.length * seg(t, CUES.typeStart, CUES.typeEnd));
    if (t >= CUES.eraseStart) n = Math.round(lerp(chars.length, CUES.keepChars, seg(t, CUES.eraseStart, CUES.eraseEnd)));
    typed.textContent = chars.slice(0, n).join("");
    caret.style.opacity = t < 4.1 || Math.floor(t * 8) % 2 === 0 ? 1 : 0;
    const l2Out = seg(t, 5.66, 5.8);
    l2Chars.forEach((c, i) => {
      const q = seg(t, 4.36 + i * 0.011, 4.56 + i * 0.011, E.back);
      c.style.opacity = q * (1 - l2Out);
      c.style.transform = tf(0, (1 - q) * 30 - l2Out * 18);
    });

    // shot 5: the pulse lands, the lyric settles and holds
    l3Dash.style.width = px((1812 - L3_X) * seg(t, 8.5, 8.72, E.out));
    const l3Out = seg(t, 10.18, 10.32);
    l3Dash.style.opacity = t < 8.5 ? 0 : 1 - l3Out;
    l3Chars.forEach((c, i) => {
      const q = seg(t, 8.55 + i * 0.016, 8.62 + i * 0.016, E.out);
      c.style.opacity = q * (1 - l3Out);
      c.style.transform = tf(0, (1 - q) * 26);
    });

    // hud route recap
    credit.style.opacity = seg(t, 1.6, 2.0);
    hudLine.style.strokeDashoffset = HUD_LEN * (1 - seg(t, 1.9, 2.4, E.io));
    hudRise.style.strokeDashoffset = HUD_RISE * (1 - seg(t, CUES.rise[0], CUES.rise[1], E.io));
    hudNodes.forEach((nn, i) => {
      const on = t >= nn.t, show = seg(t, 1.9 + (4 - i) * 0.08, 2.1 + (4 - i) * 0.08);
      nn.g.setAttribute("opacity", show);
      nn.dot.setAttribute("fill", on ? PINK : WHITE);
      const rc = CUES.recap[i];
      const k = Math.max(on ? Math.exp(-(t - nn.t) * 6) : 0, t >= rc ? Math.exp(-(t - rc) * 7) : 0);
      nn.dot.setAttribute("r", (11 + 7 * k).toFixed(2));
      const hr = t >= rc ? clamp((t - rc) / 0.45) : on ? clamp((t - nn.t) / 0.45) : 1;
      nn.halo.setAttribute("r", 12 + hr * 26); nn.halo.setAttribute("opacity", hr < 1 ? 1 - hr : 0);
    });

    // shot 7: the cushion sweeps across the lens and wipes to the end card
    const sw = seg(t, CUES.sweep[0], CUES.sweep[1], E.sine);
    const sx = lerp(-1250, 3300, sw);
    sweep.style.display = t >= CUES.sweep[0] && t < CUES.sweep[1] ? "" : "none";
    sweep.style.transform = tf(sx - 170, 560 - 160, ` rotate(${lerp(-14, 12, sw).toFixed(2)}deg) scale(7.4)`);
    sweep.style.filter = "blur(2.2px)";
    const edge = sx - 640;
    endcard.style.display = t >= CUES.sweep[0] ? "" : "none";
    endcard.style.clipPath = t >= CUES.sweep[1] ? "none" : `inset(0 ${Math.max(0, 1920 - edge).toFixed(1)}px 0 0)`;
    $("scene").style.visibility = t >= CUES.sweep[1] ? "hidden" : "visible";

    np.style.opacity = seg(t, 13.02, 13.25);
    np.style.transform = tf(lerp(-40, 0, seg(t, 13.02, 13.3, E.out)), 0);
    titleChars.forEach((c, i) => {
      const q = seg(t, 13.08 + i * 0.024, 13.34 + i * 0.024, E.back);
      c.style.opacity = clamp(q * 1.6);
      c.style.transform = tf(0, (1 - q) * 70, ` scale(${lerp(0.85, 1, q).toFixed(3)})`);
    });
    endRoute.style.strokeDashoffset = END_LEN * (1 - seg(t, 13.12, 13.45, E.io));
    const nodeIn = seg(t, 13.4, 13.6, E.back);
    endNode.setAttribute("transform", `translate(1740 480) scale(${nodeIn.toFixed(3)}) translate(-1740 -480)`);
    yoshina.style.opacity = seg(t, 13.24, 13.48);
    yoshina.style.transform = tf(0, lerp(24, 0, seg(t, 13.24, 13.5, E.out)));
    yls.style.opacity = seg(t, 13.32, 13.56);
    yls.style.transform = tf(0, lerp(20, 0, seg(t, 13.32, 13.58, E.out)));
    journey.style.strokeDashoffset = J_LEN * (1 - seg(t, 13.2, 13.5, E.io));
    jStops.forEach((j, i) => {
      const q = seg(t, 13.24 + i * 0.05, 13.4 + i * 0.05, E.back);
      j.g.setAttribute("transform", `translate(${j.x} ${JY}) scale(${q.toFixed(3)}) translate(${-j.x} ${-JY})`);
      j.lb.style.opacity = seg(t, 13.28 + i * 0.05, 13.44 + i * 0.05);
    });
  }

  // ---------------------------------------------------------------- footage sync
  let clipWant = null;
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
    if (clipWant == null) { if (!clipVid.paused) clipVid.pause(); return; }
    if (Math.abs(clipVid.currentTime - clipWant) > 0.1) clipVid.currentTime = clipWant;
    if (clipVid.paused) clipVid.play().catch(() => {});
  }

  // dotted line revealed along its length: dashes up to L*p, then a long gap
  function dashReveal(L, p, dash = 2, gap = 15) {
    const shown = L * p, unit = dash + gap, out = [];
    let acc = 0;
    while (acc + unit <= shown) { out.push(dash, gap); acc += unit; }
    out.push(0, L + 20);
    return out.join(" ");
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
  const fonts = ['900 60px "Zen Maru Gothic"', '700 60px "Zen Maru Gothic"', '900 30px "Nunito"', '800 30px "Nunito"']
    .map((f) => document.fonts.load(f, "恋あLINE"));
  const clipReady = !CLIP ? Promise.resolve() : new Promise((r) => {
    if (clipVid.readyState >= 2) r(); else { clipVid.addEventListener("loadeddata", r, { once: true }); clipVid.addEventListener("error", r, { once: true }); }
  });
  const ready = Promise.all([...imgs, ...fonts, clipReady, document.fonts.ready]);

  window.MV = { DUR, CUES, render, renderAsync, ready, fps: 30, clip: CLIP && CLIP_NAME,
    debug: () => ({ st: ST.map((q) => [q.id, Math.round(q.wx), q.wy]), cam: [0, 1.4, 2.35, 3.4, 3.75, 5.8, 6.35, 8, 8.5, 10.3, 11.25, 12.2, 12.7, 15].map((t) => [t, Math.round(camX(t)), Math.round(girlX(t))]) }) };

  const still = params.get("t");
  ready.then(() => renderAsync(still != null ? parseFloat(still) : 13.9));
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
