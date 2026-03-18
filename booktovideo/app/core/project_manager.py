"""
Project folder and file path manager.
Each book gets a dedicated project folder under the user's output root.
"""
import re
from pathlib import Path


def _safe_name(name: str) -> str:
    """Strip characters unsafe for folder names."""
    name = re.sub(r'[\\/:*?"<>|]', "_", name)
    name = name.strip(". ")
    return name[:80]  # cap length


class Project:
    def __init__(self, output_root: str, title: str, identifier: str):
        safe_title = _safe_name(title)
        self.root = Path(output_root) / safe_title
        self.identifier = identifier
        self.title = title

        self.pages_dir = self.root / "pages"
        self.audio_dir = self.root / "audio"
        self.frames_dir = self.root / "frames"
        self.clips_dir = self.root / "clips"
        self.final_video = self.root / f"{safe_title}.mp4"

    def create_dirs(self):
        for d in [self.pages_dir, self.audio_dir, self.frames_dir, self.clips_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def page_path(self, page_num: int, ext: str = "jpg") -> Path:
        return self.pages_dir / f"page_{page_num:04d}.{ext}"

    def audio_pair_L(self, pair_index: int) -> Path:
        return self.audio_dir / f"pair_{pair_index:04d}_L.mp3"

    def audio_pair_R(self, pair_index: int) -> Path:
        return self.audio_dir / f"pair_{pair_index:04d}_R.mp3"

    def audio_pair_combined(self, pair_index: int) -> Path:
        return self.audio_dir / f"pair_{pair_index:04d}.mp3"

    def frame_path(self, pair_index: int) -> Path:
        return self.frames_dir / f"frame_{pair_index:04d}.png"

    def clip_path(self, pair_index: int) -> Path:
        return self.clips_dir / f"clip_{pair_index:04d}.mp4"

    def title_clip_path(self) -> Path:
        return self.clips_dir / "clip_title.mp4"

    def concat_list_path(self) -> Path:
        return self.root / "concat_list.txt"
