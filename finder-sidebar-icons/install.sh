#!/bin/bash
set -euo pipefail

BINARY_NAME="FinderSidebarSync"
INSTALL_DIR="/usr/local/bin"
PLIST_NAME="com.user.findersidebaricons.plist"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"

echo "==> Building $BINARY_NAME (release)..."
swift build -c release

BINARY_PATH="$(swift build -c release --show-bin-path)/$BINARY_NAME"

echo "==> Installing binary to $INSTALL_DIR/$BINARY_NAME..."
sudo cp "$BINARY_PATH" "$INSTALL_DIR/$BINARY_NAME"
sudo chmod +x "$INSTALL_DIR/$BINARY_NAME"

echo "==> Installing LaunchAgent..."
mkdir -p "$LAUNCH_AGENT_DIR"
cp "LaunchAgent/$PLIST_NAME" "$LAUNCH_AGENT_DIR/$PLIST_NAME"

echo "==> Loading LaunchAgent (will start at every login automatically)..."
launchctl unload "$LAUNCH_AGENT_DIR/$PLIST_NAME" 2>/dev/null || true
launchctl load  "$LAUNCH_AGENT_DIR/$PLIST_NAME"

echo ""
echo "Done! FinderSidebarSync is running in the background."
echo "Logs: /tmp/FinderSidebarSync.log"
echo ""
echo "To uninstall: run uninstall.sh"
