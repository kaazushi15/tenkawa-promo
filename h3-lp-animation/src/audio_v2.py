# 25s beat-driven BGM + SFX for H3 LP motion v2 (120 BPM, offline numpy synthesis).
# Cut points in index.html sit on this beat grid (beat = 0.5s, bar = 2s).
import numpy as np, wave, sys

SR = 48000
BPM = 120; B = 60 / BPM; BAR = 4 * B
END = 25.0
N = int(SR * (END + .2))
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
DUCK = np.ones(N)          # sidechain envelope driven by the kick

def ax(d): return np.arange(int(SR * d)) / SR
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def put(sig, at, pan=0., gain=1., bus=None):
    i = int(at * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[:j - i] * gain
    if bus is not None: bus[0][i:j] += s * np.sqrt(.5 * (1 - pan)); bus[1][i:j] += s * np.sqrt(.5 * (1 + pan)); return
    L[i:j] += s * np.sqrt(.5 * (1 - pan)); R[i:j] += s * np.sqrt(.5 * (1 + pan))

def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.
    for i in range(len(x)): s = a * s + (1 - a) * x[i]; y[i] = s
    return y
def hp(x, fc): return x - onepole_lp(x, fc)

# ---------- drums ----------
def kick(at, g=.9):
    t = ax(.45); f = 48 + 110 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s += .3 * np.sin(2 * np.pi * 3000 * t) * np.exp(-t * 300)
    put(s, at, 0, g)
    i = int(at * SR); n = int(.32 * SR); env = 1 - .6 * np.exp(-np.arange(n) / SR * 9)
    j = min(N, i + n); DUCK[i:j] = np.minimum(DUCK[i:j], env[:j - i])
NOISE = rng.standard_normal(SR)
HAT = hp(NOISE[:int(.08 * SR)], 7000)
CLAPN = hp(onepole_lp(NOISE[:int(.35 * SR)], 3500), 900)
def hat(at, g=.12, open_=False):
    d = .22 if open_ else .05; t = ax(d); s = HAT[:len(t)] if len(t) <= len(HAT) else np.resize(HAT, len(t))
    put(s * np.exp(-t * (14 if open_ else 70)), at, .25, g)
def clap(at, g=.32):
    t = ax(.35); s = np.zeros(len(t))
    for k, off in enumerate((0, .011, .023)):
        i = int(off * SR); s[i:] += CLAPN[:len(t) - i] * np.exp(-(t[:len(t) - i]) * (60 if k < 2 else 13))
    put(s, at, -.1, g)

# ---------- melodic ----------
PROG = [[53, 57, 60, 64], [45, 52, 55, 60], [50, 57, 60, 65], [46, 53, 57, 62]]   # Fmaj7 Am7 Dm7 Bbmaj7
def pad(notes, at, d, g=.035):
    t = ax(d + .8); env = np.minimum(1, t / .25) * np.where(t < d, 1, np.exp(-(t - d) / .3))
    s = np.zeros(len(t))
    for m in notes:
        for det in (-7, 0, 7):
            ph = 2 * np.pi * midi(m + 12) * (1 + det / 1200) * t + rng.uniform(0, 6)
            s += np.sin(ph) + .3 * np.sin(2 * ph)
    put(onepole_lp(s * env, 2600) / 6, at, 0, g, bus=PADBUS)
def bass(m, at, d, g=.22):
    t = ax(d); f = midi(m)
    s = np.tanh(1.8 * (np.sin(2 * np.pi * f * t) + .5 * np.sin(4 * np.pi * f * t) + .25 * np.sin(6 * np.pi * f * t)))
    env = (1 - np.exp(-t * 200)) * np.exp(-t * 2.2)
    put(onepole_lp(s * env, 900), at, 0, g, bus=PADBUS)
def pluck(m, at, g=.08, pan=0., dec=.35):
    t = ax(dec * 4); f = midi(m)
    s = np.sin(2 * np.pi * f * t + 1.4 * np.exp(-t * 18) * np.sin(2 * np.pi * f * 2 * t)) * (1 - np.exp(-t * 400)) * np.exp(-t / dec)
    put(s, at, pan, g, bus=PLUCKBUS)
def bell(m, at, g=.12, pan=0.):
    t = ax(2.5); f = midi(m)
    s = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)) * np.exp(-t * 1.6) * (1 - np.exp(-t * 600))
    put(s, at, pan, g, bus=PLUCKBUS)

# ---------- fx ----------
def riser(at, d, g=.12):
    t = ax(d); n = rng.standard_normal(len(t)); out = np.empty_like(n); s = 0.
    for i in range(len(n)):
        fc = 300 + 7000 * (i / len(n)) ** 2; a = np.exp(-2 * np.pi * fc / SR); s = a * s + (1 - a) * n[i]; out[i] = s
    out = hp(out, 200) * (t / d) ** 2
    put(out * 6, at, 0, g)
