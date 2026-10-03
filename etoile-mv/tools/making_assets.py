"""Stills and clips for the making-of (making.html), pulled from the real production files.

Needs clips/h3.src.mp4 (the raw MiniMax H3 take), clips/h3.webm (its keyed version),
assets/woman.png + assets/plate.png (tools/cutout.py) and dist/etoile.mp4 (the finished
spot). Writes assets/making/*. Run tools/layers.mjs for the exploded-layer stills.
"""
import json, os, subprocess
from io import BytesIO
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
    return Image.open(BytesIO(subprocess.run(args, capture_output=True, check=True).stdout))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src, keyed, spot = ROOT / "clips/h3.src.mp4", ROOT / "clips/h3.webm", ROOT / "dist/etoile.mp4"
    ref = Image.open(ROOT / "assets/reference.webp").convert("RGB")
    ref.resize((1040, 585), Image.LANCZOS).save(OUT / "ref.jpg", quality=90)
    # cut-out step: the poster's woman, the cut-out, the green plate
    ref.crop((880, 0, 1720, 1125)).resize((420, 562), Image.LANCZOS).save(OUT / "cut_src.jpg", quality=90)
    Image.open(ROOT / "assets/woman.png").resize((420, 562), Image.LANCZOS).save(OUT / "cut_woman.png", optimize=True)
    Image.open(ROOT / "assets/plate.png").convert("RGB").resize((640, 360), Image.LANCZOS).save(OUT / "plate.jpg", quality=88)
    # animate step: frames from the H3 take
    for i, t in enumerate([0.6, 2.4, 4.4, 6.4, 7.6, 9.8, 11.2, 12.6, 14.2]):
        grab(src, t, (400, 225)).convert("RGB").save(OUT / f"film_{i}.jpg", quality=86)
    # key-out step: one frame, its matte, and the cut-out back in the full frame
    t = 10.2
    grab(src, t, (1000, 562)).convert("RGB").save(OUT / "key_green.jpg", quality=90)
    meta = (ROOT / "clips/h3.js").read_text()
    crop = json.loads(meta[meta.index("] = ") + 4:meta.rindex(";")])["crop"]
    cut = grab(keyed, t, codec="libvpx-vp9", rgba=True).convert("RGBA")
    full = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    full.paste(cut, (crop[0], crop[1]))
    full = full.resize((1000, 562), Image.LANCZOS)
    full.save(OUT / "key_cut.png", optimize=True)
    Image.fromarray(np.array(full)[..., 3]).convert("L").resize((400, 225)).save(OUT / "key_mask.png", optimize=True)
    # storyboard: one frame per scene of the finished spot
    for i, t in enumerate([1.45, 2.9, 4.95, 6.95, 8.2, 10.5, 12.6, 14.4]):
        grab(spot, t, (480, 270)).convert("RGB").save(OUT / f"scene_{i}.jpg", quality=86)
    # export step: frames being shot
    for i in range(14):
        grab(spot, 0.4 + i * 1.05, (360, 203)).convert("RGB").save(OUT / f"shot_{i:02d}.jpg", quality=84)
    # the finished spot, as VP9 (Chromium builds without H.264 can still seek it)
    subprocess.run([FFMPEG, "-loglevel", "error", "-y", "-i", str(spot), "-an", "-vf", "scale=960:540", "-c:v", "libvpx-vp9",
                    "-b:v", "0", "-crf", "30", "-row-mt", "1", "-g", "15", str(OUT / "spot.webm")], check=True)
    print("wrote", len(list(OUT.iterdir())), "files")


if __name__ == "__main__":
    main()
