# Cut out a product with rembg (isnet), optionally OR-ing a manual polygon for parts the model drops
# (white pumps/caps on white backgrounds). Crops to the alpha bounding box.
# usage: python cutout.py in.png out.png ["x1,y1 x2,y2 ..."]   (polygon in input pixel coords, optional)
# deps: pip install "rembg[cpu]" ; model: github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx -> ~/.u2net/
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove, new_session
src = Image.open(sys.argv[1]).convert('RGB')
a = np.array(remove(src, session=new_session('isnet-general-use'), only_mask=True, alpha_matting=True,
                    alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=20, alpha_matting_erode_size=6))
if len(sys.argv) > 3:
    m = Image.new('L', src.size, 0); ImageDraw.Draw(m).polygon([tuple(map(float, p.split(','))) for p in sys.argv[3].split()], fill=255)
    a = np.maximum(a, np.array(m.filter(ImageFilter.GaussianBlur(1.2))))
o = src.convert('RGBA'); o.putalpha(Image.fromarray(a.astype(np.uint8)))
ys, xs = np.where(a > 60); o = o.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)); o.save(sys.argv[2]); print(o.size)
