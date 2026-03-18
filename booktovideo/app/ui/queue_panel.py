"""
Queue panel — shows books in the processing queue, plus the progress display.
Communicates with main_window via callbacks.
"""
import tkinter as tk
from typing import Callable, Optional

import customtkinter as ctk


class QueueItem:
    def __init__(
        self,
        identifier: str,
        title: str,
        author: str,
        start_page: int,
        end_page: int,
        music_file: str,
        volume: int,
    ):
        self.identifier = identifier
        self.title = title
        self.author = author
        self.start_page = start_page
        self.end_page = end_page
        self.music_file = music_file
        self.volume = volume
        self.status = "pending"  # pending | processing | done | error


class QueuePanel(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_process: Callable,
        **kwargs,
    ):
        super().__init__(parent, **kwargs)
        self._on_process = on_process
        self._items: list[QueueItem] = []
        self._row_frames: list[ctk.CTkFrame] = []
        self._build_ui()

    # ------------------------------------------------------------------
    # UI
    # ------------------------------------------------------------------

    def _build_ui(self):
        ctk.CTkLabel(self, text="Queue", font=ctk.CTkFont(size=15, weight="bold")).pack(
            padx=12, pady=(12, 6), anchor="w"
        )

        # Scrollable queue list
        self._list_frame = ctk.CTkScrollableFrame(self, height=280)
        self._list_frame.pack(fill="both", expand=True, padx=12, pady=(0, 8))

        self._empty_label = ctk.CTkLabel(
            self._list_frame, text="Queue is empty. Add books from the search panel.",
            text_color="gray", wraplength=300
        )
        self._empty_label.pack(pady=20)

        # Reorder buttons
        reorder_row = ctk.CTkFrame(self, fg_color="transparent")
        reorder_row.pack(padx=12, pady=(0, 8), anchor="w")
        ctk.CTkButton(reorder_row, text="▲ Up", width=70, command=self._move_up).pack(side="left", padx=2)
        ctk.CTkButton(reorder_row, text="▼ Down", width=70, command=self._move_down).pack(side="left", padx=2)

        # Separator
        ctk.CTkFrame(self, height=1, fg_color="gray40").pack(fill="x", padx=12, pady=4)

        # Progress section
        ctk.CTkLabel(self, text="Progress", font=ctk.CTkFont(size=13, weight="bold")).pack(
            padx=12, pady=(6, 2), anchor="w"
        )
        self._book_label = ctk.CTkLabel(self, text="—", text_color="gray")
        self._book_label.pack(padx=12, anchor="w")

        self._step_label = ctk.CTkLabel(self, text="", text_color="gray")
        self._step_label.pack(padx=12, anchor="w")

        self._progress_bar = ctk.CTkProgressBar(self, width=300)
        self._progress_bar.pack(padx=12, pady=(4, 8), anchor="w")
        self._progress_bar.set(0)

        # Process button
        self._process_btn = ctk.CTkButton(
            self, text="Process Queue", command=self._start_processing, height=36
        )
        self._process_btn.pack(padx=12, pady=(4, 16), fill="x")

    # ------------------------------------------------------------------
    # Queue management
    # ------------------------------------------------------------------

    def add_item(self, item: QueueItem):
        self._items.append(item)
        self._refresh_list()

    def _refresh_list(self):
        # Clear existing rows
        for frame in self._row_frames:
            frame.destroy()
        self._row_frames.clear()

        if not self._items:
            self._empty_label.pack(pady=20)
            return

        self._empty_label.pack_forget()

        for idx, item in enumerate(self._items):
            row = self._make_row(idx, item)
            row.pack(fill="x", pady=2)
            self._row_frames.append(row)

    def _make_row(self, idx: int, item: QueueItem) -> ctk.CTkFrame:
        row = ctk.CTkFrame(self._list_frame, corner_radius=6)

        status_colors = {
            "pending": "gray60",
            "processing": "#1f6aa5",
            "done": "#2a9d2a",
            "error": "#cc3333",
        }
        status_symbols = {"pending": "○", "processing": "◉", "done": "✓", "error": "✗"}
        color = status_colors.get(item.status, "gray60")
        sym = status_symbols.get(item.status, "○")

        ctk.CTkLabel(row, text=sym, text_color=color, width=20).pack(side="left", padx=(8, 4))
        ctk.CTkLabel(
            row,
            text=f"{idx + 1}. {item.title[:40]}",
            anchor="w",
        ).pack(side="left", fill="x", expand=True, padx=4)
        ctk.CTkLabel(
            row,
            text=f"pp. {item.start_page}–{item.end_page}",
            text_color="gray",
            width=80,
        ).pack(side="left")
        ctk.CTkButton(
            row, text="✕", width=28, height=24, fg_color="transparent",
            command=lambda i=idx: self._remove(i)
        ).pack(side="right", padx=4)

        return row

    def _selected_index(self) -> Optional[int]:
        """Return the index of the first 'pending' item, or None."""
        # Simple implementation: operate on first item
        return 0 if self._items else None

    def _remove(self, idx: int):
        if 0 <= idx < len(self._items):
            if self._items[idx].status == "processing":
                return  # Don't remove in-progress items
            self._items.pop(idx)
            self._refresh_list()

    def _move_up(self):
        idx = self._selected_index()
        if idx is not None and idx > 0:
            self._items[idx], self._items[idx - 1] = self._items[idx - 1], self._items[idx]
            self._refresh_list()

    def _move_down(self):
        idx = self._selected_index()
        if idx is not None and idx < len(self._items) - 1:
            self._items[idx], self._items[idx + 1] = self._items[idx + 1], self._items[idx]
            self._refresh_list()

    def _start_processing(self):
        pending = [i for i in self._items if i.status == "pending"]
        if not pending:
            return
        self._process_btn.configure(state="disabled", text="Processing…")
        self._on_process(self._items)

    # ------------------------------------------------------------------
    # Progress updates (called from worker thread via .after())
    # ------------------------------------------------------------------

    def update_progress(self, book_label: str, step_label: str, fraction: float):
        self._book_label.configure(text=book_label)
        self._step_label.configure(text=step_label)
        self._progress_bar.set(fraction)

    def mark_item_status(self, title: str, status: str):
        for item in self._items:
            if item.title == title:
                item.status = status
        self._refresh_list()

    def processing_complete(self):
        self._process_btn.configure(state="normal", text="Process Queue")
        self._book_label.configure(text="All done!")
        self._step_label.configure(text="")
        self._progress_bar.set(1.0)
