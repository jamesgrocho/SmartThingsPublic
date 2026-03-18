"""
Settings dialog — API key, voice selection, output folder, music defaults.
"""
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox
from typing import Callable, Optional

import customtkinter as ctk

from app import config
from app.core import elevenlabs_client


class SettingsDialog(ctk.CTkToplevel):
    def __init__(self, parent, on_save: Optional[Callable] = None):
        super().__init__(parent)
        self.title("Settings")
        self.geometry("560x520")
        self.resizable(False, False)
        self.grab_set()  # Modal

        self._on_save = on_save
        self._cfg = config.load()
        self._voices: list[dict] = []

        self._build_ui()
        self._populate_fields()

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------

    def _build_ui(self):
        pad = {"padx": 20, "pady": 6}

        ctk.CTkLabel(self, text="Settings", font=ctk.CTkFont(size=20, weight="bold")).pack(
            padx=20, pady=(20, 10), anchor="w"
        )

        # ElevenLabs API Key
        ctk.CTkLabel(self, text="ElevenLabs API Key").pack(anchor="w", **pad)
        key_row = ctk.CTkFrame(self, fg_color="transparent")
        key_row.pack(fill="x", padx=20, pady=(0, 6))
        self._api_key_var = tk.StringVar()
        self._api_key_entry = ctk.CTkEntry(
            key_row, textvariable=self._api_key_var, show="•", width=380
        )
        self._api_key_entry.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(
            key_row, text="Fetch Voices", width=110, command=self._fetch_voices
        ).pack(side="left", padx=(8, 0))

        # Voice
        ctk.CTkLabel(self, text="Default Voice").pack(anchor="w", **pad)
        self._voice_var = tk.StringVar(value="Loading…")
        self._voice_menu = ctk.CTkOptionMenu(
            self, variable=self._voice_var, values=["— fetch voices first —"], width=400
        )
        self._voice_menu.pack(anchor="w", **pad)

        # Output folder
        ctk.CTkLabel(self, text="Default Output Folder").pack(anchor="w", **pad)
        folder_row = ctk.CTkFrame(self, fg_color="transparent")
        folder_row.pack(fill="x", padx=20, pady=(0, 6))
        self._folder_var = tk.StringVar()
        ctk.CTkEntry(folder_row, textvariable=self._folder_var, width=380).pack(
            side="left", fill="x", expand=True
        )
        ctk.CTkButton(
            folder_row, text="Browse", width=80, command=self._browse_folder
        ).pack(side="left", padx=(8, 0))

        # Default music file
        ctk.CTkLabel(self, text="Default Music File (optional)").pack(anchor="w", **pad)
        music_row = ctk.CTkFrame(self, fg_color="transparent")
        music_row.pack(fill="x", padx=20, pady=(0, 6))
        self._music_var = tk.StringVar()
        ctk.CTkEntry(music_row, textvariable=self._music_var, width=380).pack(
            side="left", fill="x", expand=True
        )
        ctk.CTkButton(
            music_row, text="Browse", width=80, command=self._browse_music
        ).pack(side="left", padx=(8, 0))

        # Default volume
        ctk.CTkLabel(self, text="Default Music Volume (%)").pack(anchor="w", **pad)
        vol_row = ctk.CTkFrame(self, fg_color="transparent")
        vol_row.pack(fill="x", padx=20, pady=(0, 10))
        self._volume_var = tk.IntVar(value=10)
        self._volume_label = ctk.CTkLabel(vol_row, text="10%", width=40)
        self._volume_label.pack(side="right")
        ctk.CTkSlider(
            vol_row,
            from_=0,
            to=30,
            number_of_steps=30,
            variable=self._volume_var,
            command=lambda v: self._volume_label.configure(text=f"{int(v)}%"),
            width=340,
        ).pack(side="left")

        # Status label
        self._status_label = ctk.CTkLabel(self, text="", text_color="gray")
        self._status_label.pack(pady=(0, 4))

        # Buttons
        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(pady=(0, 20))
        ctk.CTkButton(btn_row, text="Cancel", width=100, fg_color="gray", command=self.destroy).pack(
            side="left", padx=8
        )
        ctk.CTkButton(btn_row, text="Save", width=100, command=self._save).pack(side="left", padx=8)

    # ------------------------------------------------------------------
    # Interactions
    # ------------------------------------------------------------------

    def _populate_fields(self):
        self._api_key_var.set(self._cfg.get("elevenlabs_api_key", ""))
        self._folder_var.set(self._cfg.get("output_folder", str(Path.home() / "BookToVideo")))
        self._music_var.set(self._cfg.get("default_music_file", ""))
        self._volume_var.set(self._cfg.get("default_volume", 10))
        self._volume_label.configure(text=f"{self._cfg.get('default_volume', 10)}%")

        # If we have a saved voice, pre-set the dropdown label
        saved_name = self._cfg.get("voice_name", "")
        if saved_name:
            self._voice_var.set(saved_name)

    def _fetch_voices(self):
        api_key = self._api_key_var.get().strip()
        if not api_key:
            messagebox.showwarning("API Key Required", "Enter your ElevenLabs API key first.")
            return
        self._status_label.configure(text="Fetching voices…")
        self.update_idletasks()
        threading.Thread(target=self._do_fetch_voices, args=(api_key,), daemon=True).start()

    def _do_fetch_voices(self, api_key: str):
        try:
            voices = elevenlabs_client.get_voices(api_key)
            self._voices = voices
            names = [v["name"] for v in voices]
            self.after(0, lambda: self._update_voice_menu(names))
        except Exception as e:
            self.after(0, lambda: self._status_label.configure(text=f"Error: {e}", text_color="red"))

    def _update_voice_menu(self, names: list[str]):
        self._voice_menu.configure(values=names)
        current = self._voice_var.get()
        if current not in names and names:
            self._voice_var.set(names[0])
        self._status_label.configure(text=f"{len(names)} voices loaded.", text_color="green")

    def _browse_folder(self):
        folder = filedialog.askdirectory(title="Select Output Folder")
        if folder:
            self._folder_var.set(folder)

    def _browse_music(self):
        path = filedialog.askopenfilename(
            title="Select Default Music File",
            filetypes=[("Audio Files", "*.mp3 *.wav *.aac *.m4a"), ("All Files", "*.*")],
        )
        if path:
            self._music_var.set(path)

    def _save(self):
        cfg = config.load()
        cfg["elevenlabs_api_key"] = self._api_key_var.get().strip()
        cfg["output_folder"] = self._folder_var.get().strip()
        cfg["default_music_file"] = self._music_var.get().strip()
        cfg["default_volume"] = int(self._volume_var.get())

        # Resolve selected voice
        selected_name = self._voice_var.get()
        cfg["voice_name"] = selected_name
        for v in self._voices:
            if v["name"] == selected_name:
                cfg["voice_id"] = v["voice_id"]
                break

        config.save(cfg)
        if self._on_save:
            self._on_save(cfg)
        self.destroy()
