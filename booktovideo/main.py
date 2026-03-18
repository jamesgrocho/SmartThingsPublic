#!/usr/bin/env python3
"""
BookToVideo — entry point.
Launch the main application window.
"""
import sys
from pathlib import Path

# Ensure the booktovideo package root is on the path when run directly
sys.path.insert(0, str(Path(__file__).parent))

from app.ui.main_window import MainWindow


def main():
    app = MainWindow()
    app.mainloop()


if __name__ == "__main__":
    main()
