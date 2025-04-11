const GOOGLE_ORIGIN = 'https://www.google.com';

// Enable side panel for all URLs
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  
  // Enable the side panel for all sites
  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: true
  });
});

// Handle snapshot requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "takeSnapshot") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      if (!tabs || tabs.length === 0) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      const activeTab = tabs[0];
      chrome.tabs.captureVisibleTab(activeTab.windowId, { format: "png" }, (imgData) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (imgData) {
          sendResponse({ imgData: imgData });
        } else {
          sendResponse({ error: "No image data returned" });
        }
      });
    });
    return true; // Indicates asynchronous response
  }
});