# Audio

## BGM prompt (the user generated the final track with Lyria 3 Pro from a prompt like this)
```
Elegant, luxurious instrumental for a premium Japanese {{CATEGORY}} commercial ({{PRODUCT_NAME}}).
Length: exactly {{SECONDS}} seconds. Tempo: 80 BPM. No vocals.
Instrumentation: warm felt piano lead, lush string ensemble (legato, soft vibrato), delicate harp arpeggios,
airy pad, gentle low bass. Refined, transparent, graceful, cinematic. Spacious hall reverb.
No heavy drums, no EDM, no sound effects.
Structure: 0–3s solo piano motif (logo) / 3–8s strings enter softly (hero) / 8–12s sparse (manifesto) /
12–17s opens up with harp (product reveal) / 17–27s flowing (benefits, trust) / 27–32s gradual lift
(comparison) / last 3s resolve on a bright chord that rings out. No fade-out.
```
Generated clips are often ~30s and may end abruptly: fit with `scripts/fit_bgm.py` (stretch ≈ target/len,
adds a hall tail) and hold the end card ~1.2s.

Do not add synthesized sound effects unless asked; the user found them cheap. If no music can be obtained,
a synthesized piano/strings fallback is better than nothing but tell the user it is a placeholder.

## Narration script template
Use the LP's own copy, one line per scene, calm female 20s–30s voice, slow (≈0.14s/char), generous pauses.
Example (H3):
1. シリコンを、選び直す。／髪を守り、艶をつくり、ストレスから解放する。
2. シリコン、イコール、悪。その常識を、ひっくり返す。
3. 新発想のシリコンシャンプー、エイチスリー。
4. 守る。艶めく。軽やか。
5. 3つのHが、髪を再定義する。
6. 軽い。透ける。流れる。
7. あなたの髪で、新しいシリコンを、体験してください。
When narration arrives, detect phrase onsets (RMS) and retime scene windows to them; duck BGM ~6dB under voice.
