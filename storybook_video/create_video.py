#!/usr/bin/env python3
"""
Storybook Video Creator
========================
Generates a narrated storybook video using:
  - Procedurally generated royalty-free artwork (Pillow)
  - Offline text-to-speech narration (espeak-ng)
  - Video assembly (MoviePy)

No external API keys or internet connection required.
"""

import os
import math
import subprocess
import tempfile
import textwrap
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import (
    ImageClip,
    AudioFileClip,
    concatenate_videoclips,
)

# ── Story definition ───────────────────────────────────────────────────────────

STORY_TITLE = "The Little Robot's Big Adventure"

SCENES = [
    {
        "title": "A Curious Awakening",
        "narration": (
            "In a quiet workshop filled with gears and glowing screens, "
            "a small robot named Rovi blinked open its bright blue eyes for the very first time."
        ),
        "palette": [(20, 18, 50), (60, 40, 120), (100, 80, 180), (180, 160, 255)],
        "style": "night_sky",
        "duration": 7,
    },
    {
        "title": "Stepping Outside",
        "narration": (
            "Rovi pushed open the wooden door and stepped into a world of golden sunlight, "
            "tall green trees, and singing birds. Everything was new and wonderful."
        ),
        "palette": [(255, 220, 100), (100, 200, 80), (50, 150, 50), (200, 240, 160)],
        "style": "meadow",
        "duration": 7,
    },
    {
        "title": "A New Friend",
        "narration": (
            "By the old stone bridge, Rovi met a fluffy orange cat named Marmalade. "
            "The cat tilted its head and purred, as if to say: welcome to the world!"
        ),
        "palette": [(255, 160, 60), (200, 100, 30), (80, 60, 40), (240, 200, 140)],
        "style": "forest",
        "duration": 7,
    },
    {
        "title": "The Mountain Challenge",
        "narration": (
            "Together they climbed the great mountain that stretched above the clouds. "
            "Rovi's motors whirred with determination. The view from the top was breathtaking."
        ),
        "palette": [(80, 120, 180), (200, 220, 255), (240, 240, 255), (140, 100, 80)],
        "style": "mountain",
        "duration": 7,
    },
    {
        "title": "Home at Sunset",
        "narration": (
            "As the sky turned pink and orange, Rovi and Marmalade returned home. "
            "The little robot had learned the greatest lesson of all: "
            "adventure is better when shared with a friend."
        ),
        "palette": [(255, 120, 60), (255, 80, 40), (180, 60, 100), (255, 200, 100)],
        "style": "sunset",
        "duration": 9,
    },
]

# ── Config ─────────────────────────────────────────────────────────────────────

W, H = 1280, 720
OVERLAY_H = 175
ART_H = H - OVERLAY_H
FPS = 24

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_VIDEO = OUTPUT_DIR / "storybook.mp4"

ESPEAK = "espeak-ng"


# ── Font loader ────────────────────────────────────────────────────────────────

def _find_font(bold: bool = False, size: int = 20) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    if not bold:
        candidates = [c for c in candidates if "Bold" not in c] + candidates
    for fp in candidates:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


# ── Procedural artwork generators ─────────────────────────────────────────────

def _lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def _gradient_bg(w, h, top_color, bottom_color) -> Image.Image:
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        draw.line([(0, y), (w, y)], fill=_lerp_color(top_color, bottom_color, t))
    return img


def draw_stars(draw, w, h, count=120, rng=None):
    import random
    rng = rng or random.Random(42)
    for _ in range(count):
        x, y = rng.randint(0, w), rng.randint(0, h * 2 // 3)
        r = rng.randint(1, 3)
        brightness = rng.randint(180, 255)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(brightness, brightness, brightness))


def draw_hills(draw, w, h, color, y_base, amplitude, freq, offset=0):
    pts = [(0, h)]
    for x in range(w + 1):
        y = int(y_base + math.sin((x + offset) * freq) * amplitude)
        pts.append((x, y))
    pts.append((w, h))
    draw.polygon(pts, fill=color)


