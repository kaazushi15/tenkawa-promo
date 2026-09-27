"""Download glyph-subset webfonts from Google Fonts for every string the MV and the
making-of display. Re-run after changing any on-screen text."""
import re, subprocess, urllib.parse
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "fonts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

JP = [  # MV
    "まだ、伝えられない", "気持ちがある。", "恋する乙女のラブソング", "LINEのメッセージ、何度も書いては消してる。",
    "「好き」って、たった一言が", "こんなに言えないなんて。", "他の誰かじゃダメなの。", "あなたでなきゃ、ダメなの。",
    "不安好き涙片想い勇気", "NOW PLAYING ▶", "ねぇ、気づいてくれてる?", "この気持ち、ちゃんと。", "目が合うたびに、胸が痛くて",
    "うまく笑えなくなるの。", "この恋が届くその日まで、", "今日も、心の中で歌ってる。", "こいのなやみ、エモいまま。",
    "恋の悩みエモい感じのラブソング", "・",
    # making-of
    "ができるまで", "原画", "緑背景", "動かす", "切り抜く", "組み立て", "音", "書き出し", "キービジュアル 1枚",
    "ぜんぶ、この1枚から。", "キャラだけを、緑の上に描き直す", "緑の上で、15秒うごいてもらう", "緑だけを消して、透明に",
    "背景・路線図・文字・キャラを重ねる", "音も、コードで鳴らす", "1コマずつ撮って、450枚をMP4に",
    "左を向いたまま歩く", "ハートがふわっと浮かぶ", "ジャンプしてキャッチ", "元の映像", "マスク", "切り抜き後",
    "背景", "路線図", "文字", "キャラ", "リリック", "完成", "×",
]
EN = ["YOSHINA LOVE SONG", "LYRIC VIDEO", "PRESENTED BY YOSHINA", "SUNG BY YOSHINA", "WORDS & MUSIC: YOSHINA", "JAPAN",
      "I can't tell you yet.", "This feeling, it's still here.", "A love song just for you,", "sung quietly in my heart.",
      "NOW PLAYING", "FUAN SUKI NAMIDA KATAOMOI YUUKI", "LINE 0123456789 · ・",
      "HOW IT'S MADE", "MAKING OF", "KEY VISUAL", "GREEN PLATE", "ANIMATE", "KEY OUT", "COMPOSE", "SOUND", "EXPORT",
      "Seedream", "Kling 3.0", "Python", "ffmpeg", "HTML", "CSS", "JavaScript", "Web Audio API", "Playwright",
      "Built with Claude Code", "DRUMS BASS KEYS BELL", "128 BPM", "FRAMES", "MP4", "1920×1080 30fps 15s", "STEP 7 STEPS"]
MONO = ["function render(t) {", "  cam.x = camX(t);", "  girl.seek(clipTime(t));", "  lyrics.draw(t);", "}", "0123456789 / FRAMES"]
SCRIPT = ["Koisuru Otome Love Song"]

JOBS = [("Zen Maru Gothic", "700", JP, "zenmaru-700"), ("Zen Maru Gothic", "900", JP, "zenmaru-900"),
        ("Nunito", "800", EN, "nunito-800"), ("Nunito", "900", EN, "nunito-900"),
        ("Allura", "400", SCRIPT, "allura-400"), ("DM Mono", "500", MONO, "dmmono-500")]

for family, weight, lines, name in JOBS:
    text = "".join(sorted(set("".join(lines))))
    url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(family)}:wght@{weight}&text={urllib.parse.quote(text)}"
    css = subprocess.run(["curl", "-sS", "-A", UA, url], capture_output=True, text=True, check=True).stdout
    src = re.findall(r"url\((https://[^)]+)\)", css)[0]
    subprocess.run(["curl", "-sS", "-A", UA, "-o", str(OUT / f"{name}.woff2"), src], check=True)
    print(name, len(text), "glyphs")
