# Post assets

## Comparison video (`scripts/make_compare.py`)
Canvas 2160×2000: label band (INPUT / OUTPUT) + two 1040×1849 panes. Left = source LP with a yellow outline
that eases (0.7s) to the section currently playing on the right, rest dimmed. Needs `scenes.json`
(`[{"t":0,"rect":[x0,y0,x1,y1]}, …]` in source pixels) and a static background PNG with labels
(render a tiny HTML page with `render.mjs --page … --size 2160x2000 --frames 0`, `STILL_PNG=1`).

## Making-of (20s, same canvas) — structure the user understood
0. Title: "MAKING OF / 画像1枚から、LPモーションへ。" + the 3-step flow in one line
1. STEP 1 画像を読み取って、構成をつくる — numbered boxes appear on the source; storyboard rows (number,
   name, final-frame thumbnail, seconds) fill in on the right.
2. STEP 2 小さくて崩れる写真は、作り直す — three rows: actual-size crop (with px dims) → AI upscale
   ("ぼやける・崩れる") → regenerated ("くっきり"), tool chip "Runway（Nano Banana Pro）".
3. STEP 3 アニメーションは、コードで書いて書き出す — 4 cards with arrows: HTML/CSS → JavaScript timeline +
   WebGL → Playwright frame capture (counter) → ffmpeg + BGM (mini playing video).
4. Comparison panes with the final video playing.
`assets/example_h3/making.tpl.html` is the working template. Then join compare + making with a 0.6s xfade
(normalise both to 60fps and `settb=1/60` first or xfade fails).

## Post copy
- Post 1: one hook line, no details. If the user wants the model named: e.g.
  「動画生成AIを使わずに、Claude Opus 5.5 で画像1枚をLPモーションにしてみた。」+ "AI × モーショングラフィックス".
- Replies: ① origin (prompt repurposed from a video-model workflow, one image as input) ② decomposition +
  exact copy + SVG logo ③ regenerated photos ④ HTML/CSS/JS + WebGL, frame capture, 60fps, no video editor;
  BGM tool ⑤ takeaway.
- Note the extra tools honestly (image regeneration, BGM) if the hook says "だけで".
