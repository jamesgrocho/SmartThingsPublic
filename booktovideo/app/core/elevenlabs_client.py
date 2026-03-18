"""
ElevenLabs client.
- Fetch available voices for the account
- Generate TTS audio for a text string
- Save audio to a file path
"""
from pathlib import Path
from typing import Callable, Optional

import requests

BASE_URL = "https://api.elevenlabs.io/v1"


class ElevenLabsError(Exception):
    pass


def get_voices(api_key: str) -> list[dict]:
    """
    Return list of {voice_id, name} dicts for the account.
    Raises ElevenLabsError on API failures.
    """
    resp = requests.get(
        f"{BASE_URL}/voices",
        headers={"xi-api-key": api_key},
        timeout=15,
    )
    if resp.status_code == 401:
        raise ElevenLabsError("Invalid API key")
    resp.raise_for_status()
    voices = resp.json().get("voices", [])
    return [{"voice_id": v["voice_id"], "name": v["name"]} for v in voices]


def generate_audio(
    api_key: str,
    voice_id: str,
    text: str,
    output_path: Path,
    model_id: str = "eleven_multilingual_v2",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
) -> Path:
    """
    Generate TTS audio and save to output_path (.mp3).
    Returns the output_path.
    Raises ElevenLabsError on failure.
    """
    if not text.strip():
        # Create silent placeholder (0.5 seconds of silence via empty MP3 header trick).
        # We'll generate silence via FFmpeg during assembly instead; just write empty file.
        output_path.write_bytes(b"")
        return output_path

    url = f"{BASE_URL}/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
        },
    }
    resp = requests.post(
        url,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json=payload,
        timeout=60,
    )
    if resp.status_code == 401:
        raise ElevenLabsError("Invalid API key")
    if resp.status_code == 422:
        raise ElevenLabsError(f"Validation error: {resp.text}")
    resp.raise_for_status()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(resp.content)
    return output_path


def generate_page_pair_audio(
    api_key: str,
    voice_id: str,
    left_text: str,
    right_text: str,
    audio_dir: Path,
    page_index: int,
    progress_cb: Optional[Callable[[str], None]] = None,
) -> tuple[Path, Path]:
    """
    Generate audio for a left+right page pair.
    Returns (left_path, right_path).
    page_index is 0-based pair index.
    """
    left_path = audio_dir / f"pair_{page_index:04d}_L.mp3"
    right_path = audio_dir / f"pair_{page_index:04d}_R.mp3"

    if not left_path.exists():
        if progress_cb:
            progress_cb(f"Generating audio: pair {page_index + 1} (left page)")
        generate_audio(api_key, voice_id, left_text, left_path)

    if not right_path.exists():
        if progress_cb:
            progress_cb(f"Generating audio: pair {page_index + 1} (right page)")
        generate_audio(api_key, voice_id, right_text, right_path)

    return left_path, right_path
