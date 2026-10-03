# Fit the supplied Lyria BGM to the 35s cut: rubberband-stretch (pitch kept), then give the
# hard-cut ending a natural hall tail so the final chord rings out over the end card.
import numpy as np, subprocess, wave, sys
from scipy.signal import fftconvolve, butter, sosfilt
SR = 48000
src, out, stretch, total = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-af', f'rubberband=tempo={1/stretch}:pitchq=quality:transients=smooth',
                      '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()
n_tot = int(total * SR); n = x.shape[1]
y = np.zeros((2, n_tot)); y[:, :n] = x
# hall tail fed by the last 1.5s
rt = 3.0; t = np.arange(int(rt * SR)) / SR
rng = np.random.default_rng(4)
for c in range(2):
    ir = rng.standard_normal(len(t)) * np.exp(-t * 6.9 / rt)
    ir = sosfilt(butter(2, 6000, 'low', fs=SR, output='sos'), ir); ir /= np.sqrt((ir ** 2).sum())
    feed = np.zeros(n); k = int(1.5 * SR); feed[n - k:] = x[c, n - k:] * np.linspace(0, 1, k) ** .5
    wet = fftconvolve(feed, ir)[:n_tot] if n_tot <= n + len(ir) else np.pad(fftconvolve(feed, ir), (0, n_tot))[:n_tot]
    y[c] += wet * .9
# soften the cut: 60ms fade on the dry signal at its end
f = int(.06 * SR); y[:, n - f:n] *= np.linspace(1, 0, f)
# master fade over the last 0.8s
y[:, -int(.8 * SR):] *= np.linspace(1, 0, int(.8 * SR)) ** 2
y /= np.abs(y).max() / .95
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y.T * 32767).astype('<i2').tobytes())
print('ok', n / SR, '->', total)
