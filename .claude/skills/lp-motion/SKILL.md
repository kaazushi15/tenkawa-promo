---
name: lp-motion
description: Turn a product or service into an editorial D2C-style landing-page design image and then into a polished vertical (9:16) LP motion video with a code-driven pipeline (scene decomposition, exact-copy re-typesetting with web fonts, SVG logo, regenerated photography, HTML/CSS/WebGL timeline, frame-accurate Playwright render, ffmpeg + BGM), plus side-by-side comparison, making-of and post copy. Use this whenever the user wants an LP風アニメーション / LPモーション / モーショングラフィックス from an LP image, wants to generate an LP-style design image (GPT Image 2 / Codex / Nano Banana) for a new product or service and animate it, mentions "画像からモーショングラフィックス", "LP画像を動かしたい", "H3のやり方で", or asks to reproduce the H3 shampoo workflow for another brand — even if they only describe the product and never say "skill".
---

# LP image → LP motion

This skill reproduces a workflow that worked very well for the "H3" silicone-shampoo test:
**one editorial LP image (generated from a brief) → decompose it → rebuild it in code → animate → render 60fps**.
The video is *not* made by a video-generation model. Every frame is drawn by a browser from HTML/CSS/WebGL,
so copy stays pixel-exact, typography is crisp at any size, and timing is fully controllable.

A finished reference implementation lives in `assets/example_h3/` (`index.html` = engine + scenes of the approved
v3, `source.webp` = the LP image it was built from, `scenes.json` = section rects/times, `making.tpl.html` =
making-of page). Read `index.html` before building; its asset paths point at the original H3 project
(`assets/img`, `assets/gen2`, `assets/fonts`) — mirror that layout in the new project.

## Phase 0 — Gather inputs (ask only what is missing)

- Product/service name, what it is, who it is for, the "常識をひっくり返す" angle (the one belief it overturns)
- Reference material: product photo (bottle/package/app screen), SNS posts, screenshots, existing LP
- Brand colour hints, tone words, required copy, prices/plans/CTA
- Video length (default ~35s; 25s felt rushed, 34s with slow uniform scenes felt sluggish — pace matters more than length)
- Whether they will supply BGM / narration (users often generate these themselves; offer prompts — see `references/audio.md`)

## Phase 1 — Generate the LP design image

1. Fill the master prompt in `references/lp_image_prompt.md` for this product (keep its structure; swap every
   product-specific block, regulatory block and section list to match the category — e.g. 薬機法 for cosmetics,
   景表法/特商法 for services, app UI shots instead of bottles for software).
2. Generate with **GPT Image 2** (the model the user prefers for this). Route, in order of preference:
   - a Codex agent/tool if one is connected in this session (ask it to use gpt-image-2 with the filled prompt
     and the attached product image);
   - otherwise Runway `generate_image` with `model: gpt-image-2` (or `nano-banana-pro` as fallback), ratio 9:16,
     product photo as reference image.
   Check `references/environment.md` first if downloads of generated files fail.
3. Show the image to the user and iterate until they approve. This image is the **design spec** for everything after.

## Phase 2 — Decompose the LP (design analysis)

Read the approved image carefully (crop bands and view them zoomed). Produce, in the project dir:

- `scenes.json`: ordered sections with source-pixel rects, e.g. hero / concept / product / values / science /
  how-to / voice / comparison / FAQ / closing. This drives both the storyboard and the comparison video.
- **Exact copy transcription**: every visible headline, body line, label, price — word-for-word. Never paraphrase;
  the user judged fidelity by the copy.
- Typography mapping: pick Google fonts that match (mincho headlines → Shippori Mincho; gothic body/CTA →
  Zen Kaku Gothic New; geometric English → Josefin Sans; serif accents → Cormorant Garamond). Download them
  locally with `scripts/download_fonts.py` so renders are deterministic.
- Logo: measure the logo strokes from a zoomed crop and redraw as SVG strokes (lets it "draw on").
- Colour tokens from the image (accent colour = CTA colour).

Then plan the storyboard: one scene per LP section, ~3.5–5s each, total ≈ requested length. Long sections
(voice, FAQ) can be dropped if the length is tight — say so.

## Phase 3 — Build assets (fix what will break)

Run `scripts/upscale.py` (Real-ESRGAN x4, local) on the source, then decide per photo:

