#!/bin/bash
# Render the motion page in 3 parallel segments, join, fit BGM and mux.
# usage (from the project dir): <skill>/scripts/render_all.sh END_SECONDS [BGM_FILE] [STRETCH]
set -e
SK="$(cd "$(dirname "$0")" && pwd)"
END=${1:?END seconds}; BGM=$2; ST=${3:-1.0}; FPS=60; W=3
mkdir -p out
for i in $(seq 0 $((W-1))); do
  A=$(python3 -c "print(round($i*$END/$W*$FPS)/$FPS)"); B=$(python3 -c "print(round(($i+1)*$END/$W*$FPS)/$FPS)")
  node "$SK/render.mjs" out/seg$i.mp4 $FPS --from $A --to $B > out/seg$i.log 2>&1 &
done
wait
: > out/segs.txt; for i in $(seq 0 $((W-1))); do echo "file 'seg$i.mp4'" >> out/segs.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/segs.txt -c copy out/silent.mp4
rm -f out/seg*.mp4
if [ -n "$BGM" ]; then
  TOTAL=$(python3 -c "print($END+1.2)")
  python3 "$SK/fit_bgm.py" "$BGM" out/score.wav "$ST" "$TOTAL"
  ffmpeg -y -loglevel error -i out/silent.mp4 -i out/score.wav -vf "tpad=stop_mode=clone:stop_duration=1.2" -c:v libx264 -preset slower -crf 22 -tune film -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart out/final.mp4
else
  ffmpeg -y -loglevel error -i out/silent.mp4 -c:v libx264 -preset slower -crf 22 -pix_fmt yuv420p -movflags +faststart out/final.mp4
fi
echo DONE out/final.mp4