def draw_tree(draw, x, y, height, trunk_color, leaf_color):
    tw = max(8, height // 8)
    th = height // 3
    draw.rectangle([x - tw // 2, y - th, x + tw // 2, y], fill=trunk_color)
    for layer in range(3):
        lh = height - layer * (height // 5)
        lw = lh // 2 + layer * 10
        ly = y - th - layer * (height // 6)
        draw.polygon(
            [(x, ly - lh), (x - lw, ly), (x + lw, ly)],
            fill=(_lerp_color(leaf_color, (20, 80, 20), layer * 0.3)),
        )


def draw_mountain(draw, w, h, peak_x, peak_y, base_y, color, snow_color=None):
    pts = [(0, base_y), (peak_x, peak_y), (w, base_y)]
    draw.polygon(pts, fill=color)
    if snow_color:
        snow_h = (base_y - peak_y) // 5
        draw.polygon(
            [(peak_x, peak_y),
             (peak_x - snow_h * 2, peak_y + snow_h * 2),
             (peak_x + snow_h * 2, peak_y + snow_h * 2)],
            fill=snow_color,
        )


def make_night_sky(w, h, palette) -> Image.Image:
    import random
    rng = random.Random(1)
    img = _gradient_bg(w, h, palette[0], palette[1])
    draw = ImageDraw.Draw(img)
    draw_stars(draw, w, h, count=150, rng=rng)
    # Glowing orb (moon)
    mx, my = int(w * 0.75), int(h * 0.18)
    for radius in range(60, 5, -4):
        alpha = int(40 * (1 - radius / 60))
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse([mx - radius, my - radius, mx + radius, my + radius],
                      fill=(220, 220, 255, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
        draw = ImageDraw.Draw(img)
    draw.ellipse([mx - 28, my - 28, mx + 28, my + 28], fill=(240, 240, 200))
    # Silhouette buildings
    for bx, bw, bh in [(80, 60, 120), (160, 80, 90), (260, 50, 160),
                        (350, 70, 100), (900, 90, 130), (1020, 60, 80),
                        (1120, 75, 110), (1200, 55, 95)]:
        draw.rectangle([bx, h - bh, bx + bw, h], fill=palette[0])
    # Gear shapes (workshop hint)
    for gx, gy, gr in [(200, h - 50, 25), (600, h // 2 + 20, 18)]:
        draw.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=palette[2])
        draw.ellipse([gx - gr + 6, gy - gr + 6, gx + gr - 6, gy + gr - 6], fill=palette[0])
    return img


def make_meadow(w, h, palette) -> Image.Image:
    img = _gradient_bg(w, h, (135, 200, 255), palette[0])
    draw = ImageDraw.Draw(img)
    # Sun
    sx, sy = int(w * 0.15), int(h * 0.15)
    for r in range(80, 30, -5):
        alpha = int(60 * (1 - r / 80))
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 255, 100, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
        draw = ImageDraw.Draw(img)
    draw.ellipse([sx - 35, sy - 35, sx + 35, sy + 35], fill=(255, 240, 50))
    # Rolling hills
    draw_hills(draw, w, h, palette[2], int(h * 0.68), 40, 0.008, offset=0)
    draw_hills(draw, w, h, palette[1], int(h * 0.72), 30, 0.012, offset=200)
    draw_hills(draw, w, h, (60, 160, 60), int(h * 0.78), 20, 0.02, offset=100)
    # Trees
    for tx, th in [(150, 140), (300, 180), (800, 160), (950, 130),
                   (1050, 170), (1150, 120)]:
        draw_tree(draw, tx, int(h * 0.76), th, (80, 50, 20), (40, 140, 40))
    # Flowers
    import random
    rng = random.Random(7)
    for _ in range(60):
        fx = rng.randint(0, w)
        fy = rng.randint(int(h * 0.70), h - 5)
        fc = [(255, 80, 80), (255, 200, 50), (200, 80, 255), (255, 120, 200)][rng.randint(0, 3)]
        draw.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=fc)
    return img


def make_forest(w, h, palette) -> Image.Image:
    img = _gradient_bg(w, h, (180, 220, 255), (255, 200, 140))
    draw = ImageDraw.Draw(img)
    # Background trees
    for tx in range(0, w + 1, 60):
        draw_tree(draw, tx, int(h * 0.72), 160, (60, 40, 20), (30, 110, 30))
    # Stone bridge
    bx, by, bw, bh = int(w * 0.3), int(h * 0.6), int(w * 0.4), 50
    draw.rectangle([bx, by, bx + bw, by + bh], fill=(130, 120, 110))
    # Arch
    draw.ellipse([bx + bw // 4, by - 30, bx + 3 * bw // 4, by + 30],
                 fill=(100, 90, 80))
    draw.ellipse([bx + bw // 4 + 8, by - 22, bx + 3 * bw // 4 - 8, by + 38],
                 fill=_lerp_color((180, 220, 255), (255, 200, 140), 0.65))
    # Water
    draw.rectangle([0, int(h * 0.75), w, int(h * 0.82)], fill=(80, 140, 200))
    draw.rectangle([0, int(h * 0.82), w, h], fill=(50, 100, 60))
    # Orange cat silhouette
    cx, cy = int(w * 0.55), int(h * 0.58)
    draw.ellipse([cx - 18, cy - 12, cx + 18, cy + 12], fill=palette[0])
    draw.ellipse([cx - 10, cy - 24, cx + 10, cy - 8], fill=palette[0])
    draw.polygon([(cx - 10, cy - 24), (cx - 16, cy - 36), (cx - 4, cy - 22)],
                 fill=palette[0])
    draw.polygon([(cx + 4, cy - 22), (cx + 16, cy - 36), (cx + 10, cy - 24)],
                 fill=palette[0])
    return img


def make_mountain(w, h, palette) -> Image.Image:
    img = _gradient_bg(w, h, palette[1], palette[0])
    draw = ImageDraw.Draw(img)
    # Clouds
    for cx, cy in [(200, 80), (500, 60), (900, 100), (1100, 75)]:
        for dx, dy, cr in [(0, 0, 40), (-35, 10, 30), (35, 10, 30), (-15, 20, 25), (15, 20, 25)]:
            draw.ellipse([cx + dx - cr, cy + dy - cr, cx + dx + cr, cy + dy + cr],
                         fill=(240, 245, 255))
    # Mountains
    draw_mountain(draw, w, h, int(w * 0.2), int(h * 0.15), int(h * 0.85),
                  palette[3], snow_color=(230, 235, 255))
    draw_mountain(draw, w, h, int(w * 0.6), int(h * 0.05), int(h * 0.9),
                  (110, 90, 70), snow_color=(240, 245, 255))
    draw_mountain(draw, w, h, int(w * 0.85), int(h * 0.2), int(h * 0.88),
                  (90, 80, 65), snow_color=(230, 235, 255))
    # Ground
    draw.rectangle([0, int(h * 0.85), w, h], fill=(140, 120, 90))
    return img


def make_sunset(w, h, palette) -> Image.Image:
    img = _gradient_bg(w, h, palette[2], palette[0])
    draw = ImageDraw.Draw(img)
    # Horizon glow
    for y in range(int(h * 0.55), int(h * 0.72)):
        t = (y - h * 0.55) / (h * 0.17)
        c = _lerp_color(palette[3], palette[1], t)
        draw.line([(0, y), (w, y)], fill=c)
    # Sun
    sx, sy = w // 2, int(h * 0.6)
    for r in range(100, 20, -8):
        alpha = int(50 * (1 - r / 100))
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 150, 30, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
        draw = ImageDraw.Draw(img)
    draw.ellipse([sx - 40, sy - 40, sx + 40, sy + 40], fill=(255, 200, 50))
    # Reflection on water
    draw.rectangle([0, int(h * 0.72), w, h], fill=(180, 80, 40))
    for i in range(5):
        ry = int(h * 0.74) + i * 12
        draw.rectangle([sx - 30 + i * 5, ry, sx + 30 - i * 5, ry + 4],
                        fill=(255, 200, 80))
    # Silhouette hills
    draw_hills(draw, w, h, (40, 25, 15), int(h * 0.68), 30, 0.007, offset=50)
    # Home silhouette
    hx, hy = int(w * 0.72), int(h * 0.55)
    draw.rectangle([hx, hy, hx + 80, hy + 60], fill=(20, 15, 10))
    draw.polygon([(hx - 10, hy), (hx + 40, hy - 40), (hx + 90, hy)], fill=(15, 10, 5))
    draw.rectangle([hx + 30, hy + 30, hx + 50, hy + 60], fill=(80, 50, 10))
    return img


STYLE_FUNCS = {
    "night_sky": make_night_sky,
    "meadow":    make_meadow,
    "forest":    make_forest,
    "mountain":  make_mountain,
    "sunset":    make_sunset,
}


# ── Narration overlay ──────────────────────────────────────────────────────────

def add_narration_bar(base_img: Image.Image, title: str, narration: str) -> Image.Image:
    w, h = base_img.size
    result = base_img.convert("RGBA")

    bar = Image.new("RGBA", (w, OVERLAY_H), (0, 0, 0, 200))
    result.paste(bar, (0, h - OVERLAY_H), bar)
    draw = ImageDraw.Draw(result)

    font_title = _find_font(bold=True, size=26)
    font_body  = _find_font(bold=False, size=18)

    y0 = h - OVERLAY_H + 14
    draw.text((24, y0), title, fill=(255, 215, 0), font=font_title)
    wrapped = textwrap.fill(narration, width=100)
    draw.text((24, y0 + 36), wrapped, fill=(240, 240, 240), font=font_body)

    return result.convert("RGB")


# ── TTS via espeak-ng ──────────────────────────────────────────────────────────

def espeak_narration(text: str, wav_path: str) -> bool:
    """Generate WAV narration using espeak-ng (offline)."""
    try:
        subprocess.run(
            [ESPEAK, "-s", "140", "-p", "50", "-w", wav_path, text],
            check=True, capture_output=True,
        )
        return os.path.exists(wav_path)
    except Exception as e:
        print(f"  espeak-ng error: {e}")
        return False


# ── Title / End cards ──────────────────────────────────────────────────────────

def make_title_card(title: str, subtitle: str, bg: tuple, duration: float) -> ImageClip:
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    # Decorative lines
    for i in range(0, W, 80):
        draw.line([(i, 0), (i + 40, H)], fill=_lerp_color(bg, (255, 255, 255), 0.06), width=1)

    font_big  = _find_font(bold=True, size=64)
    font_small = _find_font(bold=False, size=30)

    def centered_text(text, y, font, fill):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, y), text, fill=fill, font=font)

    centered_text(title,    H // 2 - 70, font_big,   (255, 215,   0))
    centered_text(subtitle, H // 2 + 30, font_small, (200, 200, 255))

    return ImageClip(np.array(img), duration=duration)


# ── Main builder ───────────────────────────────────────────────────────────────

def build_video():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    tmpdir = tempfile.mkdtemp(prefix="storybook_")
    clips = []

    # Opening title
    print("Creating title card …")
    clips.append(make_title_card(
        STORY_TITLE,
        "A royalty-free illustrated storybook",
        (15, 12, 40),
        duration=4.0,
    ))

    for i, scene in enumerate(SCENES):
        print(f"\n[Scene {i + 1}/{len(SCENES)}] {scene['title']}")

        # Artwork
        style_fn = STYLE_FUNCS[scene["style"]]
        art = style_fn(W, ART_H, scene["palette"])
        full_frame = Image.new("RGB", (W, H), (0, 0, 0))
        full_frame.paste(art, (0, 0))
        frame_with_bar = add_narration_bar(full_frame, scene["title"], scene["narration"])
        print(f"  Artwork generated ({scene['style']} style)")

        img_arr = np.array(frame_with_bar)
        scene_clip = ImageClip(img_arr, duration=scene["duration"])

        # Narration
        wav_path = os.path.join(tmpdir, f"narration_{i}.wav")
        if espeak_narration(scene["narration"], wav_path):
            print(f"  Narration audio generated")
            audio = AudioFileClip(wav_path)
            if audio.duration > scene["duration"]:
                audio = audio.subclipped(0, scene["duration"])
            scene_clip = scene_clip.with_audio(audio)
        else:
            print(f"  No audio for this scene")

        clips.append(scene_clip)

    # Closing card
    print("\nCreating closing card …")
    clips.append(make_title_card("The End", "Thank you for watching!", (15, 12, 40), 3.0))

    print(f"\nAssembling {len(clips)} clips …")
    final = concatenate_videoclips(clips, method="compose")

    print(f"Writing → {OUTPUT_VIDEO}")
    final.write_videofile(
        str(OUTPUT_VIDEO),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        logger="bar",
    )
    print(f"\nDone! Video: {OUTPUT_VIDEO}  ({OUTPUT_VIDEO.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build_video()