def whoosh(center, d=.5, g=.16):
    t = ax(d); n = rng.standard_normal(len(t)); out = np.empty_like(n); s = 0.
    for i in range(len(n)):
        x = i / len(n); fc = 500 + 5000 * np.sin(np.pi * x); a = np.exp(-2 * np.pi * fc / SR); s = a * s + (1 - a) * n[i]; out[i] = s
    put(hp(out, 300) * np.sin(np.pi * t / d) ** 2 * 7, center - d / 2, 0, g)
def impact(at, g=.5):
    t = ax(1.6); s = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 18)) / SR) * np.exp(-t * 3)
    s += hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 25) * .5
    put(s, at, 0, g)
def liquid(at, g=.14):
    for k in range(10):
        t = ax(.12); f0 = 500 + rng.uniform(0, 900)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.2 * t / .12)) / SR) * np.exp(-t * 40)
        put(s, at + k * .045 + rng.uniform(0, .02), rng.uniform(-.6, .6), g)
def tick(at, g=.08):
    t = ax(.12); put(np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 70), at, .2, g)

PADBUS = [np.zeros(N), np.zeros(N)]
PLUCKBUS = [np.zeros(N), np.zeros(N)]

# ===== arrangement (bars of 2s) =====
# bar 0 (0–2): intro — bell motif with logo draw, riser into the hero
for k, m in enumerate([72, 79, 84]): bell(m, .1 + k * .25, .1, -.3 + .3 * k)
pad([53, 57, 60, 64], 0, 2.0, .028)
riser(.6, 1.15, .1); impact(1.25, .3)
# groove: bars 1..11 (2s–24s)
for bar in range(1, 12):
    t0 = bar * BAR; ch = PROG[bar % 4]
    breakdown = bar == 4 and False
    pad(ch, t0, BAR, .03)
    bass(ch[0] - 12, t0, 1.4); bass(ch[0] - 12, t0 + 1.5, .5, .16)
    for b in range(4):
        tb = t0 + b * B
        if not (bar == 2 and b >= 2):            # tiny gap before the yellow wipe
            kick(tb)
        if b in (1, 3): clap(tb)
        hat(tb + B / 2, .1, open_=(b == 3)); hat(tb, .05)
    arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24]
    for s16 in range(8):
        pluck(arp[s16 % 4], t0 + s16 * B / 2, .06 if s16 % 2 else .085, pan=(-.4 if s16 % 2 else .4))
# ending (bar 12: 24–25): final chord sting + bell, no drums
pad([53, 57, 60, 64, 67], 23.95, .9, .04); bass(41, 23.95, 1.0, .25); kick(23.95, 1.0)
for k, m in enumerate([72, 76, 79, 84]): bell(m, 24.0 + k * .06, .09, -.3 + .2 * k)

# ===== sync points with the picture =====
tick(1.95); tick(3.0, .07)                  # header pill / CTA
whoosh(4.4, .5); impact(4.6, .32)          # yellow wipe → "シリコン＝悪、" slam
whoosh(5.75, .35, .12)                       # flip
riser(7.6, .9, .07); liquid(8.6); whoosh(8.8, .5, .12); impact(9.0, .3)   # amber liquid → bottle lands
riser(11.0, 1.0, .1); impact(12.0, .5)      # zoom-through → values drop
for a in (12.85, 13.7): whoosh(a, .3, .12)
whoosh(14.45, .35, .1); whoosh(15.0, .45, .12)
for k in range(3): tick(16.0 + k * .5, .06)
whoosh(18.0, .45, .12)
impact(20.3, .45); whoosh(21.3, .5, .14)    # VS slam, NEW takes over
whoosh(21.7, .5, .1)
for k in range(3): tick(22.75 + k * .2, .07)

# ===== mix =====
pb = [onepole_lp(PADBUS[0], 6000) * DUCK, onepole_lp(PADBUS[1], 6000) * DUCK]
def reverb(x, seed, rt=1.8, mix=.25):
    n = int(SR * rt); t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-t * 6.9 / rt); ir[:int(.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    return x * (1 - mix) + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * mix * 1.5
plk = [reverb(PLUCKBUS[0], 1, 1.6, .3), reverb(PLUCKBUS[1], 2, 1.6, .3)]
L = L + pb[0] + plk[0]; R = R + pb[1] + plk[1]
L, R = reverb(L, 5, 1.2, .12), reverb(R, 6, 1.2, .12)
t = np.arange(N) / SR
fade = np.clip(t / .05, 0, 1) * np.clip((END + .15 - t) / .9, 0, 1)
L *= fade; R *= fade
st = np.stack([L, R], 1); st /= np.abs(st).max() / .9
st = np.tanh(st * 1.35) / np.tanh(1.35)
pcm = (st * 32767 * .97).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', N / SR)
