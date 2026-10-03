# Real-ESRGAN x4plus upscale of the LP source (tiled, CPU).
# usage: python upscale.py RealESRGAN_x4plus.pth in.png out_4x.png
# deps: pip install torch spandrel pillow ; weights: github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
import sys, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
torch.set_num_threads(4)
model = ModelLoader().load_from_file(sys.argv[1]).model.eval()
im = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape
T, P, S = 256, 16, 4
out = np.zeros((H*S, W*S, 3), np.float32)
x = torch.from_numpy(im).permute(2, 0, 1)[None]
for y0 in range(0, H, T):
    for x0 in range(0, W, T):
        ya, xa = max(y0-P, 0), max(x0-P, 0)
        yb, xb = min(y0+T+P, H), min(x0+T+P, W)
        with torch.no_grad():
            o = model(x[:, :, ya:yb, xa:xb])[0].permute(1, 2, 0).numpy()
        ty, tx = min(T, H-y0), min(T, W-x0)
        out[y0*S:(y0+ty)*S, x0*S:(x0+tx)*S] = o[(y0-ya)*S:(y0-ya+ty)*S, (x0-xa)*S:(x0-xa+tx)*S]
    print(f'{y0}/{H}', flush=True)
Image.fromarray((out.clip(0, 1)*255+.5).astype(np.uint8)).save(sys.argv[3])
