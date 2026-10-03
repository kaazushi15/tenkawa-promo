# Motion design notes (from three H3 iterations)

## What the user said at each round
- v1 (34.6s, page-scroll transitions, uniform ~4s scenes, ambient pad): "間延びした・のんびり", photos broken.
- v2 (25s, 120 BPM beat cuts, slams, whip pans, yellow wipe, liquid fill, camera shake, synth SFX):
  "テンポがはやくてせわしない", "SE が安っぽい".
- v3 (≈35s, dissolves, light leak, slow page travel, no SFX, user's Lyria BGM): "めっちゃ良くなった".
Default to v3. Offer v2-style energy only if the brand is explicitly sporty/pop.

## Scene timing template (≈35s)
| Scene | Window | Notes |
|---|---|---|
| Intro | 0–2.6 | logo strokes draw (0.9s each, staggered), tagline rises, dissolve out |
| KV | 2.0–8.0 | full-bleed portrait, blur→sharp 1.4s, slow push 1.12→1.03, hair breeze; logo, headline chars (0.075s stagger), sub lines, CTA |
| Manifesto | 7.7–12.4 | headline chars fade in, strike-through on the "old belief" word, rotateX flip to the new line, portrait dissolves behind, body lines, CTA |
| Product | 12.2–16.8 | warm light-leak bridge, bottle rises 1.5s with -3°→0°, highlight sweep through liquid, name lines, vertical copy |
| Values ×3 | 16.6–22.3 | each ~1.6s, soft parallax cross-dissolve, number/title/caption rise; triptych to finish |
| Trust/Science | 22.3–27 | slow vertical page travel in/out, glass shimmer, letters rise per row, connector rules draw |
| How-to | 26.7–30.2 | three tall photo columns rise with clip reveal |
| Comparison | 30.2–32.2 | halves glide together, then the brand side fills the screen |
| Closing | 32.0–35 (+1.2 hold) | portrait + product, copy chars, price cards, sticky CTA bar, gentle pulse |

## Transition catalogue
Gentle (default): cross-dissolve with slight blur, dip-to-paper veil, warm light leak (screen-blended radial),
slow page travel (0.9s ease-in-out), parallax drift, clip reveal (inset) on photos, stroke-draw for logo/rules.
Energetic (on request): logo-window zoom (CSS mask with the logo SVG scaled up), colour panel wipe, liquid fill
(SVG wave path), whip pan with skew+blur, iris (clip-path circle), slam (scale 1.9→1 + blur), camera shake.

## Typography in motion
- Japanese headlines: per-character opacity+blur+rise (`chars`), or per-line mask slide (`lines`).
- Vertical copy: column-by-column clip from top (`vlines`); use `text-orientation: upright` so Latin letters
  and digits in 縦組み stay upright.
- Keep text still after it lands; motion belongs to the photos.

## Layout checks before rendering
- Text never over faces; move the photo (translate/feathered mask) rather than shrinking text.
- Header gets a paper gradient backdrop once content scrolls under it.
- Canvas elements need explicit CSS width/height (an unstyled 540×960 canvas renders at half size).
- Serve over http (the renderer starts a static server) — file:// blocks WebGL textures and CSS masks.
