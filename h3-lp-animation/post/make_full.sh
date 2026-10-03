#!/bin/bash
# Final post video: comparison (main) → making-of, 0.6s cross-fade on picture and sound.
set -e; cd "$(dirname "$0")"
ffmpeg -y -loglevel error -i H3_compare.mp4 -i H3_making.mp4 -filter_complex "[0:v]fps=60,format=yuv420p,setsar=1,settb=1/60[c];[1:v]fps=60,format=yuv420p,setsar=1,settb=1/60[m];[c][m]xfade=transition=fade:duration=0.6:offset=35.6[v];[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[a0][a1]acrossfade=d=0.6[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart H3_full.mp4
