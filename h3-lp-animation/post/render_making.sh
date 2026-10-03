#!/bin/bash
# Making-of: 20s @30fps, 2160x2000, 3 parallel segments + excerpt of the BGM.
set -e
cd "$(dirname "$0")/.."
for i in 0 1 2; do
  A=$(python3 -c "print(round($i*20/3*30)/30)"); B=$(python3 -c "print(round(($i+1)*20/3*30)/30)")
  node src/render.mjs post/mk$i.mp4 30 --page post/making.html --size 2160x2000 --from $A --to $B > post/mk$i.log 2>&1 &
done
wait
printf "file 'mk0.mp4'\nfile 'mk1.mp4'\nfile 'mk2.mp4'\n" > post/mk.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i post/mk.txt -c copy post/mk_silent.mp4
ffmpeg -y -loglevel error -ss 9.0 -t 20 -i assets/audio/bgm_lyria_pro.mp3 -af "afade=t=in:d=0.6,afade=t=out:st=18.3:d=1.7" post/mk_bgm.wav
ffmpeg -y -loglevel error -i post/mk_silent.mp4 -i post/mk_bgm.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart post/H3_making.mp4
rm -f post/mk?.mp4 post/mk?.log post/mk.txt post/mk_silent.mp4 post/mk_bgm.wav
echo DONE
