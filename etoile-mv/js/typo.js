/* Per-character kinetic type shared by the MV (kinetic.js) and the making-of (making.js).
 * KoiTypo(env) returns lyric(options) to lay out a line set, and render(t) to pose
 * every character for time t. Pure function of t, like the rest of the piece. */
window.KoiTypo = function KoiTypo(env) {
  "use strict";
  const { h, E, clamp, lerp, rng, BEAT, musicIn: MUSIC_IN, layer } = env;

  // ------------------------------------------------------------------ beat
  function beatPulse(t, sharp = 9) { // 1 on each beat, decaying; 0 before the groove
    if (t < MUSIC_IN) return 0;
    const b = (t - MUSIC_IN) / BEAT;
    return Math.exp(-(b - Math.floor(b)) * BEAT * sharp);
  }
  function barPulse(t) {
    if (t < MUSIC_IN) return 0;
    const b = (t - MUSIC_IN) / (BEAT * 4);
    return Math.exp(-(b - Math.floor(b)) * BEAT * 4 * 5);
  }

  // ------------------------------------------------------------------ lyric engine
  // A lyric is one or more lines of per-character spans. Each character enters at its
  // own time (segments let whole words land on the beat) and leaves with an out style.
  const IN = {
    pop: (q) => ({ y: (1 - q) * 34, s: lerp(0.2, 1, E.back(q)), o: clamp(q * 2.2) }),
    slam: (q) => ({ s: lerp(2.3, 1, E.outQ(q)), o: clamp(q * 3), r: (1 - E.outQ(q)) * -8 }),
    rise: (q) => ({ y: (1 - E.out(q)) * 56, o: q }),
    drop: (q) => ({ y: -(1 - E.back(q)) * 140, o: clamp(q * 2), r: (1 - q) * -24 }),
    wave: (q) => ({ y: Math.sin((1 - q) * Math.PI * 2.2) * 26 * (1 - q) + (1 - q) * 20, s: lerp(0.6, 1, E.back(q)), o: clamp(q * 2) }),
    flip: (q) => ({ rx: (1 - E.back(q)) * 95, o: clamp(q * 2.5) }),
    type: (q) => ({ o: q > 0 ? 1 : 0 }),
  };
  const OUT = {
    up: (q) => ({ y: -E.in(q) * 70, o: 1 - q }),
    fall: (q, i) => ({ y: q * q * 700, r: q * (i % 2 ? 50 : -40), o: 1 - clamp(q * 1.4 - 0.4) }),
    scatter: (q, i, rnd) => ({ x: (rnd - 0.5) * 420 * E.in(q), y: -E.in(q) * (120 + rnd * 200), r: (rnd - 0.5) * 200 * q, o: 1 - q }),
    fade: (q) => ({ o: 1 - q }),
    shrink: (q) => ({ s: 1 - E.in(q), o: 1 - q }),
  };
  const lyrics = [];
  function lyric(o) {
    const box = h("div", "ky" + (o.cls ? " " + o.cls : ""), o.layer || layer);
    const chars = [];
    const r = rng(o.seed || 11);
    o.lines.forEach((str, li) => {
      const line = h("div", "line" + (o.vertical ? " vert" : ""), box);
      if (o.vertical) { line.style.left = o.x - li * o.lh + "px"; line.style.top = o.y + "px"; }
      else { line.style.left = o.x + "px"; line.style.top = o.y + li * o.lh + "px"; }
      if (o.align === "right") line.style.transform = "translateX(-100%)";
      line.style.fontSize = o.size + "px";
      if (o.font) line.style.fontFamily = o.font;
      if (o.weight) line.style.fontWeight = o.weight;
      if (o.color) line.style.color = o.color;
      if (o.spacing != null) line.style.letterSpacing = o.spacing + "em";
      for (const ch of str) chars.push({ e: h("span", "", line, ch === " " ? "\u00a0" : ch), li, rnd: r() }); // inline-block spans drop plain spaces
    });
    // start time per character: segments are [firstCharIndex, time] pairs
    const segs = o.segs || [[0, o.t0]];
    chars.forEach((c, i) => {
      let k = 0;
      while (k + 1 < segs.length && i >= segs[k + 1][0]) k++;
      c.tin = segs[k][1] + (i - segs[k][0]) * (o.stagger ?? 0.02);
      c.tout = o.out ? o.out[0] + (o.outRev ? chars.length - 1 - i : i) * (o.outStagger ?? 0.01) : Infinity;
    });
    const L = { o, box, chars };
    lyrics.push(L);
    return L;
  }
  function renderLyric(L, t) {
    const o = L.o, dur = o.dur ?? 0.3, outDur = o.outDur ?? 0.28;
    let any = false;
    L.chars.forEach((c, i) => {
      const q = clamp((t - c.tin) / dur);
      let st = { x: 0, y: 0, s: 1, r: 0, rx: 0, o: 0 };
      if (t >= c.tin) Object.assign(st, IN[o.style || "pop"](q));
      if (t >= c.tout) {
        const oq = clamp((t - c.tout) / outDur), os = OUT[o.outStyle || "up"](oq, i, c.rnd);
        st.x += os.x || 0; st.y += os.y || 0; st.r += os.r || 0;
        st.s *= os.s ?? 1; st.o *= os.o ?? 1;
      }
      if (o.beat && t >= c.tin + dur) st.s *= 1 + o.beat * beatPulse(t);
      any = any || st.o > 0.001;
      c.e.style.opacity = st.o.toFixed(3);
      c.e.style.transform = `translate(${st.x.toFixed(1)}px,${st.y.toFixed(1)}px) rotate(${st.r.toFixed(1)}deg)` +
        (st.rx ? ` perspective(400px) rotateX(${st.rx.toFixed(1)}deg)` : "") + ` scale(${st.s.toFixed(3)})`;
    });
    L.box.style.visibility = any ? "visible" : "hidden";
  }

  return { lyric, beatPulse, barPulse, render: (t) => { for (const L of lyrics) renderLyric(L, t); } };
};
