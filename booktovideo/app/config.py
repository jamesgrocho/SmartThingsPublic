"""
Local configuration manager.
Stores settings in ~/.booktovideo/config.json (mode 600).
"""
import json
import os
import stat
from pathlib import Path

CONFIG_DIR = Path.home() / ".booktovideo"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULTS = {
    "elevenlabs_api_key": "",
    "voice_id": "",
    "voice_name": "",
    "output_folder": str(Path.home() / "BookToVideo"),
    "default_music_file": "",
    "default_volume": 10,  # percent (0–30)
}


def load() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
            # Fill in any missing keys added in future versions
            for k, v in DEFAULTS.items():
                data.setdefault(k, v)
            return data
        except (json.JSONDecodeError, OSError):
            pass
    return dict(DEFAULTS)


def save(data: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)
    # Restrict permissions: owner read/write only
    os.chmod(CONFIG_FILE, stat.S_IRUSR | stat.S_IWUSR)
