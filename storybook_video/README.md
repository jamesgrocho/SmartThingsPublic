# Storybook Video Creator

Generates a narrated storybook video — **no API keys or internet connection required**.

## Story: *The Little Robot's Big Adventure*

A 5-scene children's storybook following Rovi, a curious little robot, as it discovers
the world and makes a new friend.

## Features

- **Procedural artwork** — each scene's illustration is generated with Pillow using
  gradients, shapes and layered drawing (night sky, meadow, forest, mountain, sunset).
- **Offline narration** — text-to-speech via `espeak-ng`, embedded as AAC audio.
- **1280 × 720 H.264 MP4** output, ~44 seconds long.
- Easily extensible: add scenes to `SCENES`, implement a new `make_*` style function,
  and rerun the script.

## Requirements

```
pip install moviepy Pillow numpy
sudo apt-get install espeak-ng
```

## Usage

```bash
python3 storybook_video/create_video.py
# output → storybook_video/output/storybook.mp4
```

## Image licensing

All images are 100% procedurally generated using Pillow — no third-party images are
used, so there are no copyright or licensing concerns.