| Source photo size in the LP | What to do |
|---|---|
| Large (hero, ≥ ~500px wide) | Use the upscaled crop. If it must become full-bleed 9:16, outpaint only the empty areas, then **paste the original crop back** with a feathered edge (`scripts/outpaint_composite.py`) so the face is untouched. |
| Small (≈150–250px, typical for value/how-to/gallery tiles) | **Regenerate.** Upscaled tiny crops looked waxy/broken and the user rejected them. Regenerate each shot at 1K–2K with the KV model as identity reference so the cast stays consistent. |
| Product/package | Cut out with `scripts/cutout.py` (rembg isnet; white parts like pumps may need a manual polygon). Overlay tiny label text as real text instead of the blurry pixels. |
| Backgrounds/textures with text baked in | Regenerate clean plates (water surface, droplet textures…). Never pass the whole LP as a reference when generating a single asset — models paste LP UI fragments into the result. Pass a crop instead. |

If the user later dislikes the KV, swap it for a regenerated shot and remove the old KV from every scene.

## Phase 4 — Build the motion page

Copy the engine from `assets/example_h3/index.html` into the project and replace the scenes. Keep these parts:

- `render(t)` is pure: given time `t` it sets every style. No CSS transitions, no real-time timers —
  this is what makes frame-accurate rendering possible.
- `WIN` (scene visibility windows) + `FN.<scene>(t)` functions; helpers `rise`, `lines`, `chars`, `vlines`,
  `wipe`, `dissolve`, easing set `E`, `drawLogo`.
- `Breeze` WebGL shader: subtle wind only on dark (hair) pixels with the face ellipse protected. Tune `face`
  per photo; keep amplitude ~3–4px.
- Persistent header (logo + accent pill CTA) and a sticky purchase bar that rises in the closing scene.

Motion direction that the user approved (v3) — read `references/motion_design.md` for the catalogue:
- Unhurried, elegant: text reveals 0.7–1.0s, scenes breathe, continuous slow push on photos.
- Transitions are dissolves, dip-to-paper, warm light leaks, slow vertical page travel, soft parallax.
- Avoid by default: camera shake, hard flashes, slam-ins, whip pans, sound effects ("SE が安っぽい").
  A punchy beat-cut variant exists (v2 in the H3 history) but felt "せわしない".

Check layouts with stills before any full render:
`node <skill>/scripts/render.mjs x 60 --frames 2.5,7.8,12.4,...` (run from the project dir; stills land in
`out/stills/`) → contact sheet → fix overlaps (text over faces,
header over content, wrapping), then render.

## Phase 5 — Render

From the project dir (with `npm i playwright` done): `<skill>/scripts/render_all.sh <END_SECONDS> [bgm.mp3] [stretch]`
renders in 3 parallel segments (Playwright + swiftshader with `--disable-gpu-compositing`, ~0.3s/frame/worker
at 1080×1920), concatenates, fits BGM and writes `out/final.mp4` (`out/silent.mp4` is kept for re-muxing).
Verify with a 1–2 fps contact sheet of the final file before sending. Keep deliverables under 30 MB
if they must be sent through chat (crf 21–22 at 60fps is usually enough).

BGM: fit the user's track with `scripts/fit_bgm.py <in> <out.wav> <stretch> <total_seconds>`
(rubberband time-stretch, pitch preserved, adds a hall tail if the track ends abruptly; hold the end card
~1.2s with `tpad` so it can ring out). Choose `stretch` so the track's energy lift lands near the product reveal.

## Phase 6 — Post assets (when asked)

See `references/post_assets.md`:
- Comparison video: source LP (left, with a yellow box that follows the current scene) | final video (right).
- Making-of (20s, same aspect): 3 clear steps — ① image → storyboard, ② tiny crop vs upscale vs regenerated,
  ③ the animation pipeline with tool names — then the comparison. The first attempt with abstract steps
  was judged "意味わからん"; keep each screen to one idea with big Japanese headings.
- Post copy: first post = one punchy hook line (include the model name if the user asks, e.g. "Claude Opus 5.5"),
  details go in replies.

## House rules learned the hard way

- Keep the copy exact; re-typeset rather than crop text pixels.
- Don't publish anything implying a video model made it — it's code + browser rendering.
- Don't put model identifiers in files committed to repos (labels say "Claude Code"); post copy in chat may.
- When something is blocked by the environment (downloads, TTS, music), say so plainly and offer the
  user-generates-it route with a ready prompt.
