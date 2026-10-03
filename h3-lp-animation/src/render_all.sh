#!/bin/bash
# Render the full piece in 4 parallel segments, concat, then mux the score.
set -e
cd "$(dirname "$0")/.."
END=25.0; FPS=60; W=3
SEG=$(python3 -c "print($END/$W)")
for i in $(seq 0 $((W-1))); do
  A=$(python3 -c "print(round($i*$SEG*$FPS)/$FPS)"); B=$(python3 -c "print(round(($i+1)*$SEG*$FPS)/$FPS)")
  node src/render.mjs out/seg$i.mp4 $FPS --from $A --to $B > out/seg$i.log 2>&1 &
done
wait
: > out/segs.txt; for i in $(seq 0 $((W-1))); do echo "file 'seg$i.mp4'" >> out/segs.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/segs.txt -c copy out/h3_lp_motion_silent.mp4
python3 src/audio_v2.py out/score.wav
ffmpeg -y -loglevel error -i out/h3_lp_motion_silent.mp4 -i out/score.wav -c:v libx264 -preset slower -crf 20 -tune film -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart out/H3_LP_motion.mp4
echo DONE
