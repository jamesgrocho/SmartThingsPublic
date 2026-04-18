chrome.commands.onCommand.addListener((command) => {
  if (command === "split-tabs") {
    splitTabsIntoWindows();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "splitTabs") {
    splitTabsIntoWindows();
  }
});

async function splitTabsIntoWindows() {
  const currentWindow = await chrome.windows.getCurrent({ populate: true });
  const tabs = currentWindow.tabs;

  if (tabs.length <= 1) return;

  const displays = await chrome.system.display.getInfo();
  const workArea = displays[0].workArea;

  const numWindows = tabs.length;
  const baseWidth = Math.floor(workArea.width / numWindows);

  // Create new windows for each tab after the first, right-to-left so that
  // removing tabs from the original window doesn't shift the remaining indices.
  for (let i = tabs.length - 1; i >= 1; i--) {
    const left = workArea.left + i * baseWidth;
    // Give the last slot any leftover pixels from the floor division.
    const width = i === numWindows - 1
      ? workArea.width - i * baseWidth
      : baseWidth;

    await chrome.windows.create({
      tabId: tabs[i].id,
      left: Math.round(left),
      top: workArea.top,
      width: Math.round(width),
      height: workArea.height,
      focused: false,
      state: "normal"
    });
  }

  // Resize the original window, which now holds only the first tab.
  await chrome.windows.update(currentWindow.id, {
    left: workArea.left,
    top: workArea.top,
    width: Math.round(baseWidth),
    height: workArea.height,
    state: "normal"
  });
}
