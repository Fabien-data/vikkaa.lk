#!/usr/bin/env bash
# Mux picture + mix, pick the poster, and write social masters (poster baked as frame 0) and lean web encodes (no baked frame:
# the site loops the film, and a baked poster would flash once per loop).
set -euo pipefail
cd "$(dirname "$0")"
POSTER_T=7.60   # S2 settled: the graded villa holding "Yours deserves a campaign."
WEB=/d/Vikkaa.lk/public/film
for F in ${FORMATS:-landscape vertical}; do
  V=work/video-$F.mp4
  frames=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$V")
  echo "$F frames: $frames (expect 885)"
  sfx=$([ $F = landscape ] && echo "" || echo "-vertical")
  ffmpeg -hide_banner -loglevel error -y -ss $POSTER_T -i "$V" -frames:v 1 -q:v 2 "brag$sfx.jpg"
  # social master: replace frame 0 with the poster (same frame count, audio sync untouched)
  ffmpeg -hide_banner -loglevel error -y -i "$V" -i "brag$sfx.jpg" -i work/mix.wav -filter_complex     "[1:v]format=yuv420p,setsar=1[p];[0:v][p]overlay=0:0:enable='eq(n,0)'[v]"     -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "brag$sfx.mp4"
  # web encode
  name=$([ $F = landscape ] && echo vikkaa-film-1080 || echo vikkaa-film-vertical)
  crf=$([ $F = landscape ] && echo 25 || echo 27)
  ffmpeg -hide_banner -loglevel error -y -i "$V" -i work/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -profile:v high -crf $crf -maxrate 6M -bufsize 12M \
    -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -movflags +faststart "$WEB/$name.mp4"
  ffmpeg -hide_banner -loglevel error -y -ss $POSTER_T -i "$V" -frames:v 1 -vf "scale=iw*0.75:-1" -q:v 4 "$WEB/$name-poster.jpg"
done
ls -la brag*.mp4 brag*.jpg "$WEB"
