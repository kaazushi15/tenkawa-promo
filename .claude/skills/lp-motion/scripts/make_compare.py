# Side-by-side post video: source LP (left, highlight follows the current scene) | final motion (right).
# usage: python make_compare.py source.png final.mp4 scenes.json bg.png out.mp4 DURATION
# scenes.json: [{"t": 0, "rect": [x0,y0,x1,y1]}, ...]  rects in source-image pixels, t = scene start in the final video
import json, subprocess, sys
from PIL import Image, ImageDraw
srcp, final, scenes, bg, out, DUR = sys.argv[1:7]; DUR = float(DUR)
FPS, PW, PH, LX, RX, TOP = 60, 1040, 1849, 26, 1094, 125
S = Image.open(srcp).convert('RGB'); sx, sy = PW / S.width, PH / S.height; src = S.resize((PW, PH), Image.LANCZOS)
SEG = json.load(open(scenes))
def ease(x): x = min(1, max(0, x)); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def rect(t):
    cur = SEG[0]['rect']
    for i, s in enumerate(SEG):
        if t >= s['t']:
            prev = SEG[i - 1]['rect'] if i else s['rect']; e = ease((t - s['t']) / .7)
            cur = [p + (q - p) * e for p, q in zip(prev, s['rect'])]
    return cur
dim = Image.new('RGBA', (PW, PH), (20, 20, 20, 90)); clear = Image.new('RGBA', (PW, PH), (0, 0, 0, 0))
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-framerate', str(FPS), '-i', bg,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{PW}x{PH}', '-framerate', str(FPS), '-i', '-', '-i', final,
    '-filter_complex', f'[2:v]scale={PW}:{PH}:flags=lanczos[r];[0:v][1:v]overlay={LX}:{TOP}[a];[a][r]overlay={RX}:{TOP}:shortest=1,format=yuv420p[v]',
    '-map', '[v]', '-map', '2:a?', '-t', str(DUR), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
for f in range(int(DUR * FPS)):
    x0, y0, x1, y1 = rect(f / FPS); X0, Y0, X1, Y1 = x0 * sx, y0 * sy, x1 * sx, y1 * sy
    im = src.copy().convert('RGBA'); mk = Image.new('L', (PW, PH), 255); ImageDraw.Draw(mk).rectangle([X0, Y0, X1, Y1], fill=0)
    im.alpha_composite(Image.composite(dim, clear, mk)); ImageDraw.Draw(im).rectangle([X0 + 2, Y0 + 2, X1 - 3, Y1 - 3], outline=(255, 226, 40, 255), width=6)
    ff.stdin.write(im.convert('RGB').tobytes())
ff.stdin.close(); ff.wait(); print('done', out)
