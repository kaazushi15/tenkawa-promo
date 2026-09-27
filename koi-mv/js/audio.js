/* Soundtrack for 恋する乙女のラブソング — synthesized with WebAudio so every hit lands
 * on the same cue times as the picture. 128 BPM: 15 s is exactly eight bars.
 * KoiAudio.schedule() plays it on a live AudioContext; KoiAudio.renderOffline()
 * bounces the same graph for the MP4 export. */
window.KoiAudio = (() => {
  "use strict";
  const BEAT = 60 / 128, BAR = 4 * BEAT, END = 15;
  const midi = (n) => 440 * 2 ** ((n - 69) / 12);

  // Chords per half bar (two beats). D major, the classic IV–V–iii–vi ("王道進行") pull.
  const CH = {
    G: { bass: 43, ep: [55, 59, 62, 66] },
    A: { bass: 45, ep: [57, 61, 64, 69] },
    Fm: { bass: 42, ep: [54, 57, 61, 64] },
    Bm: { bass: 47, ep: [57, 59, 62, 66] },
    Em: { bass: 40, ep: [55, 59, 62, 64] },
    Asus: { bass: 45, ep: [57, 62, 64, 69] },
    D: { bass: 38, ep: [54, 57, 62, 64, 66, 69] },
  };
  const PROG = ["G", "G", "G", "A", "Fm", "Bm", "G", "A", "Bm", "G", "Em", "Asus", "G", "A", "D", "D"];

  function schedule(ctx, dest, t0, cues) {
    const at = (t) => t0 + t;
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // ---------------------------------------------------------- buses
    const master = ctx.createGain(); master.gain.value = 1.05;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 28; // DC and sub rumble
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.006; comp.release.value = 0.18;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.08;
    const fadeOut = ctx.createGain();
    fadeOut.gain.setValueAtTime(1, at(END - 0.06)); fadeOut.gain.linearRampToValueAtTime(0, at(END));
    master.connect(hp).connect(comp).connect(limit).connect(fadeOut).connect(dest);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 1.9);
    const verbIn = ctx.createGain(); verbIn.gain.value = 0.32;
    verbIn.connect(verb).connect(master);

    const bus = (gain, pan = 0, send = 0) => {
      const g = ctx.createGain(); g.gain.value = gain;
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p).connect(master);
      if (send) { const s = ctx.createGain(); s.gain.value = send; p.connect(s).connect(verbIn); }
      return g;
    };
    const drums = bus(0.8, 0, 0.04), keys = bus(0.95, -0.08, 0.35), gtr = bus(0.2, 0.42, 0.1), bassBus = bus(0.7);
    const bells = bus(0.42, 0.12, 0.9), sfx = bus(0.55, 0, 0.18), pad = bus(0.34, 0, 0.5);
    // the arrangement thins out just before the title lands
    for (const b of [drums, bassBus, gtr]) {
      b.gain.setValueAtTime(b.gain.value, at(12.15)); b.gain.linearRampToValueAtTime(0, at(12.2));
      b.gain.setValueAtTime(0, at(13.1)); b.gain.linearRampToValueAtTime(b === gtr ? 0 : b.gain.value, at(13.125));
    }

    const noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }

    // ---------------------------------------------------------- voices
    function osc(type, f, t, dur, out) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at(t));
      o.connect(out); o.start(at(t)); o.stop(at(t + dur + 0.05));
      return o;
    }
    function amp(t, a, peak, d, out, sustain = 0.0001) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at(t));
      g.gain.linearRampToValueAtTime(peak, at(t + a));
      g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), at(t + a + d));
      g.connect(out);
      return g;
    }
    function noiseHit(t, dur, type, freq, q, peak, out, a = 0.001) {
      const src = ctx.createBufferSource(); src.buffer = noise;
      src.playbackRate.value = 0.9 + rnd() * 0.2;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      src.connect(f).connect(amp(t, a, peak, dur, out));
      src.start(at(t), rnd() * 1.5); src.stop(at(t + a + dur + 0.05));
      return f;
    }

    // FM electric piano (Rhodes-ish tine)
    function ep(n, t, dur, vel, out = keys, hold = 0) {
      const f = midi(n);
      const g = amp(t, 0.004, 0.22 * vel, hold ? 1.1 : 1.6, out, hold * vel);
      g.gain.cancelAndHoldAtTime(at(t + dur));
      g.gain.setTargetAtTime(0.0001, at(t + dur), 0.08);
      const car = osc("sine", f, t, dur + 0.5, g);
      const mod = ctx.createOscillator(); mod.frequency.value = f;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * 1.4 * vel, at(t)); idx.gain.exponentialRampToValueAtTime(f * 0.12, at(t + 0.35));
      mod.connect(idx).connect(car.frequency); mod.start(at(t)); mod.stop(at(t + dur + 0.55));
      const tine = amp(t, 0.001, 0.05 * vel, 0.12, out);
      osc("sine", f * 4.02, t, 0.2, tine);
    }
    function bell(n, t, vel = 1, out = bells) {
      const f = midi(n);
      osc("sine", f, t, 1.4, amp(t, 0.002, 0.3 * vel, 1.3, out));
      osc("sine", f * 2.76, t, 0.5, amp(t, 0.001, 0.08 * vel, 0.45, out));
      osc("sine", f * 5.4, t, 0.2, amp(t, 0.001, 0.035 * vel, 0.16, out));
    }
    function bass(n, t, dur, vel = 1) {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 820; lp.Q.value = 0.9;
      const g = amp(t, 0.006, 0.5 * vel, dur, lp); lp.connect(bassBus);
      osc("triangle", midi(n), t, dur, g);
      osc("sine", midi(n - 12), t, dur, amp(t, 0.006, 0.35 * vel, dur, bassBus));
    }
    function mute(n, t, vel) { // palm-muted guitar pluck
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500 + 900 * vel; lp.Q.value = 2;
      lp.connect(gtr);
      osc("sawtooth", midi(n), t, 0.09, amp(t, 0.002, 0.3 * vel, 0.07, lp));
    }
    function kick(t, vel = 1) {
      const g = amp(t, 0.002, 0.95 * vel, 0.34, drums);
      const o = osc("sine", 150, t, 0.4, g);
      o.frequency.setValueAtTime(155, at(t)); o.frequency.exponentialRampToValueAtTime(46, at(t + 0.13));
      noiseHit(t, 0.012, "highpass", 3500, 0.7, 0.25 * vel, drums);
    }
    function snare(t, vel = 1) {
      noiseHit(t, 0.17, "bandpass", 1900, 0.7, 0.55 * vel, drums);
      osc("triangle", 196, t, 0.12, amp(t, 0.001, 0.32 * vel, 0.09, drums));
    }
    function clap(t, vel = 1) {
      for (let i = 0; i < 3; i++) noiseHit(t + i * 0.011, 0.018, "bandpass", 1250, 1.1, 0.42 * vel, drums);
      noiseHit(t + 0.033, 0.16, "bandpass", 1150, 0.9, 0.38 * vel, drums);
    }
    function hat(t, vel = 1, open = false) {
      noiseHit(t, open ? 0.2 : 0.035, "highpass", 8200, 0.6, 0.16 * vel, drums);
    }
    function crash(t, vel = 1) {
      noiseHit(t, 1.2, "highpass", 6000, 0.5, 0.11 * vel, drums, 0.002);
      noiseHit(t, 0.8, "bandpass", 3400, 1.4, 0.04 * vel, drums, 0.002);
    }
    function swell(notes, t, dur, vel = 1) { // soft detuned pad
      for (const n of notes) for (const det of [-7, 7]) {
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.connect(pad);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at(t));
        g.gain.linearRampToValueAtTime(0.09 * vel, at(t + Math.min(0.5, dur * 0.4)));
        g.gain.setValueAtTime(0.09 * vel, at(t + dur - 0.05)); g.gain.linearRampToValueAtTime(0.0001, at(t + dur + 0.25));
        g.connect(lp);
        const o = osc("sawtooth", midi(n), t, dur + 0.3, g); o.detune.value = det;
      }
    }
    function sweep(t, dur, f0, f1, peak, out = sfx, q = 1.2) { // filtered-noise whoosh
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q;
      f.frequency.setValueAtTime(f0, at(t)); f.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at(t)); g.gain.linearRampToValueAtTime(peak, at(t + dur * 0.6));
      g.gain.linearRampToValueAtTime(0.0001, at(t + dur));
      src.connect(f).connect(g).connect(out); src.start(at(t)); src.stop(at(t + dur + 0.05));
      return g;
    }
    function blip(t, f0, f1, dur, peak, out = sfx, type = "sine") {
      const o = osc(type, f0, t, dur, amp(t, 0.002, peak, dur, out));
      o.frequency.setValueAtTime(f0, at(t)); o.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
    }
    function step(t, vel = 1) { // soft footstep on the graphic route
      noiseHit(t, 0.05, "lowpass", 900, 0.8, 0.28 * vel, sfx);
      blip(t, 110, 70, 0.07, 0.22 * vel);
    }
    function rustle(t, dur = 0.14, vel = 1) { noiseHit(t, dur, "bandpass", 2600, 0.6, 0.12 * vel, sfx, 0.02); }
    function click(t, vel = 1) { blip(t, 3200, 2400, 0.018, 0.12 * vel); }

    // ---------------------------------------------------------- music
    // intro: a soft chord swell under the opening line
    swell([55, 59, 62, 66], 0.0, 1.85, 0.85);
    ep(74, 0.12, 0.5, 0.45); ep(78, 0.6, 0.5, 0.4); ep(81, 1.05, 0.6, 0.35);
    sweep(1.25, 0.62, 500, 4200, 0.18); // she leaps in

    // eight bars of comping: pushy J-pop stabs on 1, the "a" of 1 and the "&" of 2
    for (let h = 2; h < 13; h++) {
      const c = CH[PROG[h]], t = h * 2 * BEAT;
      const soft = t >= 8.4 && t < 10.3 ? 0.7 : 1; // the quiet lyric hold
      swell(c.ep, t, 2 * BEAT - 0.02, 0.45 * soft); // warm bed under the stabs
      for (const off of [0, 0.75, 1.5]) for (const n of c.ep) ep(n, t + off * BEAT, off === 1.5 ? 0.42 : 0.26, 0.6 * soft * (off ? 0.8 : 1));
      // bass: eighth notes, octave pops once the chase starts
      for (let e = 0; e < 4; e++) {
        const tt = t + e * BEAT / 2, chase = tt >= 5.6 && tt < 8.1;
        if (tt >= 8.4 && tt < 10.3 && e % 2) continue;
        bass(c.bass + (chase && e % 2 ? 12 : 0), tt, BEAT / 2 * 0.85, e === 0 ? 1 : 0.75);
      }
      // muted guitar sixteenths
      const pat = [1, 0, 1, 1, 0, 1, 1, 0];
      for (let k = 0; k < 8; k++) if (pat[k]) mute(c.ep[k % 2 ? 2 : 0] + 12, t + k * BEAT / 4, k % 4 === 0 ? 1 : 0.6);
    }
    // drums from the landing
    for (let b = 4; b < 26; b++) {
      const t = b * BEAT, inBar = b % 4;
      const chase = t >= 5.6 && t < 8.1, hold = t >= 8.4 && t < 10.3, chorus = t >= 11.2;
      if (hold) { // half-time while the lyric holds
        if (inBar === 0) kick(t, 0.8);
        if (inBar === 2) { snare(t, 0.6); }
        hat(t, 0.5); continue;
      }
      if (inBar === 0 || inBar === 2 || chase) kick(t, inBar === 0 ? 1 : 0.85);
      if (!chase && inBar === 1) kick(t + BEAT / 2, 0.6);
      if (inBar === 1 || inBar === 3) { snare(t); if (chorus || chase) clap(t, 0.9); }
      const subdiv = chase ? 4 : 2;
      for (let k = 0; k < subdiv; k++) hat(t + k * BEAT / subdiv, k === 0 ? 0.8 : 0.5, !chase && k === 1 && inBar === 3);
    }
    // snare build into the catch
    for (let k = 0; k < 8; k++) snare(7.03 + k * (BEAT / 4), 0.35 + k * 0.07);
    crash(cues.catch, 1); kick(cues.catch, 1.1);
    crash(1.875, 0.7);
    crash(11.25, 0.6);
    // thin out: a riser carries the gap to the title
    sweep(12.2, 0.92, 300, 5200, 0.12, pad, 0.8);
    swell(CH.A.ep, 12.19, 0.93, 0.4);
    for (const [i, n] of [62, 66, 69].entries()) ep(n, 12.19 + i * BEAT / 2, 0.5, 0.32);
    // the title lands on a bright sustained D(add9), still ringing at 15.0
    kick(13.125, 1); crash(13.125, 0.9);
    for (const n of CH.D.ep) ep(n, 13.125, END - 13.125, 0.62, keys, 0.06);
    for (const n of [74, 78, 81]) ep(n, 13.125, END - 13.125, 0.36, keys, 0.06);
    swell([50, 54, 57, 62, 64, 69], 13.125, END - 13.125 + 0.2, 0.95);
    [86, 90, 93].forEach((n, i) => bell(n, 13.95 + i * 0.22, 0.25));
    bass(38, 13.125, 1.8, 1);
    [81, 86, 88, 90, 93].forEach((n, i) => bell(n, 13.2 + i * 0.09, 0.5));

    if (cues.making) {
      // ------------------------------------------------------- making-of cues
      const M = cues.making, NOTES = [74, 76, 78, 81, 83, 86, 88];
      [0.15, 0.27, 0.4].forEach((t, i) => { blip(t, 520 - i * 60, 240, 0.1, 0.16, sfx, "triangle"); noiseHit(t, 0.05, "bandpass", 2200, 1, 0.1, sfx); });
      for (let i = 0; i < 7; i++) click(0.42 + i * 0.06, 0.45);             // overview stations pop
      sweep(1.2, 0.42, 400, 3200, 0.18);                                     // zoom into the first station
      M.steps.forEach((t, i) => {
        bell(NOTES[i], t + 0.05, 0.9); click(t + 0.05, 1);
        if (i) sweep(t - 0.14, 0.32, 700, 3800, 0.13);                       // camera pans to the next station
      });
      const [s1, s2, s3, s4, s5, , s7] = M.steps;
      sweep(s1 + 0.35, 0.6, 2400, 900, 0.06);                               // scanning the key visual
      [86, 90, 93].forEach((n, i) => bell(n, s2 + 0.62 + i * 0.05, 0.3));    // green plate appears
      for (let i = 0; i < 12; i++) noiseHit(s3 + 0.15 + i * 0.045, 0.016, "highpass", 3000, 1, 0.16, sfx); // prompt typing
      for (let t = s3 + 0.2; t < s3 + 1.5; t += 0.11) noiseHit(t, 0.02, "bandpass", 5200, 2, 0.1, sfx);    // film frames tick past
      sweep(s4 + 0.25, 0.85, 800, 4800, 0.1);                               // keying scan
      blip(s4 + 1.12, 900, 1400, 0.08, 0.14);
      sweep(s5 + 0.08, 0.45, 300, 2600, 0.2);                               // layers explode
      blip(s5 + 1.42, 160, 70, 0.2, 0.4);                                   // ...and snap back together
      for (let t = s7 + 0.05; t < s7 + 1.15; t += 0.045) click(t, 0.3);     // frame counter
      blip(s7 + 1.22, 330, 660, 0.14, 0.25, sfx, "triangle");               // MP4
      M.recap.forEach((t, i) => bell(NOTES[i], t, 0.5));
      sweep(M.out - 0.05, 0.4, 900, 5200, 0.18);
    } else {
      // ---------------------------------------------------------- station notes
      const S = cues.stations, NOTE = { fuan: 74, suki: 78, namida: 81, kataomoi: 83, yuuki: 86 };
      for (const k in S) { bell(NOTE[k], S[k], 1); click(S[k], 1); }
      // recap: every visited node pulses in turn
      cues.recap.forEach((t, i) => bell([74, 78, 81, 83, 86][i], t, 0.6));

      // ---------------------------------------------------------- foley
      sweep(0.05, 1.1, 1500, 700, 0.05);                         // route drawing in
      for (let i = 0; i < 16; i++) click(0.1 + i * 0.02 + 0.08, 0.35); // copy settles
      step(cues.land, 1.5); rustle(cues.land, 0.2, 1.4); blip(cues.land, 180, 60, 0.18, 0.35);
      for (let t = cues.land + BEAT; t < cues.slip; t += BEAT) step(t, 0.9);
      for (let t = 6.45 + BEAT / 2; t < 8.0; t += BEAT / 2) step(t, 0.7);
      for (let t = 10.3125 + BEAT; t < 12.7; t += BEAT) step(t, 0.8);
      for (const t of [2.8, 4.7, 6.9, 10.9, 11.9]) rustle(t, 0.12, 0.6); // cardigan and bag
      // message: envelope flap, typing, deleting
      noiseHit(cues.envelope, 0.08, "bandpass", 1400, 1.2, 0.25, sfx, 0.01);
      const typeN = 23;
      for (let i = 0; i < typeN; i++) {
        const t = cues.typeStart + (i * (cues.typeEnd - cues.typeStart)) / typeN;
        noiseHit(t, 0.018, "highpass", 2500 + rnd() * 1500, 1, 0.22 + rnd() * 0.1, sfx);
      }
      for (let i = 0; i < 13; i++) {
        const t = cues.eraseStart + (i * (cues.eraseEnd - cues.eraseStart)) / 13;
        noiseHit(t, 0.014, "bandpass", 1300, 1.5, 0.2, sfx);
      }
      // the cushion slips and floats away
      sweep(cues.slip, 0.9, 600, 2600, 0.14);
      blip(cues.slip + 0.05, 330, 660, 0.7, 0.12, sfx, "triangle");
      blip(6.6, 1400, 620, 0.12, 0.2);                            // the tear lands
      // catch: soft impact, a little boing, cloth settling
      blip(cues.catch, 140, 55, 0.22, 0.55);
      blip(cues.catch + 0.02, 420, 240, 0.16, 0.16, sfx, "triangle");
      blip(cues.catch + 0.14, 240, 330, 0.16, 0.12, sfx, "triangle");
      rustle(cues.catch + 0.05, 0.3, 1.2); step(cues.landCatch, 1.2);
      blip(cues.pulse[0], 900, 1800, cues.pulse[1] - cues.pulse[0], 0.08); // pulse runs to the lyric
      // 勇気: a tiny phone trill
      for (let i = 0; i < 8; i++) blip(11.28 + i * 0.045, i % 2 ? 1600 : 1320, i % 2 ? 1600 : 1320, 0.04, 0.05);
      // motion-graphics accents: word slams, stripe wipes, the burst when the cushion slips
      for (const b of [1, 1.5, 2]) { const t = 1.875 + b * BEAT; blip(t, 520, 260, 0.09, 0.16, sfx, "triangle"); noiseHit(t, 0.05, "bandpass", 2200, 1, 0.12, sfx); }
      for (const t of [3.28, 10.18]) sweep(t, 0.42, 900, 5200, 0.2);
      sweep(5.78, 0.35, 1800, 7000, 0.12);
      for (let i = 0; i < 5; i++) bell(93 + [0, 2, 4, 7, 9][i], 8.2 + i * 0.05, 0.22); // confetti sparkle
      // the cushion sweeps across the lens, left to right
      const w = sweep(cues.sweep[0] - 0.08, cues.sweep[1] - cues.sweep[0] + 0.2, 350, 1800, 0.34, sfx, 0.7);
      const pan = ctx.createStereoPanner();
      w.disconnect(); w.connect(pan).connect(sfx);
      pan.pan.setValueAtTime(-0.9, at(cues.sweep[0] - 0.08)); pan.pan.linearRampToValueAtTime(0.9, at(cues.sweep[1] + 0.1));
      blip(cues.sweep[0], 90, 60, 0.5, 0.2);
    }
  }

  function impulse(ctx, secs) {
    const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    let s = 42;
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        d[i] = ((s / 4294967296) * 2 - 1) * (1 - i / len) ** 2.6;
      }
    }
    return buf;
  }

  async function renderOffline(cues, sampleRate = 48000) {
    const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * END), sampleRate);
    schedule(ctx, ctx.destination, 0, cues);
    return ctx.startRendering();
  }

  return { schedule, renderOffline, BEAT };
})();
