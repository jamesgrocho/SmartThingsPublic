document.getElementById("split").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "splitTabs" });
  window.close();
});
