# Download Google Fonts (CSS + every woff2 subset) into assets/fonts/ so renders never depend on the network.
# usage: python download_fonts.py "Shippori+Mincho:wght@400;500;600" "Zen+Kaku+Gothic+New:wght@400;500;700" ...
import re, sys, os, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
fams = sys.argv[1:] or ["Shippori+Mincho:wght@400;500;600", "Zen+Kaku+Gothic+New:wght@400;500;700", "Josefin+Sans:wght@300;400;600", "Cormorant+Garamond:wght@400;500"]
url = "https://fonts.googleapis.com/css2?" + "&".join("family=" + f for f in fams) + "&display=block"
css = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read().decode()
os.makedirs("assets/fonts", exist_ok=True)
for i, u in enumerate(sorted(set(re.findall(r"url\((https://[^)]+)\)", css)))):
    open(f"assets/fonts/f{i}.woff2", "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers=UA)).read())
    css = css.replace(u, f"f{i}.woff2")
open("assets/fonts/fonts.css", "w").write(css)
print("ok", url)
