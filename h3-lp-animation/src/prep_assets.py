# Crop photographic regions from the Real-ESRGAN 4x source and export web-ready assets.
from PIL import Image, ImageFilter
import numpy as np
S = 4
src = Image.open('assets/source_4x.png').convert('RGB')
out = 'assets/img/'
def crop(name, box, w=None, q=93):
    x0, y0, x1, y1 = box
    im = src.crop((x0*S, y0*S, x1*S, y1*S))
    if w and im.width > w:
        im = im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    im.save(out+name, quality=q, subsampling=0)
    print(name, im.size)
crop('profile.jpg', (0, 426, 376, 676), 1400)
crop('v1.jpg', (163, 963, 330, 1111), 800)
crop('v2.jpg', (554, 963, 720, 1111), 800)
crop('v3.jpg', (911, 963, 1110, 1111), 800)
crop('glass.jpg', (158, 1119, 373, 1313), 1200)
crop('tex_hair.jpg', (884, 1123, 1078, 1182), 600)
crop('tex_water.jpg', (884, 1187, 1078, 1246), 600)
crop('tex_leaf.jpg', (884, 1251, 1078, 1310), 600)
crop('step1.jpg', (204, 1321, 352, 1370), 700)
crop('step2.jpg', (204, 1375, 352, 1427), 700)
crop('step3.jpg', (204, 1433, 352, 1483), 700)
crop('g1.jpg', (388, 1321, 592, 1484), 900)
crop('g2.jpg', (599, 1321, 790, 1484), 900)
crop('g3.jpg', (796, 1321, 948, 1484), 900)
crop('g4.jpg', (954, 1321, 1125, 1484), 900)
crop('faq.jpg', (690, 1721, 1125, 1847), 1600)
crop('closing.jpg', (0, 1850, 300, 1973), 1200)
crop('bottle_src.png', (440, 684, 680, 955))
crop('hero_src.png', (480, 42, 1000, 418))
