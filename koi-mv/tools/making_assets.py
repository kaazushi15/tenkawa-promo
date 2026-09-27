"""Stills for the making-of (making.html), pulled from the real production files.

Needs clips/kling15.src.mp4 (the raw Kling take), clips/kling15.webm (its keyed
version) and dist/koi-no-tabi.mp4 (the finished MV). Writes assets/making/*.
"""
import json, os, subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "making"
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")


def grab(src, t, size=None, codec=None, rgba=False):
    args = [FFMPEG, "-loglevel", "error"] + (["-c:v", codec] if codec else []) + ["-ss", str(t), "-i", str(src), "-frames:v", "1"]
    if size:
        args += ["-vf", f"scale={size[0]}:{size[1]}"]
    args += ["-f", "image2pipe", "-vcodec", "png"] + (["-pix_fmt", "rgba"] if rgba else []) + ["-"]
    from io import BytesIO
    return Image.open(BytesIO(subprocess.run(args, capture_output=True, check=True).stdout))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src, keyed, mv = ROOT / "clips/kling15.src.mp4", ROOT / "clips/kling15.webm", ROOT / "dist/koi-no-tabi.mp4"
    Image.open(ROOT / "assets/reference.webp").convert("RGB").resize((960, 540)).save(OUT / "ref.jpg", quality=88)
    grab(src, 0.5, (960, 540)).convert("RGB").save(OUT / "plate.jpg", quality=88)
    for i, t in enumerate([0.8, 2.4, 4.0, 6.6, 7.6, 9.5, 11.5, 13.8]):
        grab(src, t, (400, 225)).convert("RGB").save(OUT / f"film_{i}.jpg", quality=86)
    # keying demo: one frame before, its matte, and the cut-out placed back in the full frame
    t = 6.9
    grab(src, t, (960, 540)).convert("RGB").save(OUT / "key_green.jpg", quality=88)
    meta = (ROOT / "clips/kling15.js").read_text()
    crop = json.loads(meta[meta.index("] = ") + 4:meta.rindex(";")])["crop"]
    cut = grab(keyed, t, codec="libvpx-vp9", rgba=True).convert("RGBA")
    full = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    full.paste(cut, (crop[0], crop[1]))
    full = full.resize((960, 540), Image.LANCZOS)
    full.save(OUT / "key_cut.png", optimize=True)
    a = np.array(full)[..., 3]
    Image.fromarray(a).convert("L").resize((480, 270)).save(OUT / "key_mask.png", optimize=True)
    for i in range(30):
        grab(mv, 0.25 + i * 0.5, (480, 270)).convert("RGB").save(OUT / f"mv_{i:02d}.jpg", quality=84)
    print("wrote", len(list(OUT.iterdir())), "files")


if __name__ == "__main__":
    main()
