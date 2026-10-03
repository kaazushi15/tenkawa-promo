# Put the ORIGINAL crop back into an outpainted 9:16 frame so the face/product stays untouched.
# usage: python outpaint_composite.py outpainted.jpg original_crop.png Y_OFFSET out.jpg [feather_px]
# The outpaint must have been generated from a 1080x1920 canvas where the crop (scaled to 1080 wide) sat at Y_OFFSET.
import sys, numpy as np
from PIL import Image
gen = Image.open(sys.argv[1]).convert('RGB').resize((1080, 1920), Image.LANCZOS)
crop = Image.open(sys.argv[2]).convert('RGB'); h = round(crop.height * 1080 / crop.width)
crop = crop.resize((1080, h), Image.LANCZOS); Y = int(sys.argv[3]); F = int(sys.argv[5]) if len(sys.argv) > 5 else 70
G = np.asarray(gen).astype(float); C = np.asarray(crop).astype(float)
best = min(((np.mean(np.abs(G[Y+dy+60:Y+dy+h-60, 40:-40] - np.roll(C, dx, 1)[60:h-60, 40:-40])), dx, dy) for dy in range(-8, 9) for dx in range(-8, 9)))
_, dx, dy = best
m = np.ones((h, 1080)); r = np.linspace(0, 1, F); m[:F] *= r[:, None]; m[-F:] *= r[::-1][:, None]
sub = G[Y+dy:Y+dy+h]; sub[:] = sub * (1 - m[..., None]) + np.roll(C, dx, 1) * m[..., None]
Image.fromarray(G.clip(0, 255).astype(np.uint8)).save(sys.argv[4], quality=94, subsampling=0)
print('aligned', dx, dy)
