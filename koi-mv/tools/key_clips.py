"""Download the Kling character clips and key out their flat green background.

Each clip becomes clips/<name>.webm (VP9 with alpha) cropped to the area the girl
occupies, plus clips/<name>.json with the crop box and the per-frame centre of the
pink cushion (used to line the stations up with the heart).

Keying: the plate is one flat lime field with a soft vignette, but her cardigan is
a pale lime too, so a plain chroma key would eat it. Instead the background is
flood-filled from the frame border through lime-like pixels (her dark line art
stops the fill), and only the band along that boundary gets a soft colour-distance
alpha.
"""
import json, subprocess, sys, urllib.request
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "clips"
FFMPEG = __import__("os").environ.get("FFMPEG", "ffmpeg")
W, H, FPS = 1920, 1080, 24


def frames(path):
    p = subprocess.Popen([FFMPEG, "-loglevel", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.wait()


def key(rgb):
    a = rgb.astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    # background reference from the frame border (tracks the vignette/grade per frame)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    ref = np.median(border, axis=0)
    greenish = (G - np.maximum(R, B)) > 0.6 * (ref[1] - max(ref[0], ref[2]))
    lab, _ = ndi.label(greenish)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, list(set(np.unique(edge)) - {0}))
    fg = ~bg
    lab2, n = ndi.label(fg, structure=np.ones((3, 3)))
    if n:
        sizes = ndi.sum(fg, lab2, range(1, n + 1))
        keep = np.nonzero(sizes > 400)[0] + 1   # the girl, plus a detached cushion mid-flight
        fg = np.isin(lab2, keep)
    alpha = fg.astype(np.float32)
    # soft edge: in a 2px band, alpha from how far the colour is from the background
    band = ndi.binary_dilation(fg, iterations=2) & ~ndi.binary_erosion(fg, iterations=1)
    d = np.linalg.norm(a - ref, axis=-1) / (np.linalg.norm(ref) * 0.55)
    alpha[band] = np.clip(d[band], 0, 1)
    return (alpha * 255).astype(np.uint8)


def heart_centre(rgb, alpha):
    R, G, B = (rgb[..., i].astype(int) for i in range(3))
    pink = (R > 190) & (R - G > 70) & (R - B > 40) & (alpha > 128)
    ys, xs = np.nonzero(pink)
    return [float(xs.mean()), float(ys.mean())] if len(xs) > 500 else None


def process(name, url):
    OUT.mkdir(exist_ok=True)
    src = OUT / f"{name}.src.mp4"
    if not src.exists():
        urllib.request.urlretrieve(url, src)
    rgbas, hearts = [], []
    for f in frames(src):
        al = key(f)
        rgbas.append(np.dstack([f, al]))
        hearts.append(heart_centre(f, al))
    # one crop box for the whole clip
    any_a = np.max([r[..., 3] for r in rgbas], axis=0) > 8
    ys, xs = np.nonzero(any_a)
    x0, x1 = max(0, xs.min() - 16) // 2 * 2, min(W, xs.max() + 16) // 2 * 2
    y0, y1 = max(0, ys.min() - 16) // 2 * 2, min(H, ys.max() + 16) // 2 * 2
    enc = subprocess.Popen([FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
                            "-s", f"{x1 - x0}x{y1 - y0}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24",
                            "-row-mt", "1", "-auto-alt-ref", "0", str(OUT / f"{name}.webm")], stdin=subprocess.PIPE)
    for r in rgbas:
        enc.stdin.write(np.ascontiguousarray(r[y0:y1, x0:x1]).tobytes())
    enc.stdin.close(); enc.wait()
    meta = {"fps": FPS, "frames": len(rgbas), "crop": [int(x0), int(y0), int(x1), int(y1)], "heart": hearts}
    (OUT / f"{name}.json").write_text(json.dumps(meta))
    print(name, meta["frames"], "frames, crop", meta["crop"])


if __name__ == "__main__":
    clips = json.loads((ROOT / "tools" / "clips.json").read_text())
    for name in sys.argv[1:] or [k for k in clips if k != "note"]:
        process(name, clips[name])
