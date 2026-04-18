#!/bin/bash
set -euo pipefail

PLIST_NAME="com.user.findersidebaricons.plist"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"

echo "==> Unloading LaunchAgent..."
launchctl unload "$LAUNCH_AGENT_DIR/$PLIST_NAME" 2>/dev/null || true

echo "==> Removing LaunchAgent plist..."
rm -f "$LAUNCH_AGENT_DIR/$PLIST_NAME"

echo "==> Removing binary..."
sudo rm -f "/usr/local/bin/FinderSidebarSync"

echo "Done. FinderSidebarSync has been removed."
