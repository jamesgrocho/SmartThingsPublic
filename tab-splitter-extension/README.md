# Tab Splitter — Chrome Extension

Takes every tab in your current Chrome window and pops each one out into its own window, tiling them left-to-right across your entire display in equal widths.

## Install (unpacked / developer mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select this folder.
4. The Tab Splitter icon appears in your toolbar.

## Usage

| Method | Action |
|---|---|
| Keyboard shortcut | **⌘ Shift S** (Mac) / **Ctrl Shift S** (Windows/Linux) |
| Toolbar popup | Click the extension icon → **Split Tabs into Windows** |

> **Changing the shortcut:** Go to `chrome://extensions/shortcuts` and look for *Tab Splitter → Split all tabs into separate windows*.

## Stream Deck setup

Because Chrome registers the keyboard shortcut globally, Stream Deck just needs to send that key combo:

1. In the Stream Deck app, drag a **Hotkey** action onto a button.
2. Set the hotkey to **⌘ Shift S**.
3. Press the Stream Deck button — Chrome will split the tabs.

That's it. No extra software or plugins required.

## How it works

`background.js` (a Manifest V3 service worker) does the following when the command fires:

1. Fetches all tabs from the current window via `chrome.tabs`.
2. Reads the primary display's work area (excludes the Dock/taskbar) via `chrome.system.display`.
3. Calculates an equal width: `workArea.width / numberOfTabs`.
4. Moves each tab (after the first) into a brand-new `chrome.windows` window at the correct `left` offset.
5. Resizes the original window to occupy the leftmost slot.

## Permissions used

| Permission | Why |
|---|---|
| `tabs` | Read the tab list of the current window |
| `windows` | Create and reposition windows |
| `system.display` | Get the display's work area so windows don't overlap the Dock |
