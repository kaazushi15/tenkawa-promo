#!/bin/bash
# Regenerate the stills/frames the making-of page uses (from the rendered videos).
set -e; cd "$(dirname "$0")"
mkdir -p frames/final frames/prev
git show 94e9794:h3-lp-animation/out/H3_LP_motion.mp4 > v1.mp4; git show 1b5b104:h3-lp-animation/out/H3_LP_motion.mp4 > v2.mp4
ffmpeg -loglevel error -y -ss 3.0 -i v1.mp4 -frames:v 1 -vf scale=540:-1 frames/v1.jpg
ffmpeg -loglevel error -y -ss 5.05 -i v2.mp4 -frames:v 1 -vf scale=540:-1 frames/v2.jpg
ffmpeg -loglevel error -y -ss 6.5 -i ../out/h3_lp_motion_silent.mp4 -frames:v 1 -vf scale=540:-1 frames/v3.jpg
ffmpeg -loglevel error -y -ss 3.6 -t 2.6 -i ../out/h3_lp_motion_silent.mp4 -vf "fps=60,scale=1040:1849" -q:v 3 frames/final/f_%03d.jpg
i=0; for t in 1.5 4.5 9.0 11.5 14.0 18.0 20.5 24.5 28.5 31.0 33.5; do i=$((i+1)); ffmpeg -loglevel error -y -ss $t -i ../out/h3_lp_motion_silent.mp4 -frames:v 1 -vf scale=432:768 -q:v 3 frames/prev/p$i.jpg; done
