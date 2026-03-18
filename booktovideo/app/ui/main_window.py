"""
Main application window.
Left panel: book search + details + per-book settings.
Right panel: queue + progress.
"""
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk

from app import config
from app.core import archive_client, elevenlabs_client, video_assembler
from app.core.project_manager import Project
from app.ui.queue_panel import QueueItem, QueuePanel
from app.ui.settings_dialog import SettingsDialog


class MainWindow(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("BookToVideo")
        self.geometry("1100x700")
        self.minsize(900, 600)

        self._cfg = config.load()
        self._search_results: list[dict] = []
        self._selected_book: dict = {}
        self._ia_files: list[dict] = []

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self._build_ui()

    # ------------------------------------------------------------------
    # UI layout
    # ------------------------------------------------------------------

    def _build_ui(self):
        # Top bar
        topbar = ctk.CTkFrame(self, height=48, corner_radius=0)
        topbar.pack(fill="x", side="top")
        topbar.pack_propagate(False)

        ctk.CTkLabel(
            topbar, text="BookToVideo", font=ctk.CTkFont(size=18, weight="bold")
        ).pack(side="left", padx=16, pady=8)

        ctk.CTkButton(
            topbar, text="⚙ Settings", width=110, command=self._open_settings
        ).pack(side="right", padx=12, pady=8)

        # Main body — two columns
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=0, pady=0)

        # Left panel — search + details
        left = ctk.CTkFrame(body, width=480, corner_radius=0)
        left.pack(side="left", fill="both", expand=True)
        left.pack_propagate(False)
        self._build_left_panel(left)

        # Right panel — queue
        right = ctk.CTkFrame(body, width=500, corner_radius=0, fg_color=("gray90", "gray15"))
        right.pack(side="right", fill="both", expand=True)
        right.pack_propagate(False)
        self._queue_panel = QueuePanel(right, on_process=self._process_queue, fg_color="transparent")
        self._queue_panel.pack(fill="both", expand=True)

    def _build_left_panel(self, parent):
        pad = {"padx": 16, "pady": 4}

        ctk.CTkLabel(parent, text="Search Books", font=ctk.CTkFont(size=15, weight="bold")).pack(
            anchor="w", padx=16, pady=(14, 4)
        )

        # Search bar
        search_row = ctk.CTkFrame(parent, fg_color="transparent")
        search_row.pack(fill="x", padx=16, pady=(0, 6))
        self._search_var = tk.StringVar()
        self._search_entry = ctk.CTkEntry(
            search_row, textvariable=self._search_var, placeholder_text="Search by title or author…"
        )
        self._search_entry.pack(side="left", fill="x", expand=True)
        self._search_entry.bind("<Return>", lambda e: self._do_search())
        ctk.CTkButton(search_row, text="Search", width=80, command=self._do_search).pack(
            side="left", padx=(8, 0)
        )

        # Results list
        ctk.CTkLabel(parent, text="Results", text_color="gray").pack(anchor="w", **pad)
        self._results_list = ctk.CTkScrollableFrame(parent, height=160)
        self._results_list.pack(fill="x", padx=16, pady=(0, 8))
        self._result_buttons: list[ctk.CTkButton] = []
        self._no_results_label = ctk.CTkLabel(
            self._results_list, text="Search for a book above.", text_color="gray"
        )
        self._no_results_label.pack(pady=16)

        # Divider
        ctk.CTkFrame(parent, height=1, fg_color="gray40").pack(fill="x", padx=16, pady=8)

        # Book details
        ctk.CTkLabel(parent, text="Book Details", font=ctk.CTkFont(size=13, weight="bold")).pack(
            anchor="w", **pad
        )
        self._title_label = ctk.CTkLabel(parent, text="Title: —", wraplength=400, anchor="w")
        self._title_label.pack(anchor="w", **pad)
        self._author_label = ctk.CTkLabel(parent, text="Author: —", anchor="w")
        self._author_label.pack(anchor="w", **pad)
        self._pages_label = ctk.CTkLabel(parent, text="Pages: —", anchor="w")
        self._pages_label.pack(anchor="w", **pad)

        # Page range
        range_row = ctk.CTkFrame(parent, fg_color="transparent")
        range_row.pack(fill="x", padx=16, pady=4)
        ctk.CTkLabel(range_row, text="Start page:").pack(side="left")
        self._start_page_var = tk.StringVar(value="1")
        ctk.CTkEntry(range_row, textvariable=self._start_page_var, width=60).pack(side="left", padx=6)
        ctk.CTkLabel(range_row, text="End page:").pack(side="left", padx=(12, 0))
        self._end_page_var = tk.StringVar(value="1")
        ctk.CTkEntry(range_row, textvariable=self._end_page_var, width=60).pack(side="left", padx=6)

        # Music
        ctk.CTkLabel(parent, text="Music File", text_color="gray").pack(anchor="w", **pad)
        music_row = ctk.CTkFrame(parent, fg_color="transparent")
        music_row.pack(fill="x", padx=16, pady=(0, 4))
        self._music_var = tk.StringVar(value=self._cfg.get("default_music_file", ""))
        ctk.CTkEntry(music_row, textvariable=self._music_var).pack(side="left", fill="x", expand=True)
        ctk.CTkButton(music_row, text="Browse", width=70, command=self._browse_music).pack(
            side="left", padx=(8, 0)
        )

        # Volume
        vol_row = ctk.CTkFrame(parent, fg_color="transparent")
        vol_row.pack(fill="x", padx=16, pady=(0, 8))
        ctk.CTkLabel(vol_row, text="Volume:").pack(side="left")
        self._volume_var = tk.IntVar(value=self._cfg.get("default_volume", 10))
        self._vol_label = ctk.CTkLabel(vol_row, text=f"{self._volume_var.get()}%", width=36)
        self._vol_label.pack(side="right")
        ctk.CTkSlider(
            vol_row,
            from_=0,
            to=30,
            number_of_steps=30,
            variable=self._volume_var,
            command=lambda v: self._vol_label.configure(text=f"{int(v)}%"),
        ).pack(side="left", fill="x", expand=True, padx=(8, 0))

        # Add to queue button
        self._add_btn = ctk.CTkButton(
            parent,
            text="+ Add to Queue",
            height=36,
            state="disabled",
            command=self._add_to_queue,
        )
        self._add_btn.pack(padx=16, pady=(4, 16), fill="x")

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def _do_search(self):
        query = self._search_var.get().strip()
        if not query:
            return
        self._clear_results()
        self._no_results_label.configure(text="Searching…")
        threading.Thread(target=self._search_worker, args=(query,), daemon=True).start()

    def _search_worker(self, query: str):
        try:
            results = archive_client.search(query)
            self.after(0, lambda: self._show_results(results))
        except Exception as e:
            self.after(0, lambda: self._no_results_label.configure(text=f"Error: {e}"))

    def _clear_results(self):
        for btn in self._result_buttons:
            btn.destroy()
        self._result_buttons.clear()

    def _show_results(self, results: list[dict]):
        self._search_results = results
        self._clear_results()
        if not results:
            self._no_results_label.configure(text="No results found.")
            return
        self._no_results_label.pack_forget()
        for i, book in enumerate(results):
            label = f"{book['title'][:55]}  —  {book.get('creator', '?')[:30]}"
            btn = ctk.CTkButton(
                self._results_list,
                text=label,
                anchor="w",
                fg_color="transparent",
                hover_color=("gray80", "gray30"),
                command=lambda b=book: self._select_book(b),
            )
            btn.pack(fill="x", pady=1)
            self._result_buttons.append(btn)

    # ------------------------------------------------------------------
    # Book selection
    # ------------------------------------------------------------------

    def _select_book(self, book: dict):
        self._selected_book = book
        self._title_label.configure(text=f"Title: {book['title']}")
        self._author_label.configure(text=f"Author: {book.get('creator', 'Unknown')}")
        self._pages_label.configure(text="Pages: Loading…")
        self._add_btn.configure(state="disabled")
        threading.Thread(target=self._load_book_metadata, args=(book["identifier"],), daemon=True).start()

    def _load_book_metadata(self, identifier: str):
        try:
            files = archive_client.get_files(identifier)
            page_count = archive_client.count_pages(identifier, files)
            self._ia_files = files
            self.after(0, lambda: self._update_book_details(page_count))
        except Exception as e:
            self.after(0, lambda: self._pages_label.configure(text=f"Error: {e}"))

    def _update_book_details(self, page_count: int):
        self._pages_label.configure(text=f"Pages: {page_count}")
        self._start_page_var.set("1")
        self._end_page_var.set(str(page_count))
        self._add_btn.configure(state="normal")

    # ------------------------------------------------------------------
    # Queue
    # ------------------------------------------------------------------

    def _add_to_queue(self):
        if not self._selected_book:
            return
        try:
            start = int(self._start_page_var.get())
            end = int(self._end_page_var.get())
        except ValueError:
            messagebox.showwarning("Invalid", "Page range must be numbers.")
            return

        item = QueueItem(
            identifier=self._selected_book["identifier"],
            title=self._selected_book["title"],
            author=self._selected_book.get("creator", "Unknown"),
            start_page=start,
            end_page=end,
            music_file=self._music_var.get().strip(),
            volume=int(self._volume_var.get()),
        )
        self._queue_panel.add_item(item)

    def _browse_music(self):
        path = filedialog.askopenfilename(
            title="Select Music File",
            filetypes=[("Audio Files", "*.mp3 *.wav *.aac *.m4a"), ("All Files", "*.*")],
        )
        if path:
            self._music_var.set(path)

    # ------------------------------------------------------------------
    # Processing pipeline (runs in background thread)
    # ------------------------------------------------------------------

    def _process_queue(self, items: list[QueueItem]):
        threading.Thread(target=self._process_worker, args=(items,), daemon=True).start()

    def _process_worker(self, items: list[QueueItem]):
        cfg = config.load()
        api_key = cfg.get("elevenlabs_api_key", "")
        voice_id = cfg.get("voice_id", "")
        output_root = cfg.get("output_folder", str(Path.home() / "BookToVideo"))

        if not api_key or not voice_id:
            self.after(0, lambda: messagebox.showerror(
                "Missing Settings",
                "Please open Settings and enter your ElevenLabs API key and select a voice."
            ))
            self.after(0, self._queue_panel.processing_complete)
            return

        total_books = len([i for i in items if i.status == "pending"])
        book_num = 0

        for item in items:
            if item.status != "pending":
                continue
            book_num += 1
            self.after(0, lambda t=item.title, n=book_num, tot=total_books: (
                self._queue_panel.update_progress(
                    f"Book {n}/{tot}: {t[:40]}",
                    "Initialising…",
                    (n - 1) / tot,
                ),
                self._queue_panel.mark_item_status(t, "processing"),
            ))

            try:
                self._process_single_book(item, api_key, voice_id, output_root, book_num, total_books)
                self.after(0, lambda t=item.title: self._queue_panel.mark_item_status(t, "done"))
            except Exception as e:
                self.after(0, lambda t=item.title, err=e: (
                    self._queue_panel.mark_item_status(t, "error"),
                    messagebox.showerror("Processing Error", f"{t}:\n{err}"),
                ))

        self.after(0, self._queue_panel.processing_complete)

    def _process_single_book(
        self,
        item: QueueItem,
        api_key: str,
        voice_id: str,
        output_root: str,
        book_num: int,
        total_books: int,
    ):
        def progress(step: str, frac: float):
            self.after(0, lambda: self._queue_panel.update_progress(
                f"Book {book_num}/{total_books}: {item.title[:40]}",
                step,
                frac,
            ))

        project = Project(output_root, item.title, item.identifier)
        project.create_dirs()

        # --- Step 1: Download IA files list ---
        progress("Fetching file list…", 0.02)
        files = archive_client.get_files(item.identifier)

        # --- Step 2: Download OCR text ---
        progress("Downloading OCR text…", 0.05)
        page_texts = archive_client.download_ocr(item.identifier, files)

        # --- Step 3: Download page images ---
        total_pages = item.end_page - item.start_page + 1
        downloaded = [None] * total_pages

        def dl_progress(done, total):
            progress(f"Downloading pages ({done}/{total})…", 0.05 + 0.20 * (done / total))

        dl_paths = archive_client.download_pages(
            item.identifier, files, project.pages_dir,
            item.start_page, item.end_page, dl_progress
        )
        # Pad if fewer downloaded than expected
        while len(dl_paths) < total_pages:
            dl_paths.append(None)

        # --- Step 4: Pair pages and generate audio + frames + clips ---
        # Pair up pages: (0,1), (2,3), ...
        pairs = []
        for i in range(0, total_pages, 2):
            left_idx = i
            right_idx = i + 1 if i + 1 < total_pages else None
            pairs.append((left_idx, right_idx))

        pair_clips: list[Path] = []

        for pair_num, (l_idx, r_idx) in enumerate(pairs):
            pair_frac_start = 0.25 + 0.65 * (pair_num / len(pairs))
            pair_frac_end = 0.25 + 0.65 * ((pair_num + 1) / len(pairs))

            left_page_num = item.start_page + l_idx
            right_page_num = item.start_page + r_idx if r_idx is not None else None

            # Text for TTS
            def _get_text(idx, page_num):
                if idx is not None and page_texts and idx < len(page_texts):
                    t = page_texts[idx].strip()
                    return t if t else f"Page {page_num}."
                return f"Page {page_num}." if page_num else ""

            left_text = _get_text(l_idx, left_page_num)
            right_text = _get_text(r_idx, right_page_num) if r_idx is not None else ""

            # Audio
            progress(
                f"Generating audio: pair {pair_num + 1}/{len(pairs)}…",
                pair_frac_start + (pair_frac_end - pair_frac_start) * 0.3,
            )
            l_audio = project.audio_pair_L(pair_num)
            r_audio = project.audio_pair_R(pair_num)
            combined_audio = project.audio_pair_combined(pair_num)

            if not l_audio.exists() or l_audio.stat().st_size == 0:
                elevenlabs_client.generate_audio(api_key, voice_id, left_text, l_audio)
            if not r_audio.exists() or r_audio.stat().st_size == 0:
                elevenlabs_client.generate_audio(api_key, voice_id, right_text, r_audio)
            if not combined_audio.exists():
                video_assembler.combine_pair_audio(l_audio, r_audio, combined_audio)

            # Frame
            progress(
                f"Composing frame: pair {pair_num + 1}/{len(pairs)}…",
                pair_frac_start + (pair_frac_end - pair_frac_start) * 0.6,
            )
            left_img = dl_paths[l_idx] if l_idx < len(dl_paths) else None
            right_img = dl_paths[r_idx] if r_idx is not None and r_idx < len(dl_paths) else None
            frame_path = project.frame_path(pair_num)
            if not frame_path.exists():
                video_assembler.compose_frame(left_img, right_img, frame_path)

            # Clip
            progress(
                f"Building clip: pair {pair_num + 1}/{len(pairs)}…",
                pair_frac_start + (pair_frac_end - pair_frac_start) * 0.9,
            )
            clip_path = project.clip_path(pair_num)
            if not clip_path.exists():
                video_assembler.make_clip(frame_path, combined_audio, clip_path)

            pair_clips.append(clip_path)

        # --- Step 5: Title card ---
        progress("Creating title card…", 0.90)
        title_frame_path = project.frames_dir / "frame_title.png"
        title_clip_path = project.title_clip_path()
        if not title_frame_path.exists():
            video_assembler.make_title_frame(item.title, item.author, title_frame_path)
        if not title_clip_path.exists():
            video_assembler.make_title_clip(title_frame_path, title_clip_path)

        all_clips = [title_clip_path] + pair_clips

        # --- Step 6: Concatenate with transitions ---
        progress("Concatenating clips with transitions…", 0.93)
        concat_path = project.root / "_concat.mp4"
        video_assembler.concat_clips(all_clips, concat_path)

        # --- Step 7: Mix music ---
        if item.music_file and Path(item.music_file).exists():
            progress("Mixing background music…", 0.97)
            video_assembler.mix_music(
                concat_path,
                Path(item.music_file),
                project.final_video,
                volume=item.volume / 100.0,
            )
        else:
            import shutil
            shutil.move(str(concat_path), str(project.final_video))

        progress("Done!", 1.0)

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------

    def _open_settings(self):
        def on_save(new_cfg):
            self._cfg = new_cfg
            self._music_var.set(new_cfg.get("default_music_file", ""))
            self._volume_var.set(new_cfg.get("default_volume", 10))

        SettingsDialog(self, on_save=on_save)
