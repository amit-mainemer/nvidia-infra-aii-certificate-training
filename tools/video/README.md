# Module and lesson videos

Every module gets a ~2 minute narrated intro video (lesson videos are supported but optional): a real-world story
plus a tour of the ideas, with one illustrated slide per two sentences, local neural TTS (Kokoro), and English subtitles.

- Module intros — stem `mNN-<moduleId>` (e.g. `m01-bringup`): module page + roadmap tile.
- Lesson videos — stem `mNN-<moduleId>--<lessonId>` (e.g. `m01-bringup--firmware`): top of the
  lesson page. They get a slightly lighter encode (CRF 27) to keep the repo small.

```
scripts/<name>.json      narration — one scene per slide, exactly 2 sentences each; optional "say" overrides
slides/<name>.html       one <section class="slide t-THEME"> (1920×1080) per scene
slides/base.css          themes (t-sunrise, t-ocean, …), headline card, labels, stats
slides/sprites.svg       flat illustration kit (people, robots, devices, icons), recoloured via CSS vars
slides/_catalogue.html   every sprite on one sheet — render it to browse the kit
build.py                 renders slides → voices each line → times subtitles → assembles the MP4
render-slides.mjs        headless-Chrome renderer (serves the slides folder over local HTTP)
contact-sheet.sh         tiles rendered slides 8 per sheet for quick review
sync-videos.mjs          regenerates src/data/videos.js from public/videos/
```

Output lands in `public/videos/<name>.{mp4,vtt,jpg}`. After building, run `node tools/video/sync-videos.mjs`
so the site picks it up.

## One-time setup (macOS)

```sh
brew install ffmpeg espeak-ng uv
uv venv -p 3.12 tools/video/.venv
uv pip install -p tools/video/.venv/bin/python kokoro-onnx soundfile
mkdir -p tools/video/.models && cd tools/video/.models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

Google Chrome must be installed (override its path with `CHROME=`).

## Workflow

```sh
node tools/video/render-slides.mjs tools/video/slides/m01-bringup.html /tmp/slides 1   # preview slides
tools/video/contact-sheet.sh /tmp/slides                                                    # → sheet-N.png
tools/video/.venv/bin/python tools/video/build.py m01-bringup                          # full build (~1 min)
node tools/video/sync-videos.mjs
```

Timing comes from the audio: ~320 words over 16 scenes ≈ 2:15. Each line is voiced separately, so subtitle
cues match the speech exactly. If a word is mispronounced, add `"say": { "<line index>": "phonetic spelling" }`
to the scene — the subtitle keeps the original text. Builds share a two-slot lock, so many can be started at once.
