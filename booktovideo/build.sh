#!/usr/bin/env bash
# Build BookToVideo as a macOS .app bundle using PyInstaller.
# Run from the booktovideo/ directory.

set -e

echo "==> Installing dependencies…"
pip install -r requirements.txt
pip install pyinstaller

echo "==> Building .app bundle…"
pyinstaller \
    --name "BookToVideo" \
    --windowed \
    --onedir \
    --add-data "app:app" \
    main.py

echo ""
echo "==> Build complete."
echo "    App bundle: dist/BookToVideo.app"
echo "    Drag it to /Applications to install."
