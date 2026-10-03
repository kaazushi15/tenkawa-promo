# Ambient score + transition SFX for the H3 LP motion, synthesised offline (numpy only).
# Timings mirror the scene table in index.html.
import numpy as np, wave, sys

SR = 48000
T = [0, 4.2, 8.4, 12.6, 16.8, 21.2, 24.4, 28.0, 29.8]
END = 34.6
N = int(SR * (END + 0.6))
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def t_axis(d): return np.arange(int(SR * d)) / SR
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def put(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt(.5 * (1 - pan)); R[i:j] += s * np.sqrt(.5 * (1 + pan))

# --- warm pad: detuned saws through a soft low-pass, long attack/release ---
def pad(notes, start, dur, gain=.05):
    t = t_axis(dur + 2.5)
    env = np.minimum(1, t / 1.6) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.9))
    for k, m in enumerate(notes):
        f = midi(m); sig = np.zeros_like(t)
        for d in (-6, -2, 2, 6):
            ph = 2 * np.pi * f * (1 + d / 1200) * t + rng.uniform(0, 6.28)
            sig += np.sin(ph) + .28 * np.sin(2 * ph) + .1 * np.sin(3 * ph)
        lfo = 1 + .12 * np.sin(2 * np.pi * (.13 + .02 * k) * t)
        put(sig * env * lfo / 4, start, pan=(-.5 + k / max(1, len(notes) - 1)) * .7, gain=gain)

# --- soft electric-piano / bell pluck ---
def pluck(m, at, gain=.12, pan=0.0, decay=1.8):
    t = t_axis(decay * 3)
    f = midi(m)
    env = (1 - np.exp(-t * 300)) * np.exp(-t / decay)
    sig = np.sin(2 * np.pi * f * t + .9 * np.exp(-t * 3) * np.sin(2 * np.pi * f * 2 * t))
    sig += .25 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t * 2.5)
    put(sig * env, at, pan, gain)

# --- airy whoosh for page travel ---
def whoosh(at, dur=1.0, gain=.06, up=True):
    t = t_axis(dur); n = rng.standard_normal(len(t))
    # moving band-pass via cumulative one-pole filters
    out = np.zeros_like(n); lp = 0.0; hp = 0.0
    for i in range(len(n)):
        x = i / len(n); fc = (600 + 3400 * (x if up else 1 - x))
        a = np.exp(-2 * np.pi * fc / SR); lp = a * lp + (1 - a) * n[i]; out[i] = lp
    out = np.diff(np.concatenate([[0], out]))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    put(out * env * 40, at - dur / 2, pan=0, gain=gain)

def tick(at, gain=.05):
    t = t_axis(.25); sig = np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 60) + .5 * np.sin(2 * np.pi * 3300 * t) * np.exp(-t * 80)
    put(sig, at, .2, gain)

def sub(at, gain=.18):
    t = t_axis(2.2); sig = np.sin(2 * np.pi * 55 * t * (1 - .1 * t / 2.2)) * (1 - np.exp(-t * 40)) * np.exp(-t / .7)
    put(sig, at, 0, gain)

# chord progression: Fmaj9 – Am9 – Dm9 – Bbmaj7(#11) – Gm9 – C6/9 – Fmaj9 ...
prog = [
    ([53, 57, 60, 64, 67], 0.0, 4.4),
    ([45, 52, 55, 60, 64], 4.2, 4.4),
    ([50, 57, 60, 64, 65], 8.4, 4.4),
    ([46, 53, 57, 62, 64], 12.6, 4.4),
    ([43, 50, 53, 58, 62], 16.8, 4.6),
    ([48, 55, 57, 62, 64], 21.2, 3.4),
    ([45, 52, 55, 60, 64], 24.4, 3.8),
    ([46, 53, 57, 62, 65], 28.0, 1.9),
    ([53, 57, 60, 64, 67], 29.8, 5.2),
]
for notes, s, d in prog: pad(notes, s, d)

# plucked motif at each scene arrival (pentatonic, gentle)
motif = [[72, 76, 79], [69, 72, 76], [74, 77, 81], [70, 74, 77], [67, 70, 74], [72, 74, 79], [69, 72, 76], [70, 74], [72, 76, 79, 84]]
for i, s in enumerate(T):
    for k, m in enumerate(motif[i]):
        pluck(m, s + .15 + k * .22, gain=.10 if k == 0 else .07, pan=(-.3 + .3 * k))
    if i: whoosh(s, 1.0, .05)
# value reveals (S4), H rows (S5) and CTA ticks
for k in range(3): pluck(84 - 3 * k, T[3] + .2 + k * 1.0, .05, .4)
for k in range(3): pluck(79 + 2 * k, T[4] + 1.65 + k * .5, .045, -.4)
tick(2.65); tick(T[1] + 2.6); tick(T[8] + 1.75, .04); tick(T[8] + 2.65, .05)
sub(T[2] + .2, .14)      # product lands
sub(T[6] + 1.2, .12)     # VS halves meet
sub(T[8] + .4, .12)

# --- reverb: convolution with exponentially decaying stereo noise ---
def reverb(x, seed, rt=2.6, mix=.32):
    n = int(SR * rt); t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-t * 6.9 / rt)
    ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    from numpy.fft import rfft, irfft
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = irfft(rfft(x, m) * rfft(ir, m), m)[:len(x)]
    return x * (1 - mix) + wet * mix * 1.6

L, R = reverb(L, 1), reverb(R, 2)
# gentle high-shelf roll-off & master fade
def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = a * s + (1 - a) * x[i]; y[i] = s
    return y
L = .7 * L + .3 * onepole(L, 5000); R = .7 * R + .3 * onepole(R, 5000)
t = np.arange(N) / SR
fade = np.clip(t / .4, 0, 1) * np.clip((END + .4 - t) / 1.6, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max()); g = .7 / peak
st = np.stack([L * g, R * g], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
pcm = (st * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', N / SR)
