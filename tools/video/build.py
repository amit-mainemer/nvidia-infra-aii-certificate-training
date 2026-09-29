"""Build a module intro video: slides + Kokoro narration + WebVTT subtitles.

usage:  tools/video/.venv/bin/python tools/video/build.py m01-bringup                    (module intro)
        tools/video/.venv/bin/python tools/video/build.py m01-bringup--firmware  (lesson video)

Inputs   tools/video/scripts/<name>.json   narration, one scene per slide
         tools/video/slides/<name>.html    one <section class="slide"> per scene
Outputs  public/videos/<name>.mp4 / .vtt / .jpg (poster)
"""
import json
import os
import re
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import EspeakConfig, Kokoro

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "tools" / "video"
MODELS = HERE / ".models"
OUT = ROOT / "public" / "videos"

FPS = 30
FADE = 0.6       # crossfade between slides
LEAD = 0.3       # silence before the first line of a scene
GAP = 0.28       # silence between lines
TAIL = 0.45      # silence after the last line of a scene
MAX_CUE = 84     # characters per subtitle cue (two short lines)
ZOOM = 0.045     # total Ken Burns zoom per slide


def tts_engine():
    espeak = EspeakConfig(lib_path="/opt/homebrew/lib/libespeak-ng.dylib", data_path="/opt/homebrew/share/espeak-ng-data")
    return Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"), espeak_config=espeak)


def split_cue(text):
    """Split a long line into subtitle-sized pieces, preferring punctuation near the middle."""
    if len(text) <= MAX_CUE:
        return [text]
    mid = len(text) // 2
    cands = [m.end() for m in re.finditer(r"[,:;?!.](\s)", text)] or [m.start() for m in re.finditer(r"\s", text)]
    cut = min(cands, key=lambda i: abs(i - mid))
    return split_cue(text[:cut].strip()) + split_cue(text[cut:].strip())


def stamp(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


@contextmanager
def build_lock(slots=2):
    """Cap concurrent TTS + ffmpeg builds when many videos are built at once."""
    base = HERE / "build"
    base.mkdir(parents=True, exist_ok=True)
    while True:
        for i in range(slots):
            lock = base / f".lock{i}"
            try:
                os.mkdir(lock)
            except FileExistsError:
                try:
                    if time.time() - lock.stat().st_mtime > 900:  # stale (crashed build)
                        os.rmdir(lock)
                except FileNotFoundError:
                    pass
                continue
            try:
                yield
            finally:
                os.rmdir(lock)
            return
        time.sleep(3)


def main(name):
    with build_lock():
        _main(name)


def _main(name):
    script = json.loads((HERE / "scripts" / f"{name}.json").read_text())
    build = HERE / "build" / name
    build.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    # 1. slides -> PNG (2x, so the slow zoom stays sharp)
    subprocess.run(["node", str(HERE / "render-slides.mjs"), str(HERE / "slides" / f"{name}.html"), str(build), "2"], check=True)
    slides = sorted(build.glob("slide-*.png"))
    scenes = script["scenes"]
    if len(slides) != len(scenes):
        sys.exit(f"{len(slides)} slides but {len(scenes)} scenes")

    # 2. narration, one TTS call per line so subtitle timing is exact
    kokoro = tts_engine()
    sr = 24000
    audio, cues, durations = [], [], []
    t = 0.0

    def silence(sec):
        return np.zeros(int(round(sec * sr)), dtype=np.float32)

    for i, scene in enumerate(scenes):
        start = t
        chunk = [silence(LEAD)]
        t += LEAD
        for j, line in enumerate(scene["lines"]):
            spoken = scene.get("say", {}).get(str(j), line)
            samples, sr = kokoro.create(spoken, voice=script.get("voice", "af_heart"), speed=script.get("speed", 1.0), lang="en-us")
            dur = len(samples) / sr
            # long lines become several cues, timed by share of characters
            pieces = split_cue(line)
            total = sum(len(p) for p in pieces)
            ct = t
            for p in pieces:
                pd = dur * len(p) / total
                cues.append((ct, ct + pd, p))
                ct += pd
            chunk.append(samples.astype(np.float32))
            t += dur
            if j < len(scene["lines"]) - 1:
                chunk.append(silence(GAP))
                t += GAP
        chunk.append(silence(TAIL))
        t += TAIL
        audio.extend(chunk)
        durations.append(t - start)
        print(f"scene {i + 1:02d}: {durations[-1]:5.1f}s")

    wav = build / "narration.wav"
    sf.write(wav, np.concatenate(audio), sr)
    total = sum(durations)
    print(f"total {total:.1f}s")

    vtt = ["WEBVTT", ""]
    for n, (a, b, text) in enumerate(cues, 1):
        vtt += [str(n), f"{stamp(a)} --> {stamp(b - 0.05)}", text, ""]
    (OUT / f"{name}.vtt").write_text("\n".join(vtt))

    # 3. video: slow zoom on each slide, crossfades, narration on top
    inputs, filters = [], []
    for i, (png, d) in enumerate(zip(slides, durations)):
        clip = d + (FADE if i < len(slides) - 1 else 0)
        frames = int(round(clip * FPS))
        inputs += ["-i", str(png)]
        z = f"1+{ZOOM}*on/{frames}" if i % 2 == 0 else f"{1 + ZOOM}-{ZOOM}*on/{frames}"
        filters.append(
            f"[{i}:v]zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={FPS},"
            f"trim=duration={clip:.3f},setpts=PTS-STARTPTS,format=yuv420p[v{i}]"
        )
    prev, offset = "v0", 0.0
    for i in range(1, len(slides)):
        offset += durations[i - 1]
        filters.append(f"[{prev}][v{i}]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[x{i}]")
        prev = f"x{i}"
    filters.append(f"[{prev}]scale=1280:720:flags=lanczos[vout]")

    is_lesson = "--" in name  # lesson videos (mNN-module--lesson-id) get a lighter encode
    mp4 = OUT / f"{name}.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-stats", *inputs, "-i", str(wav),
        "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", f"{len(slides)}:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "27" if is_lesson else "24", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "96k", "-ac", "1", "-shortest", "-movflags", "+faststart", str(mp4),
    ], check=True)

    # poster: first slide, web-sized
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(slides[0]), "-vf", "scale=1280:-1", "-q:v", "4", str(OUT / f"{name}.jpg")], check=True)
    size = mp4.stat().st_size / 1e6
    print(f"wrote {mp4.relative_to(ROOT)} ({size:.1f} MB, {total:.0f}s) + .vtt + .jpg")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "m01-bringup")
