"""Key out the flat green background of the character clips (MiniMax H3 / Kling).

Each clip becomes clips/<name>.webm (VP9 with alpha) cropped to the area she
occupies, plus clips/<name>.js, which registers the crop box, where her feet stand
in the first frame and her height, as window.KOI_CLIPS[name] for js/mv.js.
(The per-frame "heart" track is a leftover from koi-mv and stays empty here.)

Keying: the plate is one flat lime field. Instead of a chroma key, the background is
flood-filled from the frame border through lime-like pixels (her line art stops the
fill), and only the band along that boundary gets a soft colour-distance alpha.
"""
import json, subprocess, sys, urllib.request
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "clips"
FFMPEG = __import__("os").environ.get("FFMPEG", "ffmpeg")
W, H, FPS = 1920, 1080, 24  # every source is scaled to 1920x1080 and resampled to 24fps


def frames(path):
    p = subprocess.Popen([FFMPEG, "-loglevel", "error", "-i", str(path), "-vf", f"scale={W}:{H}:flags=lanczos,fps={FPS}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.wait()


def key(rgb, holes=False):
    a = rgb.astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    # background reference from the frame border (tracks the vignette/grade per frame)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    ref = np.median(border, axis=0)
    greenish = (G - np.maximum(R, B)) > 0.6 * (ref[1] - max(ref[0], ref[2]))
    lab, _ = ndi.label(greenish)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, list(set(np.unique(edge)) - {0}))
    if holes:  # nothing she wears is green: also clear the green seen through gaps (hair, bag, arm)
        bg |= greenish & ndi.binary_opening(greenish, iterations=1)
    fg = ~bg
    lab2, n = ndi.label(fg, structure=np.ones((3, 3)))
    if n:
        sizes = ndi.sum(fg, lab2, range(1, n + 1))
        keep = np.nonzero(sizes > 400)[0] + 1   # the character, plus any detached prop
        fg = np.isin(lab2, keep)
    alpha = fg.astype(np.float32)
    # soft edge: in a 2px band, alpha from how far the colour is from the background
    band = ndi.binary_dilation(fg, iterations=2) & ~ndi.binary_erosion(fg, iterations=1)
    d = np.linalg.norm(a - ref, axis=-1) / (np.linalg.norm(ref) * 0.55)
    alpha[band] = np.clip(d[band], 0, 1)
    if holes:  # despill the green fringe on hair strands
        m = np.maximum(R, B)
        rgb[..., 1] = np.where(fg & (G > m), m, G).astype(np.uint8)
    return (alpha * 255).astype(np.uint8)


def heart_centre(rgb, alpha):
    R, G, B = (rgb[..., i].astype(int) for i in range(3))
    pink = (R > 190) & (R - G > 70) & (R - B > 40) & (alpha > 128)
    ys, xs = np.nonzero(pink)
    return [float(xs.mean()), float(ys.mean())] if len(xs) > 500 else None


def torso_x(alpha):
    """Horizontal centre of the head and shoulders (the top third of the figure).
    Legs, coat tails and the bag swing; this part rides steadily with her."""
    rows = np.nonzero((alpha > 128).any(axis=1))[0]
    if not len(rows):
        return None
    y0 = rows.min(); y1 = y0 + (rows.max() - y0) // 3
    xs = np.nonzero(alpha[y0:y1] > 128)[1]
    return float(xs.mean()) if len(xs) else None


def smooth(v, win):
    v = np.array([np.nan if x is None else x for x in v], float)
    ok = ~np.isnan(v)
    v = np.interp(np.arange(len(v)), np.nonzero(ok)[0], v[ok])
    k = np.ones(win) / win
    return np.convolve(np.pad(v, win // 2, mode="edge"), k, mode="valid")[:len(v)]


def process(name, url, holes=False):
    OUT.mkdir(exist_ok=True)
    src = OUT / f"{name}.src.mp4"
    if not src.exists() and url:
        urllib.request.urlretrieve(url, src)
    rgbas, hearts, cxs = [], [], []
    for f in frames(src):
        f = f.copy()
        al = key(f, holes)
        rgbas.append(np.dstack([f, al]))
        hearts.append(heart_centre(f, al))
        cxs.append(torso_x(al))
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
    # feet anchor: lowest opaque rows of the first frame
    a0 = rgbas[0][..., 3] > 128
    rows = np.nonzero(a0.any(axis=1))[0]
    foot_y = int(rows.max())
    fx = np.nonzero(a0[foot_y - 60:foot_y + 1].any(axis=0))[0]
    meta = {"src": f"clips/{name}.webm", "fps": FPS, "frames": len(rgbas),
            "crop": [int(x0), int(y0), int(x1), int(y1)],
            "feet": [float((fx.min() + fx.max()) / 2), foot_y], "height": int(foot_y - rows.min()),
            "heart": [[round(v, 1) for v in h] if h else None for h in hearts],
            "cx": [round(float(v), 1) for v in smooth(cxs, FPS + 1)]}  # smoothed torso x per frame
    (OUT / f"{name}.js").write_text(f"(window.KOI_CLIPS = window.KOI_CLIPS || {{}})[{json.dumps(name)}] = {json.dumps(meta)};\n")
    print(name, meta["frames"], "frames, crop", meta["crop"])


if __name__ == "__main__":
    clips = json.loads((ROOT / "tools" / "clips.json").read_text())
    holes = "--holes" in sys.argv  # for characters with no green on them
    names = [a for a in sys.argv[1:] if not a.startswith("--")]
    for name in names or [k for k in clips if k != "note"]:
        process(name, clips[name], holes)
