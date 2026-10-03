# 35s elegant score for H3 LP motion v3: felt piano, string ensemble, harp, soft pad.
# 80 BPM (beat 0.75s, bar 3s). No sound effects — musical swells carry the transitions.
import numpy as np, wave, sys
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
B = 60 / 80; BAR = 4 * B
END = 35.0
N = int(SR * (END + .3))
rng = np.random.default_rng(11)
buses = {k: np.zeros((2, N)) for k in ('piano', 'strings', 'harp', 'pad', 'bass')}

def ax(d): return np.arange(int(SR * d)) / SR
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, fc, o=2): return sosfilt(butter(o, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, 'high', fs=SR, output='sos'), x)
def put(bus, sig, at, pan=0., g=1.):
    i = int(at * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[:j - i] * g
    buses[bus][0, i:j] += s * np.sqrt(.5 * (1 - pan)); buses[bus][1, i:j] += s * np.sqrt(.5 * (1 + pan))

# ---------- instruments ----------
def piano(m, at, vel=.6, dur=3.5, pan=0.):
    f = midi(m); t = ax(dur + 1.2)
    bright = .35 + .65 * vel
    s = np.zeros(len(t)); B_ = 0.00018 * (m / 60) ** 2          # inharmonicity
    for n in range(1, 13):
        fn = f * n * np.sqrt(1 + B_ * n * n)
        if fn > 16000: break
        amp = (bright ** (n - 1)) / n ** .7
        dec = 2.8 / (1 + .35 * n) * (1.6 if m < 55 else 1.0)
        s += amp * np.sin(2 * np.pi * fn * t + rng.uniform(0, 6.28)) * np.exp(-t / dec)
    s += .4 * np.sin(2 * np.pi * f * 1.002 * t) * np.exp(-t / 3.2)          # unison string beating
    ham = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 90) * .05 * vel
    env = (1 - np.exp(-t * 900)) * np.where(t < dur, 1, np.exp(-(t - dur) / .25))
    put('piano', lp((s + ham) * env, 3500 + 5000 * vel), at, pan, vel * .22)

def strings(notes, at, dur, g=.05, att=1.2, rel=1.4):
    t = ax(dur + rel)
    env = np.minimum(1, (t / att) ** 1.5) * np.where(t < dur, 1, np.exp(-(t - dur) / (rel / 3)))
    for k, m in enumerate(notes):
        f = midi(m)
        for v in range(5):                                          # ensemble voices
            det = rng.uniform(-9, 9); vib = 1 + .004 * np.sin(2 * np.pi * (4.8 + rng.uniform(-.6, .6)) * t + rng.uniform(0, 6))
            ph = 2 * np.pi * f * (1 + det / 1200) * np.cumsum(vib) / SR
            saw = sum(np.sin(h * ph) / h for h in range(1, 9))
            pan = (k / max(1, len(notes) - 1) - .5) * .9 + rng.uniform(-.1, .1)
            put('strings', saw * env / 5, at, pan, g)

def harp(m, at, g=.11, pan=0.):
    f = midi(m); t = ax(3.0)
    s = sum(np.sin(2 * np.pi * f * n * t) * np.exp(-t * (1.2 + .9 * n)) / n ** 1.3 for n in range(1, 8))
    s *= 1 - np.exp(-t * 2000)
    put('harp', s, at, pan, g)

def pad(notes, at, dur, g=.02):
    t = ax(dur + 2)
    env = np.minimum(1, t / 2.0) * np.where(t < dur, 1, np.exp(-(t - dur) / .8))
    s = np.zeros(len(t))
    for m in notes:
        for d in (-4, 4): s += np.sin(2 * np.pi * midi(m + 12) * (1 + d / 1200) * t + rng.uniform(0, 6))
    put('pad', lp(s * env, 2200), at, 0, g)

def bass(m, at, dur, g=.12):
    t = ax(dur + .8); f = midi(m)
    s = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / .05) * np.where(t < dur, np.exp(-t * .4), np.exp(-dur * .4) * np.exp(-(t - dur) / .3))
    put('bass', s * env, at, 0, g)

