"""
Video assembly pipeline using FFmpeg.

Steps per book:
1. compose_frame()       — Pillow: two-page spread → 4K PNG
2. generate_silence()    — FFmpeg: create silent audio for blank pages
3. combine_pair_audio()  — FFmpeg: concat L + R MP3 → single pair MP3
4. make_clip()           — FFmpeg: still frame + audio → video clip
5. make_title_clip()     — Pillow + FFmpeg: title card clip
6. concat_clips()        — FFmpeg xfade: chain clips with wipeleft transition
7. mix_music()           — FFmpeg: mix background music into final video
"""
import subprocess
from pathlib import Path
from typing import Callable, Optional

from PIL import Image, ImageDraw, ImageFont

# Output resolution
VIDEO_W = 3840
VIDEO_H = 2160

# Page turn transition
TRANSITION = "wipeleft"
TRANSITION_DURATION = 0.5  # seconds

# Title card
TITLE_DURATION = 4  # seconds


# ---------------------------------------------------------------------------
# Frame composition
# ---------------------------------------------------------------------------

def compose_frame(
    left_image_path: Optional[Path],
    right_image_path: Optional[Path],
    output_path: Path,
) -> Path:
    """
    Compose a 4K (3840x2160) two-page spread frame.
    Each page fills its half exactly; black bars added if aspect ratio differs.
    """
    frame = Image.new("RGB", (VIDEO_W, VIDEO_H), color=(0, 0, 0))
    half_w = VIDEO_W // 2

    for img_path, x_offset in [(left_image_path, 0), (right_image_path, half_w)]:
        if img_path and img_path.exists() and img_path.stat().st_size > 0:
            try:
                img = Image.open(img_path).convert("RGB")
                img = _fit_to_box(img, half_w, VIDEO_H)
                # Center within its half
                paste_x = x_offset + (half_w - img.width) // 2
                paste_y = (VIDEO_H - img.height) // 2
                frame.paste(img, (paste_x, paste_y))
            except Exception:
                pass  # Leave black if image can't be opened

    # Thin white divider line between pages
    draw = ImageDraw.Draw(frame)
    draw.line([(half_w, 0), (half_w, VIDEO_H)], fill=(200, 200, 200), width=2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.save(str(output_path), format="PNG")
    return output_path


def _fit_to_box(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Scale image to fit within box, maintaining aspect ratio."""
    ratio = min(max_w / img.width, max_h / img.height)
    new_w = int(img.width * ratio)
    new_h = int(img.height * ratio)
    return img.resize((new_w, new_h), Image.LANCZOS)


def make_title_frame(title: str, author: str, output_path: Path) -> Path:
    """Create a 4K title card PNG (black bg, white text)."""
    frame = Image.new("RGB", (VIDEO_W, VIDEO_H), color=(10, 10, 10))
    draw = ImageDraw.Draw(frame)

    # Try to load a system font; fall back to default
    title_font = _load_font(120)
    author_font = _load_font(72)

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_w = title_bbox[2] - title_bbox[0]
    title_h = title_bbox[3] - title_bbox[1]

    author_bbox = draw.textbbox((0, 0), author, font=author_font)
    author_w = author_bbox[2] - author_bbox[0]

    center_y = VIDEO_H // 2
    draw.text(
        ((VIDEO_W - title_w) // 2, center_y - title_h - 40),
        title,
        fill=(255, 255, 255),
        font=title_font,
    )
    draw.text(
        ((VIDEO_W - author_w) // 2, center_y + 40),
        author,
        fill=(180, 180, 180),
        font=author_font,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.save(str(output_path), format="PNG")
    return output_path


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    font_candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in font_candidates:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Audio helpers
# ---------------------------------------------------------------------------

def _run(cmd: list, check: bool = True):
    """Run a subprocess command."""
    subprocess.run(cmd, check=check, capture_output=True)


def generate_silence(duration: float, output_path: Path) -> Path:
    """Generate a silent MP3 of given duration."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono",
        "-t", str(duration),
        "-q:a", "9", "-acodec", "libmp3lame",
        str(output_path),
    ])
    return output_path


