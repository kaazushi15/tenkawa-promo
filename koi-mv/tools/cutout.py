"""Cut the character sprites out of the key-visual (assets/reference.webp).

Outputs
  assets/girl.png        girl hugging the heart cushion (RGBA)
  assets/girl_empty.png  same pose without the cushion; chest/waist behind it repainted
  assets/girl_sleeve.png just the near sleeve, layered over the cushion as it slips free

The key-visual has a flat lime field with white type, routes and petals touching
the girl, so she is segmented by flood-filling every "background-like" colour from
the image border. Her dark line art stops the fill.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "reference.webp"
X0, Y0, X1, Y1 = 520, 20, 1480, 1110  # crop around the girl in the 2000x1125 key-visual


def largest(mask):
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    return lab == (np.argmax(sizes) + 1)


def segment(a):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    lime = (G > R + 60) & (G > B + 120)
    L, W = np.array([98, 194, 12.0]), np.array([253, 253, 251.0])
    d = W - L
    t = ((a - L) @ d) / (d @ d)
    dist = np.linalg.norm(a - (L + t[..., None] * d), axis=-1)
    lime_white = (t > -0.05) & (t < 1.05) & (dist < 10)  # anti-aliased type edges
    white = (mn > 232) & (mx - mn < 14)
    petal = (R > 225) & (G > 150) & (G < 215) & (B > 170) & (B < 230) & (R - G > 25)
    script = (R > 200) & (G > 110) & (G < 185) & (B > 80) & (B < 165) & (R - B > 60)
    flood = lime | lime_white | white | petal | script
    lab, _ = ndi.label(flood)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, list(set(np.unique(edge)) - {0}))
    girl = largest(~bg)
    # drop thin light slivers left over from the lettering (keeps thin dark hair strands)
    light = mn > 170
    opened = ndi.binary_opening(girl, structure=np.ones((3, 3)), iterations=2)
    girl &= ~(light & ~opened)
    # stray route segment touching the cardigan hem
    girl[472:494, 712:875] &= ~light[472:494, 712:875]
    return largest(girl)


def heart_mask(a, girl):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    pink = (R > 170) & (R - G > 60) & (R - B > 40) & (G < 190)
    lab, _ = ndi.label(pink & girl)
    h = np.zeros_like(girl)
    for i, (ys, xs) in enumerate(ndi.find_objects(lab), 1):
        if xs.start >= 240 and xs.stop <= 590 and ys.start >= 140 and ys.stop <= 500 and (lab[ys, xs] == i).sum() > 300:
            h |= lab == i
    h = ndi.binary_fill_holes(h)
    dark = a.max(-1) < 150
    for _ in range(4):
        h |= ndi.binary_dilation(h) & dark & girl
    return ndi.binary_fill_holes(h)


def save(rgb, mask, name):
    alpha = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("RGBA")
    img.putalpha(alpha)
    img.save(ROOT / "assets" / name, optimize=True)
    print("wrote", name, img.size)


def main():
    a = np.array(Image.open(SRC).convert("RGB")).astype(float)[Y0:Y1, X0:X1]
    girl = segment(a)
    save(a, girl, "girl.png")

    h = heart_mask(a, girl)
    empty = largest(girl & ~h)
    # repaint the uniform that the cushion used to hide (crop coordinates)
    poly = [(464, 206), (446, 248), (437, 295), (433, 350), (431, 420), (429, 452), (418, 468),
            (510, 470), (600, 298), (620, 270), (512, 204)]
    size = (a.shape[1], a.shape[0])
    body = Image.new("L", size, 0)
    ImageDraw.Draw(body).polygon(poly, fill=255)
    line = Image.new("L", size, 0)
    ImageDraw.Draw(line).line(poly[:7], fill=255, width=4, joint="curve")
    fill = (np.array(body) > 0) & ~empty
    rgb = a.copy()
    rgb[fill] = (31, 34, 58)
    rgb[fill & (np.array(line) > 0)] = (14, 14, 22)
    save(rgb, empty | fill, "girl_empty.png")

    sleeve_poly = [(282, 375), (300, 347), (340, 335), (405, 330), (450, 313), (460, 300), (500, 294),
                   (540, 297), (590, 302), (625, 318), (640, 330), (640, 360), (560, 400), (520, 425),
                   (480, 440), (440, 447), (390, 444), (340, 432), (300, 414), (284, 392)]
    region = Image.new("L", size, 0)
    ImageDraw.Draw(region).polygon(sleeve_poly, fill=255)
    save(rgb, empty & (np.array(region) > 0), "girl_sleeve.png")


if __name__ == "__main__":
    main()
