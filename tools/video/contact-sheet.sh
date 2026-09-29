#!/bin/bash
# Tile rendered slides into contact sheets of 8 (2×4) for quick review.
# usage: contact-sheet.sh <dir-with-slide-NN.png>   → writes <dir>/sheet-1.png, sheet-2.png, …
set -e
dir="$1"; n=$(ls "$dir"/slide-*.png | wc -l | tr -d ' ')
for ((start=1, k=1; start<=n; start+=8, k++)); do
  ffmpeg -loglevel error -y -start_number $start -i "$dir/slide-%02d.png" -frames:v 8 \
    -vf "scale=960:540,tile=2x4:padding=6:color=white" -frames:v 1 "$dir/sheet-$k.png"
  echo "$dir/sheet-$k.png"
done
