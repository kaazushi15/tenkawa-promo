"""Cut the woman out of the key visual (assets/reference.webp) and put her on a flat
green plate for the video model (assets/plate.png), plus an RGBA sprite
(assets/woman.png) used until the animated take is in.

Same approach as koi-mv/tools/cutout.py: flood-fill every background-like colour
from the image border (magenta field, white type and routes, their anti-aliased
blend); her line art stops the fill.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
X0, Y0, X1, Y1 = 880, 0, 1720, 1125


def largest(mask):
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    return lab == (np.argmax(ndi.sum(mask, lab, range(1, n + 1))) + 1)


def main():
    a = np.array(Image.open(ROOT / "assets/reference.webp").convert("RGB")).astype(float)[Y0:Y1, X0:X1]
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    magenta = (R > 150) & (G < 95) & (R - G > 110) & (B > 55) & (B < 160)
    M, W = np.array([203, 34, 103.0]), np.array([252, 250, 250.0])
    d = W - M
    t = ((a - M) @ d) / (d @ d)
    blend = (t > -0.05) & (t < 1.05) & (np.linalg.norm(a - (M + t[..., None] * d), axis=-1) < 12)
    white = (mn > 238) & (mx - mn < 10)
    lab, _ = ndi.label(magenta | blend | white)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, list(set(np.unique(edge)) - {0}))
    girl = largest(~bg)
    light = mn > 180
    girl &= ~(light & ~ndi.binary_opening(girl, np.ones((3, 3)), iterations=2))
    girl = largest(girl)
    # background showing through gaps in her hair and coat: enclosed, so the fill never reached it.
    # Only the exact field colour (G ≈ 34); her pink tag, collar and bag print are lighter.
    field = (np.abs(R - 203) < 24) & (G < 56) & (np.abs(B - 103) < 26)
    lab2, n2 = ndi.label(field & girl)
    sizes = ndi.sum(field & girl, lab2, range(1, n2 + 1))
    cents = ndi.center_of_mass(field & girl, lab2, range(1, n2 + 1))
    in_tag = lambda c: 250 < c[1] < 345 and 570 < c[0] < 740  # the pink ETOILE GYM tag is the same pink as the field
    holes = np.isin(lab2, [i + 1 for i, (n, c) in enumerate(zip(sizes, cents)) if n > 150 and not in_tag(c)])
    girl &= ~ndi.binary_dilation(holes, iterations=1)
    # flyaway hair tips blended with the field read as pink streaks on any other background
    yy, xx = np.mgrid[0:girl.shape[0], 0:girl.shape[1]]
    girl &= ~(((R - G) > 85) & (G < 110) & (yy < 330) & (xx < 430))

    alpha = Image.fromarray((girl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    sprite = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
    sprite.putalpha(alpha)
    sprite.save(ROOT / "assets/woman.png", optimize=True)
    # green plate for image-to-video: 1920x1080, her feet near the bottom, centred
    plate = Image.new("RGBA", (1920, 1080), (98, 194, 12, 255))
    k = 1000 / sprite.height
    s = sprite.resize((round(sprite.width * k), 1000), Image.LANCZOS)
    plate.alpha_composite(s, ((1920 - s.width) // 2, 1080 - s.height - 40))
    plate.convert("RGB").save(ROOT / "assets/plate.png")
    print("sprite", sprite.size, "plate written")


if __name__ == "__main__":
    main()
