"""Download glyph-subset webfonts from Google Fonts for every string the Étoile MV
displays. Re-run after changing any on-screen text."""
import re, subprocess, urllib.parse
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "fonts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

JP = [  # every Japanese string in the key visual
    "9月から始まる、12月のクリスマスに向けた、険しいダイエットの旅。",
    "恋する乙女は、", "痩せて", "最高の", "私へ。",
    "START", "9.01", "今日から", "私の未来が", "変わりはじめる。",
    "誘惑", "スイーツ／チョコ", "夜更かし／お酒", "わかってるけど、", "やめられない。",
    "停滞期", "頑張ってるのに", "体重が減らない。", "心が折れそう。",
    "食事制限", "カロリー計算に疲れた。", "ストレスで", "また食べてしまう。",
    "運動が続かない", "三日坊主で終わってばかり。", "私には無理なのかな。",
    "周りの目", "SNSのキラキラ投稿。", "比べちゃう自分が", "つらい。",
    "体重", "数字に一喜一憂。", "昨日より増えてると、", "落ち込む。",
    "むくみ", "顔も脚もパンパン…", "今日の自分、", "好きになれない。",
    "自己嫌悪", "また食べちゃった。", "なんで私って", "こうなんだろう。",
    "リバウンド不安", "痩せても維持できるか、", "いつも不安で", "いっぱい。",
    "わたしをあきらめない。", "この一歩が、未来を変える。",
    "次の駅は、", "理想の私。", "一緒に、乗り越えよう。",
    "GOAL", "12.25", "X'mas", "最高の笑顔で", "大切な人と特別な日を。",
    "女性専用パーソナルジム", "エトワール", "わたし史上、いちばん輝くために。",
    "完全女性専用", "安心の", "プライベート空間", "パーソナル指導", "あなたに合わせた", "オーダーメイド",
    "食事サポート", "無理なく続ける", "食習慣づくり", "手ぶらOK", "レンタル・アメニティ", "完備",
    "心斎橋駅 徒歩5分", "梅田駅 徒歩7分", "女性トレーナーのみ在籍", "無料カウンセリング受付中",
]
EN = ["START 9.01 GOAL 12.25 X'mas", "DIET JOURNEY", "MY FUTURE IS MINE.", "ETOILE GYM", "・ →"]
MONO = ["for the best me."]
SERIF = ["Étoile"]

JOBS = [("Noto Sans JP", "900", JP, "noto-900"), ("Noto Sans JP", "700", JP, "noto-700"),
        ("Montserrat", "800", EN, "montserrat-800"), ("DM Mono", "400", MONO, "dmmono-400"),
        ("Cormorant Garamond", "500", SERIF, "cormorant-500")]

OUT.mkdir(exist_ok=True)
for family, weight, lines, name in JOBS:
    text = "".join(sorted(set("".join(lines))))
    url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(family)}:wght@{weight}&text={urllib.parse.quote(text)}"
    css = subprocess.run(["curl", "-sS", "-A", UA, url], capture_output=True, text=True, check=True).stdout
    src = re.findall(r"url\((https://[^)]+)\)", css)[0]
    subprocess.run(["curl", "-sS", "-A", UA, "-o", str(OUT / f"{name}.woff2"), src], check=True)
    print(name, len(text), "glyphs")
