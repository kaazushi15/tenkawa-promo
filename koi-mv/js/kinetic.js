/* Kinetic typography and background motion for 恋する乙女のラブソング.
 * mv.js calls KoiKinetic(env) once with its layers and helpers, then calls the
 * returned render(t) every frame. Everything here is a pure function of t. */
window.KoiKinetic = function KoiKinetic(env) {
  "use strict";
  const { h, s, seg, E, clamp, lerp, bump, rng, camX, BEAT, layers, WHITE, PINK, tf } = env;
  const MUSIC_IN = 1.875; // first downbeat of the groove

  const typo = window.KoiTypo({ h, E, clamp, lerp, rng, BEAT, musicIn: MUSIC_IN, layer: layers.lyrics });
  const { lyric, beatPulse, barPulse } = typo;

  // ------------------------------------------------------------------ the lyric sheet
  const B = (n) => MUSIC_IN + n * BEAT; // beat n after the groove starts
  const JP = "'Zen Maru Gothic', sans-serif", EN = "'Nunito', sans-serif";

  // shot 1: the opening line, a vertical aside and small credits
  lyric({ lines: ["まだ、伝えられない", "気持ちがある。"], x: 112, y: 116, lh: 90, size: 66, spacing: 0.04,
    t0: 0.1, stagger: 0.02, dur: 0.3, style: "pop", out: [1.98, 2.2], outStyle: "scatter", outStagger: 0.008, outDur: 0.34 });
  lyric({ lines: ["こいのなやみ、エモいまま。"], vertical: true, x: 40, y: 330, lh: 0, size: 30, weight: 700, spacing: 0.18,
    t0: 0.35, stagger: 0.05, dur: 0.25, style: "drop", out: [3.22], outStyle: "fall", outStagger: 0.012, outDur: 0.4 });
  lyric({ lines: ["LYRIC VIDEO", "PRESENTED BY YOSHINA"], x: 112, y: 820, lh: 30, size: 19, font: EN, spacing: 0.22,
    t0: 0.55, stagger: 0.022, style: "type", out: [3.2], outStyle: "fade", outStagger: 0, outDur: 0.15 });

  // shot 2: words slam in on the beat after she lands
  const r1a = "ねぇ、気づいてくれてる?";
  lyric({ lines: [r1a], x: 112, y: 112, lh: 0, size: 84, spacing: 0.02, style: "slam", dur: 0.22, stagger: 0.012,
    segs: [[0, B(1)], [3, B(1.5)], [7, B(2)]], out: [3.34], outStyle: "up", outStagger: 0.006, outDur: 0.2, beat: 0.04 });
  lyric({ lines: ["この気持ち、ちゃんと。"], x: 116, y: 230, lh: 0, size: 56, spacing: 0.05, style: "flip",
    t0: B(2.5), stagger: 0.028, dur: 0.3, out: [3.34], outStyle: "up", outStagger: 0.006, outDur: 0.2 });

  // shot 3 (the LINE message and 「好き」 are drawn by mv.js); English aside types in underneath
  lyric({ lines: ["I can't tell you yet.", "This feeling, it's still here."], x: 118, y: 330, lh: 40, size: 28, font: EN,
    weight: 800, spacing: 0.04, t0: 4.72, stagger: 0.018, style: "type", out: [5.66], outStyle: "fade", outStagger: 0, outDur: 0.14 });

  // shot 4: vertical lines drop in on the left while she chases the cushion
  const chase = [["目が合うたびに、", 5.92, 330], ["胸が痛くて", 6.4, 246], ["うまく笑えなくなるの。", 6.87, 162]];
  chase.forEach(([txt, t0, x], i) => lyric({ lines: [txt], vertical: true, x, y: 118, lh: 0, size: 50, spacing: 0.06,
    t0, stagger: 0.03, dur: 0.26, style: "drop", out: [7.62 + i * 0.05], outStyle: "fall", outStagger: 0.01, outDur: 0.45, seed: 20 + i }));

  // shot 6: the promise, waving in on the right
  lyric({ lines: ["この恋が届くその日まで、", "今日も、心の中で歌ってる。"], x: 904, y: 128, lh: 86, size: 58, spacing: 0.04,
    t0: 10.42, stagger: 0.026, dur: 0.38, style: "wave", out: [11.78], outStyle: "up", outStagger: 0.008, outDur: 0.26, beat: 0.03 });

  // ------------------------------------------------------------------ background motion
  // ticker along the top edge
  const tickText = "YOSHINA LOVE SONG ・ LYRIC VIDEO ・ SUNG BY YOSHINA ・ WORDS & MUSIC: YOSHINA ・ ";
  const ticker = h("div", "ticker", layers.hud, tickText.repeat(8));
  // outline title band behind her, flowing with the world
  const band = h("div", "band", layers.far, "恋する乙女のラブソング　".repeat(6));
  // text riding along the routes
  const onRoutes = env.routePaths.map((p, i) => {
    const tx = s("text", { class: "ontrack", dy: -12 }, env.midSvg);
    const tp = s("textPath", { href: "#" + p.id, startOffset: 0 }, tx);
    tp.textContent = (i % 2 ? "こいのなやみ、エモいまま。　" : "恋の悩みエモい感じのラブソング　").repeat(4);
    return { tp, len: p.getTotalLength(), v: 70 + i * 25 };
  });
  // English line circling the catch
  const ringSvg = layers.fx;
  s("path", { id: "ring-path", d: "M -250 0 A 250 250 0 1 1 250 0 A 250 250 0 1 1 -250 0", fill: "none" }, s("defs", {}, ringSvg));
  const ringG = s("g", {}, ringSvg);
  const ringText = s("text", { class: "ringtext" }, ringG);
  s("textPath", { href: "#ring-path" }, ringText).textContent = "A love song just for you, ・ sung quietly in my heart. ・ ";

  // pops of small shapes on the beat
  const shr = rng(77);
  const SHAPES = Array.from({ length: 26 }, (_, i) => {
    const kind = i % 3;
    const g = s("g", {}, layers.fxBack);
    if (kind === 0) s("circle", { r: 9, fill: "none", stroke: WHITE, "stroke-width": 4 }, g);
    else if (kind === 1) s("path", { d: "M-10 0H10M0 -10V10", stroke: WHITE, "stroke-width": 4, "stroke-linecap": "round" }, g);
    else s("use", { href: "#i-heart", x: -11, y: -11, width: 22, height: 22, fill: PINK }, g);
    return { g, x: 80 + shr() * 1760, y: 60 + shr() * 860, beat: Math.floor(shr() * 24), life: 1 + Math.floor(shr() * 2) };
  });

  // shot transitions: stripe wipes and a radial burst
  const wipes = [[3.28, "#fdfdf8"], [10.18, "#fb6c78"]].map(([t0, col]) => {
    const g = h("div", "wipe", layers.top);
    const bars = Array.from({ length: 7 }, (_, i) => { const b = h("div", "bar", g); b.style.background = i % 2 ? col : "#fdfdf8"; return b; });
    return { t0, g, bars };
  });
  const burst = s("g", { opacity: 0 }, layers.fx);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    s("path", { d: `M${Math.cos(a) * 120} ${Math.sin(a) * 120} L${Math.cos(a) * 260} ${Math.sin(a) * 260}`, stroke: i % 2 ? PINK : WHITE,
      "stroke-width": 10, "stroke-linecap": "round" }, burst);
  }
  const confetti = Array.from({ length: 22 }, (_, i) => {
    const e = s("use", { href: "#i-heart", width: 30, height: 30, fill: i % 3 ? PINK : WHITE }, layers.fx);
    const a = -Math.PI * 0.95 + (i / 21) * Math.PI * 1.1 + (shr() - 0.5) * 0.3;
    return { e, a, v: 380 + shr() * 520, spin: (shr() - 0.5) * 540, sc: 0.5 + shr() * 0.9 };
  });

  // ------------------------------------------------------------------ render
  function render(t, st) {
    typo.render(t);
    const cam = camX(t), bp = beatPulse(t), bar = barPulse(t);
    band.style.visibility = t < 11.2 ? "visible" : "hidden";

    ticker.style.opacity = seg(t, 1.5, 1.9) * (1 - seg(t, 12.7, 12.8));
    ticker.style.transform = `translateX(${(-2400 + ((cam * 0.35 + t * 60) % 1200)).toFixed(1)}px)`;

    const bv = seg(t, 3.4, 3.7) * (1 - seg(t, 10.9, 11.15));
    band.style.opacity = (bv * (0.9 + 0.1 * bar)).toFixed(3);
    band.style.transform = `translate(${(-3300 + ((cam * 0.6 + t * 90) % 1420)).toFixed(1)}px, 0)`;

    for (const r of onRoutes) {
      r.tp.setAttribute("startOffset", (((t * r.v) % 600) - 600).toFixed(1));
      r.tp.parentNode.setAttribute("opacity", seg(t, 2.0, 2.4).toFixed(3));
    }

    // catch ring: grows around the cushion and turns slowly while the lyric holds
    const rv = seg(t, 8.2, 8.6, E.back) * (1 - seg(t, 9.9, 10.2));
    ringG.setAttribute("opacity", Math.min(1, rv).toFixed(3));
    ringG.setAttribute("transform", `translate(${st.catchX.toFixed(1)} ${st.catchY.toFixed(1)}) rotate(${(-40 + (t - 8.2) * 22).toFixed(2)}) scale(${lerp(0.4, 1, Math.min(1, rv)).toFixed(3)})`);

    SHAPES.forEach((p) => {
      const b = t < MUSIC_IN ? -1 : Math.floor((t - MUSIC_IN) / BEAT);
      const on = b >= 0 && t < 12.7 && ((b + p.beat) % 6) < p.life;
      const q = on ? ((t - MUSIC_IN) / BEAT) % 1 : 0;
      const sc = on ? E.back(clamp(q * 3)) * (1 - E.in(clamp((q - 0.6) * 2.5))) : 0;
      p.g.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${sc.toFixed(3)}) rotate(${(t * 90) % 360})`);
    });

    for (const w of wipes) {
      const q = (t - w.t0) / 0.42;
      w.g.style.display = q > 0 && q < 1 ? "" : "none";
      if (!(q > 0 && q < 1)) continue;
      w.bars.forEach((b, i) => {
        const k = clamp(q * 1.6 - i * 0.07);
        const x = lerp(-2400, 2400, E.io(k));
        b.style.transform = `translateX(${x.toFixed(1)}px) skewX(-18deg)`;
        b.style.top = i * 160 - 40 + "px";
      });
    }

    const bq = seg(t, 5.8, 6.15, E.out);
    burst.setAttribute("opacity", t >= 5.8 && t < 6.2 ? (1 - bq).toFixed(3) : 0);
    burst.setAttribute("transform", `translate(${st.slipX.toFixed(1)} ${st.slipY.toFixed(1)}) scale(${lerp(0.5, 1.7, bq).toFixed(3)})`);

    confetti.forEach((c) => {
      const dt = t - 8.15, on = dt >= 0 && dt < 1.3;
      c.e.setAttribute("opacity", on ? (1 - dt / 1.3).toFixed(3) : 0);
      if (!on) return;
      const d = (c.v * (1 - Math.exp(-dt * 3.2))) / 3.2;
      const x = st.catchX + Math.cos(c.a) * d - 15, y = st.catchY + Math.sin(c.a) * d + 220 * dt * dt - 15;
      c.e.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(dt * c.spin).toFixed(1)} 15 15) scale(${c.sc.toFixed(2)})`);
    });

    return { beat: bp, bar };
  }
  return { render, pulse: (t) => ({ beat: beatPulse(t), bar: barPulse(t) }) };
};