# ---------- harmony: F major, elegant voicings ----------
CH = {
    'F':  [41, 53, 57, 60, 64, 67],   # Fmaj9
    'Dm': [38, 50, 57, 60, 64, 65],   # Dm9
    'Bb': [34, 46, 53, 57, 62, 64],   # Bbmaj9(#11-ish)
    'C':  [36, 48, 55, 57, 62, 64],   # C6/9
    'Am': [33, 45, 52, 55, 60, 64],   # Am9
    'Gm': [31, 43, 50, 53, 58, 62],   # Gm9
}
# 12 bars of 3s (= 36s); last bar resolves
prog = ['F', 'F', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'Gm', 'C', 'F', 'F']
for i, c in enumerate(prog):
    t0 = i * BAR; ch = CH[c]
    if i >= 1: pad(ch[2:], t0, BAR, .016 if i < 4 else .022)
    if i >= 1: bass(ch[0], t0, BAR * .95, .10 if i < 4 else .13)
    # strings enter softly with the KV, open up at the product (bar 4) and the closing (bar 10)
    if i >= 1:
        g = .028 if i < 4 else (.04 if i < 10 else .05)
        strings(ch[1:4] if i < 4 else ch[1:], t0, BAR * 1.02, g, att=1.0 if i < 10 else .6)
    # piano comp: broken chord on beats 1 & 3
    if i < 11:
        piano(ch[1], t0, .45, 2.6, -.2); piano(ch[3], t0 + .02, .4, 2.4, .1)
        piano(ch[2], t0 + 2 * B, .36, 1.8, -.1); piano(ch[4], t0 + 2 * B + .02, .34, 1.6, .2)
    # harp arpeggio rising (from the product scene on)
    if 4 <= i <= 10:
        for k, m in enumerate([ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[5] + 12, ch[3] + 24, ch[5] + 24]):
            harp(m, t0 + k * B / 2 + (2 * B if k > 5 else 0), .07 + .01 * (k % 2), pan=-.5 + k * .2)

# melody (right-hand felt piano), phrased across the scenes
mel = [  # (bar, beat, midi, beats, vel)
    (0, .5, 72, 1, .5), (0, 1.5, 77, 1, .55), (0, 2.5, 76, 1.5, .5),                    # intro motif
    (1, 0, 72, 1.5, .5), (1, 2, 69, 1, .45), (1, 3, 72, 1, .5),
    (2, 0, 74, 2, .55), (2, 2, 72, 1, .5), (2, 3, 69, 1, .45),
    (3, 0, 70, 1.5, .5), (3, 1.5, 72, .5, .45), (3, 2, 74, 2, .55),
    (4, 0, 76, 1.5, .62), (4, 1.5, 79, .5, .55), (4, 2, 81, 2, .62),                    # product
    (5, 0, 79, 1.5, .55), (5, 2, 76, 1, .5), (5, 3, 72, 1, .5),
    (6, 0, 77, 1.5, .6), (6, 1.5, 76, .5, .5), (6, 2, 74, 2, .55),
    (7, 0, 74, 1, .5), (7, 1, 77, 1, .55), (7, 2, 81, 2, .6),
    (8, 0, 82, 1.5, .62), (8, 1.5, 81, .5, .55), (8, 2, 79, 2, .58),                    # science
    (9, 0, 79, 1, .58), (9, 1, 81, 1, .6), (9, 2, 84, 2, .66),                          # build
    (10, 0, 84, 2, .62), (10, 2, 81, 1, .55), (10, 3, 79, 1, .5),                       # closing
    (11, 0, 77, 3, .5),
]
for bar, beat, m, beats, vel in mel:
    piano(m, bar * BAR + beat * B, vel, beats * B + .6, .15)
# final chord bloom
for k, m in enumerate([41, 53, 60, 64, 67, 72, 76]): piano(m, 33.0 + k * .035, .5, 2.4, -.3 + k * .1)
for k, m in enumerate([77, 81, 84, 88]): harp(m, 33.05 + k * .09, .06, .3)

# ---------- mix ----------
def hall(x, seed, rt=3.2, pre=.025):
    n = int(SR * rt); t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-t * 6.9 / rt)
    ir = lp(ir, 6500); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    return fftconvolve(x, ir)[:len(x)]
send = {'piano': .38, 'strings': .5, 'harp': .55, 'pad': .6, 'bass': .1}
gain = {'piano': 1.0, 'strings': 1.0, 'harp': .9, 'pad': .9, 'bass': .9}
dry = np.zeros((2, N)); wet_in = np.zeros((2, N))
for k, b in buses.items():
    b = np.stack([hp(b[0], 35), hp(b[1], 35)]) * gain[k]
    dry += b * (1 - send[k] * .5); wet_in += b * send[k]
wet = np.stack([hall(wet_in[0], 1), hall(wet_in[1], 2)])
mix = dry + wet * 1.25
mix = np.stack([lp(mix[0], 12000), lp(mix[1], 12000)])
t = np.arange(N) / SR
mix *= np.clip(t / .3, 0, 1) * np.clip((END + .2 - t) / 1.4, 0, 1)
mix /= np.abs(mix).max() / .92
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
pcm = (mix.T * 32767 * .95).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', N / SR)