def combine_pair_audio(
    left_path: Path,
    right_path: Path,
    output_path: Path,
    silence_between: float = 0.3,
) -> Path:
    """
    Concatenate left + (short silence) + right audio into a single MP3.
    If either side is empty (blank page), generates silence for it.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Ensure both sides have audio (generate silence if file is empty)
    for p in [left_path, right_path]:
        if not p.exists() or p.stat().st_size == 0:
            generate_silence(1.0, p)

    # Generate a short silence clip between pages
    gap_path = output_path.parent / "_gap.mp3"
    generate_silence(silence_between, gap_path)

    # Build concat filter
    inputs = [left_path, gap_path, right_path]
    cmd = ["ffmpeg", "-y"]
    for p in inputs:
        cmd += ["-i", str(p)]
    cmd += [
        "-filter_complex", f"concat=n={len(inputs)}:v=0:a=1[a]",
        "-map", "[a]",
        str(output_path),
    ]
    _run(cmd)
    return output_path


def get_audio_duration(audio_path: Path) -> float:
    """Return duration of audio file in seconds."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 3.0


# ---------------------------------------------------------------------------
# Clip creation
# ---------------------------------------------------------------------------

def make_clip(
    frame_path: Path,
    audio_path: Path,
    output_path: Path,
) -> Path:
    """Create a video clip from a still frame + audio."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(frame_path),
        "-i", str(audio_path),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ])
    return output_path


def make_title_clip(
    title_frame_path: Path,
    output_path: Path,
    duration: float = TITLE_DURATION,
) -> Path:
    """Create a video clip from the title card PNG (silent, fixed duration)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(title_frame_path),
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ])
    return output_path


# ---------------------------------------------------------------------------
# Concatenation with transitions
# ---------------------------------------------------------------------------

def concat_clips(clip_paths: list[Path], output_path: Path) -> Path:
    """
    Concatenate clips with wipeleft (right-to-left page turn) transition
    between each pair using the FFmpeg xfade filter.
    """
    if not clip_paths:
        raise ValueError("No clips to concatenate")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    if len(clip_paths) == 1:
        # Nothing to concat — just copy
        _run(["ffmpeg", "-y", "-i", str(clip_paths[0]), "-c", "copy", str(output_path)])
        return output_path

    # Build a complex xfade chain
    # We need durations for each clip to compute offset
    durations = [get_audio_duration(p) for p in clip_paths]

    cmd = ["ffmpeg", "-y"]
    for p in clip_paths:
        cmd += ["-i", str(p)]

    # Build xfade filter chain
    n = len(clip_paths)
    filter_parts = []
    video_labels = [f"[{i}:v]" for i in range(n)]
    audio_labels = [f"[{i}:a]" for i in range(n)]

    # Chain video xfades
    offset = durations[0] - TRANSITION_DURATION
    prev_v = video_labels[0]
    for i in range(1, n):
        out_v = f"[xv{i}]" if i < n - 1 else "[vout]"
        filter_parts.append(
            f"{prev_v}{video_labels[i]}xfade=transition={TRANSITION}:"
            f"duration={TRANSITION_DURATION}:offset={offset:.3f}{out_v}"
        )
        prev_v = out_v if i < n - 1 else "[vout]"
        offset += durations[i] - TRANSITION_DURATION

    # Chain audio concat (no xfade for audio — just concat)
    audio_concat = "".join(audio_labels)
    filter_parts.append(f"{audio_concat}concat=n={n}:v=0:a=1[aout]")

    filter_complex = "; ".join(filter_parts)
    cmd += [
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    _run(cmd)
    return output_path


# ---------------------------------------------------------------------------
# Music mixing
# ---------------------------------------------------------------------------

def mix_music(
    video_path: Path,
    music_path: Path,
    output_path: Path,
    volume: float = 0.10,
) -> Path:
    """
    Mix background music into the video.
    Music is looped to match video duration, then mixed at given volume level.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    vol_str = f"{volume:.2f}"
    _run([
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-stream_loop", "-1", "-i", str(music_path),
        "-filter_complex",
        f"[1:a]volume={vol_str}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(output_path),
    ])
    return output_path
