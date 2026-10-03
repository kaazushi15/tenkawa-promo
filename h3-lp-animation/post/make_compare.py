# Side-by-side: source LP (left, with a highlight that follows the current scene) | final motion (right).
import numpy as np, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter
FPS, DUR = 60, 36.2
PW, PH, LX, RX, TOP = 1040, 1849, 26, 1094, 125
src = Image.open('assets/source.png').convert('RGB').resize((PW, PH), Image.LANCZOS)
sx, sy = PW / 1125, PH / 2000
R = {'logo': (40, 70, 280, 200), 'hero': (0, 0, 1125, 420), 'concept': (0, 420, 1125, 680), 'product': (0, 680, 1125, 958),
     'values': (0, 958, 1125, 1115), 'science': (0, 1115, 1125, 1315), 'howto': (0, 1315, 1125, 1490), 'vs': (0, 1618, 1125, 1718),
     'closing': (0, 1848, 1125, 2000)}
SEG = [(0, 'logo'), (2.2, 'hero'), (7.9, 'concept'), (12.4, 'product'), (16.8, 'values'), (22.5, 'science'), (26.9, 'howto'), (30.3, 'vs'), (32.3, 'closing')]
def ease(x): x = min(1, max(0, x)); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def rect(t):
    cur = R[SEG[0][1]]
    for i, (a, k) in enumerate(SEG):
        if t >= a:
            prev = R[SEG[i - 1][1]] if i else R[k]; e = ease((t - a) / .7)
            cur = tuple(p + (q - p) * e for p, q in zip(prev, R[k]))
    return cur
dim = Image.new('RGBA', (PW, PH), (20, 20, 20, 90))
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', str(FPS), '-i', 'post/compare_bg.png',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{PW}x{PH}', '-framerate', str(FPS), '-i', '-',
    '-i', 'out/H3_LP_motion.mp4',
    '-filter_complex', f'[2:v]scale={PW}:{PH}:flags=lanczos[r];[0:v][1:v]overlay={LX}:{TOP}[a];[a][r]overlay={RX}:{TOP}:shortest=1,format=yuv420p[v]',
    '-map', '[v]', '-map', '2:a', '-t', str(DUR), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart',
    sys.argv[1]], stdin=subprocess.PIPE)
for f in range(int(DUR * FPS)):
    t = f / FPS
    x0, y0, x1, y1 = rect(t); X0, Y0, X1, Y1 = x0 * sx, y0 * sy, x1 * sx, y1 * sy
    im = src.copy().convert('RGBA')
    mask = Image.new('L', (PW, PH), 255); ImageDraw.Draw(mask).rectangle([X0, Y0, X1, Y1], fill=0)
    im.alpha_composite(Image.composite(dim, Image.new('RGBA', (PW, PH), (0, 0, 0, 0)), mask))
    d = ImageDraw.Draw(im); d.rectangle([X0 + 2, Y0 + 2, X1 - 3, Y1 - 3], outline=(255, 226, 40, 255), width=6)
    ff.stdin.write(im.convert('RGB').tobytes())
ff.stdin.close(); ff.wait(); print('done')
