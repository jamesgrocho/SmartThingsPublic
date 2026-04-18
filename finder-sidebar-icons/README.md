# FinderSidebarSync

A lightweight macOS background daemon that automatically syncs custom folder icons to their Finder sidebar shortcuts.

## The problem

When you drag a folder into the Finder sidebar, macOS caches a generic icon for it. If you later change the folder's icon (via **Cmd+I → drag a new image onto the icon well**), the sidebar never updates — it stays generic.

## What this does

- Runs silently in the background, starting automatically at login
- Watches every folder pinned in your Finder sidebar Favorites
- The moment you set or change a custom icon (via Get Info), it detects the change and refreshes the sidebar entry so the correct icon appears instantly
- Also detects when you add/remove folders from the sidebar and adjusts what it watches

## How to install

Requirements: macOS 12+, Xcode Command Line Tools (`xcode-select --install`)

```bash
cd finder-sidebar-icons
./install.sh
```

That's it. The daemon starts immediately and will relaunch at every login.

## How to use

1. Pin a folder to the Finder sidebar (drag it to Favorites)
2. Press **Cmd+I** on that folder to open Get Info
3. Click the icon thumbnail in the top-left of the Get Info window
4. Drag any image file on top of it
5. The sidebar icon updates automatically within ~2 seconds

## How to uninstall

```bash
./uninstall.sh
```

## Logs

```bash
tail -f /tmp/FinderSidebarSync.log
```

## How it works

| Component | Role |
|-----------|------|
| `FSEventsWatcher` | Watches the filesystem for xattr changes (`com.apple.FinderInfo`) on sidebar folders — this is the event macOS fires when a custom icon is set |
| `SidebarBridge` (Obj-C) | Uses the `LSSharedFileList` API to remove and re-insert the sidebar entry, which forces Finder to read the folder's current icon |
| LaunchAgent plist | Registers the daemon with launchd so it starts at login and restarts if it crashes |
